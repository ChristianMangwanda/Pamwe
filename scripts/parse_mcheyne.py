#!/usr/bin/env python3
"""Parse M'Cheyne reading plan from pdftotext output into structured JSON.

Extracts the first reading reference for each of 365 days.
"""

import json
import re
import sys

RAW_TEXT = """Jan 1    Gen 1, Matt 1, Ezra 1, Acts 1
Jan 2    Gen 2, Matt 2, Ezra 2, Acts 2
Jan 3    Gen 3, Matt 3, Ezra 3, Acts 3
Jan 4    Gen 4, Matt 4, Ezra 4, Acts 4
Jan 5    Gen 5, Matt 5, Ezra 5, Acts 5
Jan 6    Gen 6, Matt 6, Ezra 6, Acts 6
Jan 7    Gen 7, Matt 7, Ezra 7, Acts 7
Jan 8    Gen 8, Matt 8, Ezra 8, Acts 8
Jan 9    Gen 9-10, Matt 9, Ezra 9, Acts 9
Jan 10   Gen 11, Matt 10, Ezra 10, Acts 10
Jan 11   Gen 12, Matt 11, Neh 1, Acts 11
Jan 12   Gen 13, Matt 12, Neh 2, Acts 12
Jan 13   Gen 14, Matt 13, Neh 3, Acts 13
Jan 14   Gen 15, Matt 14, Neh 4, Acts 14
Jan 15   Gen 16, Matt 15, Neh 5, Acts 15
Jan 16   Gen 17, Matt 16, Neh 6, Acts 16
Jan 17   Gen 18, Matt 17, Neh 7, Acts 17
Jan 18   Gen 19, Matt 18, Neh 8, Acts 18
Jan 19   Gen 20, Matt 19, Neh 9, Acts 19
Jan 20   Gen 21, Matt 20, Neh 10, Acts 20
Jan 21   Gen 22, Matt 21, Neh 11, Acts 21
Jan 22   Gen 23, Matt 22, Neh 12, Acts 22
Jan 23   Gen 24, Matt 23, Neh 13, Acts 23
Jan 24   Gen 25, Matt 24, Est 1, Acts 24
Jan 25   Gen 26, Matt 25, Est 2, Acts 25
Jan 26   Gen 27, Matt 26, Est 3, Acts 26
Jan 27   Gen 28, Matt 27, Est 4, Acts 27
Jan 28   Gen 29, Matt 28, Est 5, Acts 28
Jan 29   Gen 30, Mark 1, Est 6, Rom 1
Jan 30   Gen 31, Mark 2, Est 7, Rom 2
Jan 31   Gen 32, Mark 3, Est 8, Rom 3
Feb 1    Gen 33, Mark 4, Est 9-10, Rom 4
Feb 2    Gen 34, Mark 5, Job 1, Rom 5
Feb 3    Gen 35-36, Mark 6, Job 2, Rom 6
Feb 4    Gen 37, Mark 7, Job 3, Rom 7
Feb 5    Gen 38, Mark 8, Job 4, Rom 8
Feb 6    Gen 39, Mark 9, Job 5, Rom 9
Feb 7    Gen 40, Mark 10, Job 6, Rom 10
Feb 8    Gen 41, Mark 11, Job 7, Rom 11
Feb 9    Gen 42, Mark 12, Job 8, Rom 12
Feb 10   Gen 43, Mark 13, Job 9, Rom 13
Feb 11   Gen 44, Mark 14, Job 10, Rom 14
Feb 12   Gen 45, Mark 15, Job 11, Rom 15
Feb 13   Gen 46, Mark 16, Job 12, Rom 16
Feb 14   Gen 47, Luke 1:1-38, Job 13, 1 Cor 1
Feb 15   Gen 48, Luke 1:39-80, Job 14, 1 Cor 2
Feb 16   Gen 49, Luke 2, Job 15, 1 Cor 3
Feb 17   Gen 50, Luke 3, Job 16-17, 1 Cor 4
Feb 18   Ex 1, Luke 4, Job 18, 1 Cor 5
Feb 19   Ex 2, Luke 5, Job 19, 1 Cor 6
Feb 20   Ex 3, Luke 6, Job 20, 1 Cor 7
Feb 21   Ex 4, Luke 7, Job 21, 1 Cor 8
Feb 22   Ex 5, Luke 8, Job 22, 1 Cor 9
Feb 23   Ex 6, Luke 9, Job 23, 1 Cor 10
Feb 24   Ex 7, Luke 10, Job 24, 1 Cor 11
Feb 25   Ex 8, Luke 11, Job 25-26, 1 Cor 12
Feb 26   Ex 9, Luke 12, Job 27, 1 Cor 13
Feb 27   Ex 10, Luke 13, Job 28, 1 Cor 14
Feb 28   Ex 11, Luke 14, Job 29, 1 Cor 15
Mar 1    Ex 12, Luke 15, Job 30, 1 Cor 16
Mar 2    Ex 13, Luke 16, Job 31, 2 Cor 1
Mar 3    Ex 14, Luke 17, Job 32, 2 Cor 2
Mar 4    Ex 15, Luke 18, Job 33, 2 Cor 3
Mar 5    Ex 16, Luke 19, Job 34, 2 Cor 4
Mar 6    Ex 17, Luke 20, Job 35, 2 Cor 5
Mar 7    Ex 18, Luke 21, Job 36, 2 Cor 6
Mar 8    Ex 19, Luke 22, Job 37, 2 Cor 7
Mar 9    Ex 20, Luke 23, Job 38, 2 Cor 8
Mar 10   Ex 21, Luke 24, Job 39, 2 Cor 9
Mar 11   Ex 22, John 1, Job 40, 2 Cor 10
Mar 12   Ex 23, John 2, Job 41, 2 Cor 11
Mar 13   Ex 24, John 3, Job 42, 2 Cor 12
Mar 14   Ex 25, John 4, Prov 1, 2 Cor 13
Mar 15   Ex 26, John 5, Prov 2, Gal 1
Mar 16   Ex 27, John 6, Prov 3, Gal 2
Mar 17   Ex 28, John 7, Prov 4, Gal 3
Mar 18   Ex 29, John 8, Prov 5, Gal 4
Mar 19   Ex 30, John 9, Prov 6, Gal 5
Mar 20   Ex 31, John 10, Prov 7, Gal 6
Mar 21   Ex 32, John 11, Prov 8, Eph 1
Mar 22   Ex 33, John 12, Prov 9, Eph 2
Mar 23   Ex 34, John 13, Prov 10, Eph 3
Mar 24   Ex 35, John 14, Prov 11, Eph 4
Mar 25   Ex 36, John 15, Prov 12, Eph 5
Mar 26   Ex 37, John 16, Prov 13, Eph 6
Mar 27   Ex 38, John 17, Prov 14, Phil 1
Mar 28   Ex 39, John 18, Prov 15, Phil 2
Mar 29   Ex 40, John 19, Prov 16, Phil 3
Mar 30   Lev 1, John 20, Prov 17, Phil 4
Mar 31   Lev 2-3, John 21, Prov 18, Col 1
Apr 1    Lev 4, Ps 1-2, Prov 19, Col 2
Apr 2    Lev 5, Ps 3-4, Prov 20, Col 3
Apr 3    Lev 6, Ps 5-6, Prov 21, Col 4
Apr 4    Lev 7, Ps 7-8, Prov 22, 1 Thes 1
Apr 5    Lev 8, Ps 9, Prov 23, 1 Thes 2
Apr 6    Lev 9, Ps 10, Prov 24, 1 Thes 3
Apr 7    Lev 10, Ps 11-12, Prov 25, 1 Thes 4
Apr 8    Lev 11-12, Ps 13-14, Prov 26, 1 Thes 5
Apr 9    Lev 13, Ps 15-16, Prov 27, 2 Thes 1
Apr 10   Lev 14, Ps 17, Prov 28, 2 Thes 2
Apr 11   Lev 15, Ps 18, Prov 29, 2 Thes 3
Apr 12   Lev 16, Ps 19, Prov 30, 1 Tim 1
Apr 13   Lev 17, Ps 20-21, Prov 31, 1 Tim 2
Apr 14   Lev 18, Ps 22, Eccl 1, 1 Tim 3
Apr 15   Lev 19, Ps 23-24, Eccl 2, 1 Tim 4
Apr 16   Lev 20, Ps 25, Eccl 3, 1 Tim 5
Apr 17   Lev 21, Ps 26-27, Eccl 4, 1 Tim 6
Apr 18   Lev 22, Ps 28-29, Eccl 5, 2 Tim 1
Apr 19   Lev 23, Ps 30, Eccl 6, 2 Tim 2
Apr 20   Lev 24, Ps 31, Eccl 7, 2 Tim 3
Apr 21   Lev 25, Ps 32, Eccl 8, 2 Tim 4
Apr 22   Lev 26, Ps 33, Eccl 9, Titus 1
Apr 23   Lev 27, Ps 34, Eccl 10, Titus 2
Apr 24   Num 1, Ps 35, Eccl 11, Titus 3
Apr 25   Num 2, Ps 36, Eccl 12, Phm 1
Apr 26   Num 3, Ps 37, Sng 1, Heb 1
Apr 27   Num 4, Ps 38, Sng 2, Heb 2
Apr 28   Num 5, Ps 39, Sng 3, Heb 3
Apr 29   Num 6, Ps 40-41, Sng 4, Heb 4
Apr 30   Num 7, Ps 42-43, Sng 5, Heb 5
May 1    Num 8, Ps 44, Sng 6, Heb 6
May 2    Num 9, Ps 45, Sng 7, Heb 7
May 3    Num 10, Ps 46-47, Sng 8, Heb 8
May 4    Num 11, Ps 48, Isa 1, Heb 9
May 5    Num 12-13, Ps 49, Isa 2, Heb 10
May 6    Num 14, Ps 50, Isa 3-4, Heb 11
May 7    Num 15, Ps 51, Isa 5, Heb 12
May 8    Num 16, Ps 52-54, Isa 6, Heb 13
May 9    Num 17-18, Ps 55, Isa 7, Jas 1
May 10   Num 19, Ps 56-57, Isa 8, Jas 2
May 11   Num 20, Ps 58-59, Isa 9, Jas 3
May 12   Num 21, Ps 60-61, Isa 10, Jas 4
May 13   Num 22, Ps 62-63, Isa 11-12, Jas 5
May 14   Num 23, Ps 64-65, Isa 13, 1 Pet 1
May 15   Num 24, Ps 66-67, Isa 14, 1 Pet 2
May 16   Num 25, Ps 68, Isa 15, 1 Pet 3
May 17   Num 26, Ps 69, Isa 16, 1 Pet 4
May 18   Num 27, Ps 70-71, Isa 17-18, 1 Pet 5
May 19   Num 28, Ps 72, Isa 19-20, 2 Pet 1
May 20   Num 29, Ps 73, Isa 21, 2 Pet 2
May 21   Num 30, Ps 74, Isa 22, 2 Pet 3
May 22   Num 31, Ps 75-76, Isa 23, 1 Jn 1
May 23   Num 32, Ps 77, Isa 24, 1 Jn 2
May 24   Num 33, Ps 78:1-39, Isa 25, 1 Jn 3
May 25   Num 34, Ps 78:40-72, Isa 26, 1 Jn 4
May 26   Num 35, Ps 79, Isa 27, 1 Jn 5
May 27   Num 36, Ps 80, Isa 28, 2 Jn 1
May 28   Deut 1, Ps 81-82, Isa 29, 3 Jn 1
May 29   Deut 2, Ps 83-84, Isa 30, Jude 1
May 30   Deut 3, Ps 85, Isa 31, Rev 1
May 31   Deut 4, Ps 86-87, Isa 32, Rev 2
Jun 1    Deut 5, Ps 88, Isa 33, Rev 3
Jun 2    Deut 6, Ps 89, Isa 34, Rev 4
Jun 3    Deut 7, Ps 90, Isa 35, Rev 5
Jun 4    Deut 8, Ps 91, Isa 36, Rev 6
Jun 5    Deut 9, Ps 92-93, Isa 37, Rev 7
Jun 6    Deut 10, Ps 94, Isa 38, Rev 8
Jun 7    Deut 11, Ps 95-96, Isa 39, Rev 9
Jun 8    Deut 12, Ps 97-98, Isa 40, Rev 10
Jun 9    Deut 13-14, Ps 99-101, Isa 41, Rev 11
Jun 10   Deut 15, Ps 102, Isa 42, Rev 12
Jun 11   Deut 16, Ps 103, Isa 43, Rev 13
Jun 12   Deut 17, Ps 104, Isa 44, Rev 14
Jun 13   Deut 18, Ps 105, Isa 45, Rev 15
Jun 14   Deut 19, Ps 106, Isa 46, Rev 16
Jun 15   Deut 20, Ps 107, Isa 47, Rev 17
Jun 16   Deut 21, Ps 108-109, Isa 48, Rev 18
Jun 17   Deut 22, Ps 110-111, Isa 49, Rev 19
Jun 18   Deut 23, Ps 112-113, Isa 50, Rev 20
Jun 19   Deut 24, Ps 114-115, Isa 51, Rev 21
Jun 20   Deut 25, Ps 116, Isa 52, Rev 22
Jun 21   Deut 26, Ps 117-118, Isa 53, Matt 1
Jun 22   Deut 27, Ps 119:1-24, Isa 54, Matt 2
Jun 23   Deut 28, Ps 119:25-48, Isa 55, Matt 3
Jun 24   Deut 29, Ps 119:49-72, Isa 56, Matt 4
Jun 25   Deut 30, Ps 119:73-96, Isa 57, Matt 5
Jun 26   Deut 31, Ps 119:97-120, Isa 58, Matt 6
Jun 27   Deut 32, Ps 119:121-144, Isa 59, Matt 7
Jun 28   Deut 33-34, Ps 119:145-176, Isa 60, Matt 8
Jun 29   Josh 1, Ps 120-122, Isa 61, Matt 9
Jun 30   Josh 2, Ps 123-125, Isa 62, Matt 10
Jul 1    Josh 3, Ps 126-128, Isa 63, Matt 11
Jul 2    Josh 4, Ps 129-131, Isa 64, Matt 12
Jul 3    Josh 5, Ps 132-134, Isa 65, Matt 13
Jul 4    Josh 6, Ps 135-136, Isa 66, Matt 14
Jul 5    Josh 7, Ps 137-138, Jer 1, Matt 15
Jul 6    Josh 8, Ps 139, Jer 2, Matt 16
Jul 7    Josh 9, Ps 140-141, Jer 3, Matt 17
Jul 8    Josh 10, Ps 142-143, Jer 4, Matt 18
Jul 9    Josh 11, Ps 144, Jer 5, Matt 19
Jul 10   Josh 12-13, Ps 145, Jer 6, Matt 20
Jul 11   Josh 14-15, Ps 146-147, Jer 7, Matt 21
Jul 12   Josh 16-17, Ps 148, Jer 8, Matt 22
Jul 13   Josh 18-19, Ps 149-150, Jer 9, Matt 23
Jul 14   Josh 20-21, Acts 1, Jer 10, Matt 24
Jul 15   Josh 22, Acts 2, Jer 11, Matt 25
Jul 16   Josh 23, Acts 3, Jer 12, Matt 26
Jul 17   Josh 24, Acts 4, Jer 13, Matt 27
Jul 18   Judg 1, Acts 5, Jer 14, Matt 28
Jul 19   Judg 2, Acts 6, Jer 15, Mark 1
Jul 20   Judg 3, Acts 7, Jer 16, Mark 2
Jul 21   Judg 4, Acts 8, Jer 17, Mark 3
Jul 22   Judg 5, Acts 9, Jer 18, Mark 4
Jul 23   Judg 6, Acts 10, Jer 19, Mark 5
Jul 24   Judg 7, Acts 11, Jer 20, Mark 6
Jul 25   Judg 8, Acts 12, Jer 21, Mark 7
Jul 26   Judg 9, Acts 13, Jer 22, Mark 8
Jul 27   Judg 10, Acts 14, Jer 23, Mark 9
Jul 28   Judg 11, Acts 15, Jer 24, Mark 10
Jul 29   Judg 12, Acts 16, Jer 25, Mark 11
Jul 30   Judg 13, Acts 17, Jer 26, Mark 12
Jul 31   Judg 14, Acts 18, Jer 27, Mark 13
Aug 1    Judg 15, Acts 19, Jer 28, Mark 14
Aug 2    Judg 16, Acts 20, Jer 29, Mark 15
Aug 3    Judg 17, Acts 21, Jer 30-31, Mark 16
Aug 4    Judg 18, Acts 22, Jer 32, Luke 1
Aug 5    Judg 19, Acts 23, Jer 33, Luke 2
Aug 6    Judg 20, Acts 24, Jer 34, Luke 3
Aug 7    Judg 21, Acts 25, Jer 35, Luke 4
Aug 8    Ruth 1, Acts 26, Jer 36, Luke 5
Aug 9    Ruth 2, Acts 27, Jer 37, Luke 6
Aug 10   Ruth 3-4, Acts 28, Jer 38, Luke 7
Aug 11   1 Sam 1, Rom 1, Jer 39, Luke 8
Aug 12   1 Sam 2, Rom 2, Jer 40, Luke 9
Aug 13   1 Sam 3, Rom 3, Jer 41, Luke 10
Aug 14   1 Sam 4, Rom 4, Jer 42, Luke 11
Aug 15   1 Sam 5-6, Rom 5, Jer 43, Luke 12
Aug 16   1 Sam 7-8, Rom 6, Jer 44-45, Luke 13
Aug 17   1 Sam 9, Rom 7, Jer 46, Luke 14
Aug 18   1 Sam 10, Rom 8, Jer 47, Luke 15
Aug 19   1 Sam 11, Rom 9, Jer 48, Luke 16
Aug 20   1 Sam 12, Rom 10, Jer 49, Luke 17
Aug 21   1 Sam 13, Rom 11, Jer 50, Luke 18
Aug 22   1 Sam 14, Rom 12, Jer 51, Luke 19
Aug 23   1 Sam 15, Rom 13, Jer 52, Luke 20
Aug 24   1 Sam 16, Rom 14, Lam 1, Luke 21
Aug 25   1 Sam 17, Rom 15, Lam 2, Luke 22
Aug 26   1 Sam 18, Rom 16, Lam 3, Luke 23
Aug 27   1 Sam 19, 1 Cor 1, Lam 4, Luke 24
Aug 28   1 Sam 20, 1 Cor 2, Lam 5, John 1
Aug 29   1 Sam 21-22, 1 Cor 3, Ezek 1, John 2
Aug 30   1 Sam 23, 1 Cor 4, Ezek 2, John 3
Aug 31   1 Sam 24, 1 Cor 5, Ezek 3, John 4
Sep 1    1 Sam 25, 1 Cor 6, Ezek 4, John 5
Sep 2    1 Sam 26, 1 Cor 7, Ezek 5, John 6
Sep 3    1 Sam 27, 1 Cor 8, Ezek 6, John 7
Sep 4    1 Sam 28, 1 Cor 9, Ezek 7, John 8
Sep 5    1 Sam 29-30, 1 Cor 10, Ezek 8, John 9
Sep 6    1 Sam 31, 1 Cor 11, Ezek 9, John 10
Sep 7    2 Sam 1, 1 Cor 12, Ezek 10, John 11
Sep 8    2 Sam 2, 1 Cor 13, Ezek 11, John 12
Sep 9    2 Sam 3, 1 Cor 14, Ezek 12, John 13
Sep 10   2 Sam 4-5, 1 Cor 15, Ezek 13, John 14
Sep 11   2 Sam 6, 1 Cor 16, Ezek 14, John 15
Sep 12   2 Sam 7, 2 Cor 1, Ezek 15, John 16
Sep 13   2 Sam 8-9, 2 Cor 2, Ezek 16, John 17
Sep 14   2 Sam 10, 2 Cor 3, Ezek 17, John 18
Sep 15   2 Sam 11, 2 Cor 4, Ezek 18, John 19
Sep 16   2 Sam 12, 2 Cor 5, Ezek 19, John 20
Sep 17   2 Sam 13, 2 Cor 6, Ezek 20, John 21
Sep 18   2 Sam 14, 2 Cor 7, Ezek 21, Ps 1-2
Sep 19   2 Sam 15, 2 Cor 8, Ezek 22, Ps 3-4
Sep 20   2 Sam 16, 2 Cor 9, Ezek 23, Ps 5-6
Sep 21   2 Sam 17, 2 Cor 10, Ezek 24, Ps 7-8
Sep 22   2 Sam 18, 2 Cor 11, Ezek 25, Ps 9
Sep 23   2 Sam 19, 2 Cor 12, Ezek 26, Ps 10
Sep 24   2 Sam 20, 2 Cor 13, Ezek 27, Ps 11-12
Sep 25   2 Sam 21, Gal 1, Ezek 28, Ps 13-14
Sep 26   2 Sam 22, Gal 2, Ezek 29, Ps 15-16
Sep 27   2 Sam 23, Gal 3, Ezek 30, Ps 17
Sep 28   2 Sam 24, Gal 4, Ezek 31, Ps 18
Sep 29   1 Kgs 1, Gal 5, Ezek 32, Ps 19
Sep 30   1 Kgs 2, Gal 6, Ezek 33, Ps 20-21
Oct 1    1 Kgs 3, Eph 1, Ezek 34, Ps 22
Oct 2    1 Kgs 4-5, Eph 2, Ezek 35, Ps 23-24
Oct 3    1 Kgs 6, Eph 3, Ezek 36, Ps 25
Oct 4    1 Kgs 7, Eph 4, Ezek 37, Ps 26-27
Oct 5    1 Kgs 8, Eph 5, Ezek 38, Ps 28-29
Oct 6    1 Kgs 9, Eph 6, Ezek 39, Ps 30
Oct 7    1 Kgs 10, Phil 1, Ezek 40, Ps 31
Oct 8    1 Kgs 11, Phil 2, Ezek 41, Ps 32
Oct 9    1 Kgs 12, Phil 3, Ezek 42, Ps 33
Oct 10   1 Kgs 13, Phil 4, Ezek 43, Ps 34
Oct 11   1 Kgs 14, Col 1, Ezek 44, Ps 35
Oct 12   1 Kgs 15, Col 2, Ezek 45, Ps 36
Oct 13   1 Kgs 16, Col 3, Ezek 46, Ps 37
Oct 14   1 Kgs 17, Col 4, Ezek 47, Ps 38
Oct 15   1 Kgs 18, 1 Thes 1, Ezek 48, Ps 39
Oct 16   1 Kgs 19, 1 Thes 2, Dan 1, Ps 40-41
Oct 17   1 Kgs 20, 1 Thes 3, Dan 2, Ps 42-43
Oct 18   1 Kgs 21, 1 Thes 4, Dan 3, Ps 44
Oct 19   1 Kgs 22, 1 Thes 5, Dan 4, Ps 45
Oct 20   2 Kgs 1, 2 Thes 1, Dan 5, Ps 46-47
Oct 21   2 Kgs 2, 2 Thes 2, Dan 6, Ps 48
Oct 22   2 Kgs 3, 2 Thes 3, Dan 7, Ps 49
Oct 23   2 Kgs 4, 1 Tim 1, Dan 8, Ps 50
Oct 24   2 Kgs 5, 1 Tim 2, Dan 9, Ps 51
Oct 25   2 Kgs 6, 1 Tim 3, Dan 10, Ps 52-54
Oct 26   2 Kgs 7, 1 Tim 4, Dan 11, Ps 55
Oct 27   2 Kgs 8, 1 Tim 5, Dan 12, Ps 56-57
Oct 28   2 Kgs 9, 1 Tim 6, Hos 1, Ps 58-59
Oct 29   2 Kgs 10-11, 2 Tim 1, Hos 2, Ps 60-61
Oct 30   2 Kgs 12, 2 Tim 2, Hos 3-4, Ps 62-63
Oct 31   2 Kgs 13, 2 Tim 3, Hos 5-6, Ps 64-65
Nov 1    2 Kgs 14, 2 Tim 4, Hos 7, Ps 66-67
Nov 2    2 Kgs 15, Titus 1, Hos 8, Ps 68
Nov 3    2 Kgs 16, Titus 2, Hos 9, Ps 69
Nov 4    2 Kgs 17, Titus 3, Hos 10, Ps 70-71
Nov 5    2 Kgs 18, Phm 1, Hos 11, Ps 72
Nov 6    2 Kgs 19, Heb 1, Hos 12, Ps 73
Nov 7    2 Kgs 20, Heb 2, Hos 13, Ps 74
Nov 8    2 Kgs 21, Heb 3, Hos 14, Ps 75-76
Nov 9    2 Kgs 22, Heb 4, Joel 1, Ps 77
Nov 10   2 Kgs 23, Heb 5, Joel 2, Ps 78
Nov 11   2 Kgs 24, Heb 6, Joel 3, Ps 79
Nov 12   2 Kgs 25, Heb 7, Amos 1, Ps 80
Nov 13   1 Chr 1-2, Heb 8, Amos 2, Ps 81-82
Nov 14   1 Chr 3-4, Heb 9, Amos 3, Ps 83-84
Nov 15   1 Chr 5-6, Heb 10, Amos 4, Ps 85
Nov 16   1 Chr 7-8, Heb 11, Amos 5, Ps 86
Nov 17   1 Chr 9-10, Heb 12, Amos 6, Ps 87-88
Nov 18   1 Chr 11-12, Heb 13, Amos 7, Ps 89
Nov 19   1 Chr 13-14, Jas 1, Amos 8, Ps 90
Nov 20   1 Chr 15, Jas 2, Amos 9, Ps 91
Nov 21   1 Chr 16, Jas 3, Obad 1, Ps 92-93
Nov 22   1 Chr 17, Jas 4, Jonah 1, Ps 94
Nov 23   1 Chr 18, Jas 5, Jonah 2, Ps 95-96
Nov 24   1 Chr 19-20, 1 Pet 1, Jonah 3, Ps 97-98
Nov 25   1 Chr 21, 1 Pet 2, Jonah 4, Ps 99-101
Nov 26   1 Chr 22, 1 Pet 3, Mic 1, Ps 102
Nov 27   1 Chr 23, 1 Pet 4, Mic 2, Ps 103
Nov 28   1 Chr 24-25, 1 Pet 5, Mic 3, Ps 104
Nov 29   1 Chr 26-27, 2 Pet 1, Mic 4, Ps 105
Nov 30   1 Chr 28, 2 Pet 2, Mic 5, Ps 106
Dec 1    1 Chr 29, 2 Pet 3, Mic 6, Ps 107
Dec 2    2 Chr 1, 1 Jn 1, Mic 7, Ps 108-109
Dec 3    2 Chr 2, 1 Jn 2, Nahum 1, Ps 110-111
Dec 4    2 Chr 3-4, 1 Jn 3, Nahum 2, Ps 112-113
Dec 5    2 Chr 5, 1 Jn 4, Nahum 3, Ps 114-115
Dec 6    2 Chr 6, 1 Jn 5, Hab 1, Ps 116
Dec 7    2 Chr 7, 2 Jn 1, Hab 2, Ps 117-118
Dec 8    2 Chr 8, 3 Jn 1, Hab 3, Ps 119:1-24
Dec 9    2 Chr 9, Jude 1, Zeph 1, Ps 119:25-48
Dec 10   2 Chr 10, Rev 1, Zeph 2, Ps 119:49-72
Dec 11   2 Chr 11-12, Rev 2, Zeph 3, Ps 119:73-96
Dec 12   2 Chr 13, Rev 3, Hag 1, Ps 119:97-120
Dec 13   2 Chr 14-15, Rev 4, Hag 2, Ps 119:121-144
Dec 14   2 Chr 16, Rev 5, Zech 1, Ps 119:145-176
Dec 15   2 Chr 17, Rev 6, Zech 2, Ps 120-122
Dec 16   2 Chr 18, Rev 7, Zech 3, Ps 123-125
Dec 17   2 Chr 19-20, Rev 8, Zech 4, Ps 126-128
Dec 18   2 Chr 21, Rev 9, Zech 5, Ps 129-131
Dec 19   2 Chr 22-23, Rev 10, Zech 6, Ps 132-134
Dec 20   2 Chr 24, Rev 11, Zech 7, Ps 135-136
Dec 21   2 Chr 25, Rev 12, Zech 8, Ps 137-138
Dec 22   2 Chr 26, Rev 13, Zech 9, Ps 139
Dec 23   2 Chr 27-28, Rev 14, Zech 10, Ps 140-141
Dec 24   2 Chr 29, Rev 15, Zech 11, Ps 142
Dec 25   2 Chr 30, Rev 16, Zech 12, Ps 143
Dec 26   2 Chr 31, Rev 17, Zech 13, Ps 144
Dec 27   2 Chr 32, Rev 18, Zech 14, Ps 145
Dec 28   2 Chr 33, Rev 19, Mal 1, Ps 146-147
Dec 29   2 Chr 34, Rev 20, Mal 2, Ps 148
Dec 30   2 Chr 35, Rev 21, Mal 3, Ps 149
Dec 31   2 Chr 36, Rev 22, Mal 4, Ps 150"""

MONTH_MAP = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

BOOK_FULL_NAMES = {
    "Gen": "Genesis", "Ex": "Exodus", "Lev": "Leviticus", "Num": "Numbers",
    "Deut": "Deuteronomy", "Josh": "Joshua", "Judg": "Judges", "Ruth": "Ruth",
    "1 Sam": "1 Samuel", "2 Sam": "2 Samuel", "1 Kgs": "1 Kings", "2 Kgs": "2 Kings",
    "1 Chr": "1 Chronicles", "2 Chr": "2 Chronicles", "Ezra": "Ezra", "Neh": "Nehemiah",
    "Est": "Esther", "Job": "Job", "Ps": "Psalms", "Prov": "Proverbs",
    "Eccl": "Ecclesiastes", "Sng": "Song of Solomon", "Isa": "Isaiah", "Jer": "Jeremiah",
    "Lam": "Lamentations", "Ezek": "Ezekiel", "Dan": "Daniel", "Hos": "Hosea",
    "Joel": "Joel", "Amos": "Amos", "Obad": "Obadiah", "Jonah": "Jonah",
    "Mic": "Micah", "Nahum": "Nahum", "Hab": "Habakkuk", "Zeph": "Zephaniah",
    "Hag": "Haggai", "Zech": "Zechariah", "Mal": "Malachi",
    "Matt": "Matthew", "Mark": "Mark", "Luke": "Luke", "John": "John",
    "Acts": "Acts", "Rom": "Romans", "1 Cor": "1 Corinthians", "2 Cor": "2 Corinthians",
    "Gal": "Galatians", "Eph": "Ephesians", "Phil": "Philippians", "Col": "Colossians",
    "1 Thes": "1 Thessalonians", "2 Thes": "2 Thessalonians",
    "1 Tim": "1 Timothy", "2 Tim": "2 Timothy", "Titus": "Titus", "Phm": "Philemon",
    "Heb": "Hebrews", "Jas": "James", "1 Pet": "1 Peter", "2 Pet": "2 Peter",
    "1 Jn": "1 John", "2 Jn": "2 John", "3 Jn": "3 John", "Jude": "Jude",
    "Rev": "Revelation",
}

def expand_reference(ref: str) -> str:
    """Expand abbreviated reference to full book name."""
    ref = ref.strip()
    for abbr in sorted(BOOK_FULL_NAMES.keys(), key=len, reverse=True):
        if ref.startswith(abbr + " ") or ref == abbr:
            return ref.replace(abbr, BOOK_FULL_NAMES[abbr], 1)
    return ref

def format_for_api(ref: str) -> str:
    """Convert reference to bible-api.com format. E.g. 'Genesis 1' -> 'genesis+1'"""
    ref = ref.strip()
    # Handle ranges like "Genesis 9-10" -> need to query both chapters
    # Handle verse ranges like "Luke 1:1-38"
    # Replace spaces with +, lowercase
    return ref.lower().replace(" ", "+").replace(":", "+")

def parse_line(line: str):
    """Parse a single line like 'Jan 1    Gen 1, Matt 1, Ezra 1, Acts 1'"""
    line = line.strip()
    if not line:
        return None

    # Match: Month Day   readings
    m = re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)\s+(.+)$', line)
    if not m:
        return None

    month_str = m.group(1)
    day = int(m.group(2))
    readings_str = m.group(3)

    # Split readings by comma, but be careful with books like "1 Cor"
    # The readings are: reading1, reading2, reading3, reading4
    readings = [r.strip() for r in readings_str.split(", ")]

    # First reading is the one we want
    first_reading = readings[0] if readings else None

    return {
        "month": MONTH_MAP[month_str],
        "day": day,
        "month_name": month_str,
        "all_readings": readings,
        "first_reading": first_reading,
        "first_reading_full": expand_reference(first_reading) if first_reading else None,
    }


def main():
    days = []
    day_number = 0

    for line in RAW_TEXT.strip().split("\n"):
        parsed = parse_line(line)
        if parsed:
            day_number += 1
            parsed["day_number"] = day_number
            days.append(parsed)

    print(f"Parsed {len(days)} days", file=sys.stderr)

    # Output JSON
    output = []
    for d in days:
        output.append({
            "day_number": d["day_number"],
            "month": d["month"],
            "month_day": d["day"],
            "passage_reference": d["first_reading_full"],
            "passage_abbrev": d["first_reading"],
            "all_readings": [expand_reference(r) for r in d["all_readings"]],
        })

    with open("scripts/mcheyne_plan.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(output)} days to scripts/mcheyne_plan.json", file=sys.stderr)

    # Also output the unique first readings for fetching
    unique_refs = []
    for d in output:
        ref = d["passage_reference"]
        if ref not in unique_refs:
            unique_refs.append(ref)

    print(f"\nUnique first-column references: {len(unique_refs)}", file=sys.stderr)


if __name__ == "__main__":
    main()

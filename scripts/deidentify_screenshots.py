#!/usr/bin/env python3
"""De-identify Pamwe App Store screenshots.

Replaces the real couple (Chris Mangwanda / Ammy waChris) with a fictional
"Caleb & Abby" (same C/A initials so the untouched avatars stay truthful), and
swaps the real journal excerpts on the Reflections screen for written-for-
display copy. Screens are 3x (1320x2868), so pt sizes from the RN styles are
multiplied by 3. Old text rows are auto-detected inside a search box, covered
with the region's background color, and replacements drawn with the app's own
bundled fonts.
"""
from PIL import Image, ImageDraw, ImageFont
from collections import Counter
import shutil, os, sys

SRC = "/Users/christianmangwanda/Desktop/Pamwe/Screenshots"
OUT = os.path.join(SRC, "appstore")
FONTS = "/Users/christianmangwanda/Desktop/Pamwe/node_modules/@expo-google-fonts"

def font(path, px):
    return ImageFont.truetype(os.path.join(FONTS, path), px)

SANS = lambda px: font("instrument-sans/400Regular/InstrumentSans_400Regular.ttf", px)
SANS_MED = lambda px: font("instrument-sans/500Medium/InstrumentSans_500Medium.ttf", px)
SANS_SB = lambda px: font("instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf", px)
SERIF = lambda px: font("fraunces/400Regular/Fraunces_400Regular.ttf", px)
SERIF_IT = lambda px: font("fraunces/400Regular_Italic/Fraunces_400Regular_Italic.ttf", px)
SERIF_LIGHT = lambda px: font("fraunces/300Light/Fraunces_300Light.ttf", px)

def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]

def find_lines(img, box, dark_text=True, thresh=175, min_gap=6):
    """Row clusters of ink inside box -> list of (top, bottom, left, right)."""
    x0, y0, x1, y1 = box
    px = img.load()
    rows = []
    for y in range(y0, y1):
        hit = False
        for x in range(x0, x1):
            l = lum(px[x, y])
            if (dark_text and l < thresh) or (not dark_text and l > thresh):
                hit = True
                break
        rows.append(hit)
    clusters = []
    start = None
    gap = 0
    for i, hit in enumerate(rows):
        if hit:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap > min_gap:
                clusters.append((start, i - gap))
                start = None
    if start is not None:
        clusters.append((start, len(rows) - 1))
    out = []
    for (a, b) in clusters:
        left, right = x1, x0
        for y in range(y0 + a, y0 + b + 1):
            for x in range(x0, x1):
                l = lum(px[x, y])
                if (dark_text and l < thresh) or (not dark_text and l > thresh):
                    left = min(left, x)
                    right = max(right, x)
        out.append((y0 + a, y0 + b, left, right))
    return out

def bg_color(img, box):
    """Most common color in box = flat card background."""
    region = img.crop(box)
    return Counter(region.getdata()).most_common(1)[0][0]

def ink_color(img, box, dark_text=True):
    """Extreme pixel in box ~ the text color on a flat background."""
    region = img.crop(box)
    best, best_l = None, 1e9 if dark_text else -1
    for p in region.getdata():
        l = lum(p)
        if (dark_text and l < best_l) or (not dark_text and l > best_l):
            best, best_l = p, l
    return best

def draw_text(draw, x, y_top, text, fnt, fill, tracking=0.0, center_x=None):
    """Draw so the ink's top-left lands at (x, y_top). center_x centers instead."""
    if tracking:
        widths = [draw.textlength(c, font=fnt) for c in text]
        total = sum(widths) + tracking * (len(text) - 1)
    else:
        total = draw.textlength(text, font=fnt)
    if center_x is not None:
        x = center_x - total / 2
    bbox = draw.textbbox((0, 0), text, font=fnt)
    dy = bbox[1]
    dx = draw.textbbox((0, 0), text[0], font=fnt)[0] if text else 0
    if tracking:
        cx = x - dx
        for c, w in zip(text, widths):
            draw.text((cx, y_top - dy), c, font=fnt, fill=fill)
            cx += w + tracking
    else:
        draw.text((x - dx, y_top - dy), text, font=fnt, fill=fill)

def wrap(draw, text, fnt, width):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= width:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def patch(img, box, new_text, fnt, dark_text=True, center_x=None, pad=8,
          wrap_width=None, fill=None, tracking=0.0, align_left=None):
    """Replace the text found in box with new_text (str or list of lines)."""
    d = ImageDraw.Draw(img)
    lines_old = find_lines(img, box, dark_text)
    if not lines_old:
        raise SystemExit(f"no text found in {box}")
    bg = bg_color(img, box)
    if fill is None:
        t0 = lines_old[0]
        fill = ink_color(img, (t0[2], t0[0], t0[3] + 1, t0[1] + 1), dark_text)
    union_l = min(l for _, _, l, _ in lines_old)
    union_r = max(r for _, _, _, r in lines_old)
    union_t = min(t for t, _, _, _ in lines_old)
    union_b = max(b for _, b, _, _ in lines_old)
    d.rectangle((union_l - pad, union_t - pad, union_r + pad, union_b + pad), fill=bg)
    if isinstance(new_text, str):
        new_lines = wrap(d, new_text, fnt, wrap_width) if wrap_width else [new_text]
    else:
        new_lines = new_text
    x_left = align_left if align_left is not None else union_l
    n = min(len(new_lines), len(lines_old))
    for i in range(n):
        draw_text(d, x_left, lines_old[i][0], new_lines[i], fnt, fill,
                  tracking=tracking, center_x=center_x)
    if len(new_lines) > len(lines_old):
        print(f"  WARNING: {len(new_lines)} lines don't fit {len(lines_old)} slots: {new_lines}")
    print(f"  lines found: {[(t, b, l, r) for t, b, l, r in lines_old]} bg={bg} fill={fill}")
    return lines_old

os.makedirs(OUT, exist_ok=True)

CLEAN = ["IMG_2982", "IMG_2983", "IMG_2984", "IMG_2985", "IMG_2986",
         "IMG_2990", "IMG_2991", "IMG_2992", "IMG_2993"]
for name in CLEAN:
    shutil.copyfile(f"{SRC}/{name}.PNG", f"{OUT}/{name}.PNG")
print(f"copied {len(CLEAN)} clean shots")

# ---- IMG_2981 · Today: partner label "Ammy wa..." -> "Abby" (centered under avatar)
print("IMG_2981")
img = Image.open(f"{SRC}/IMG_2981.PNG").convert("RGB")
patch(img, (990, 1880, 1240, 1950), "Abby", SANS_MED(36), center_x=1114)
img.save(f"{OUT}/IMG_2981.PNG")

# ---- IMG_2987 · New prayer
print("IMG_2987")
img = Image.open(f"{SRC}/IMG_2987.PNG").convert("RGB")
patch(img, (120, 1580, 700, 1660), "Let Abby know", SANS_MED(42))
patch(img, (120, 1775, 660, 1830), "ABBY WILL SEE", SANS_SB(27), tracking=4.8)
patch(img, (320, 1935, 830, 1995), "Caleb added a prayer point", SANS(36),
      dark_text=False, fill=(216, 196, 166))
img.save(f"{OUT}/IMG_2987.PNG")

# ---- IMG_2988 · Reflections: real journal excerpts -> display copy
print("IMG_2988")
img = Image.open(f"{SRC}/IMG_2988.PNG").convert("RGB")
W = 1035
patch(img, (130, 570, 1180, 730),
      "“God gives wisdom to the ones who ask for it. I want praying first to become our hab…”",
      SERIF_IT(45), wrap_width=W)
patch(img, (130, 1255, 1180, 1430),
      "“Let your words be few. I underlined that twice. Fewer promises between us, kept slowly, feels li…”",
      SERIF_IT(45), wrap_width=W)
patch(img, (130, 1720, 1180, 1885),
      "“The mouth of the righteous is a fountain of life. I want our home to sound like that”",
      SERIF_IT(45), wrap_width=W)
patch(img, (130, 2180, 1180, 2365),
      "“Let brotherly love continue. Simple to read and slower to live. We picked one small way to pra…”",
      SERIF_IT(45), wrap_width=W)
img.save(f"{OUT}/IMG_2988.PNG")

# ---- IMG_2989 · You tab
print("IMG_2989")
img = Image.open(f"{SRC}/IMG_2989.PNG").convert("RGB")
patch(img, (300, 415, 1080, 510), "Caleb", SERIF(66))
patch(img, (300, 505, 1180, 565), "Walking with Abby · 21 day streak", SANS(39))
patch(img, (215, 2465, 750, 2535), "You & Abby", SANS(45))
img.save(f"{OUT}/IMG_2989.PNG")

# ---- IMG_2994 · You & partner
print("IMG_2994")
img = Image.open(f"{SRC}/IMG_2994.PNG").convert("RGB")
patch(img, (70, 315, 1100, 415), "You & Abby", SERIF_LIGHT(90))
patch(img, (85, 760, 1235, 840), "Caleb & Abby", SERIF(60), center_x=660)
patch(img, (70, 1915, 1250, 2155),
      "Reflections are visible only to you and Abby. Each one stays sealed until you've both written for that day. We never show it early, to anyone.",
      SANS(42), wrap_width=1160)
img.save(f"{OUT}/IMG_2994.PNG")
print("done")

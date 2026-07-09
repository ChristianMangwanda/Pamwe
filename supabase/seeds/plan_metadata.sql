-- Curated-plan browse/detail copy, lifted verbatim from the design prototype's
-- planLib (design_handoff_pamwe/Pamwe App.dc.html). Runs after seed.sql (and the
-- John seed) have inserted the plan rows. Idempotent — matches by fixed plan id.

UPDATE public.plans SET
  tagline = 'The whole story, together',
  about = 'The classic plan that walks you through the Old Testament once and the New Testament and Psalms twice in a year — the whole redemptive story, shared.',
  explore = ARRAY[
    'The arc from Genesis to Revelation',
    'How every book points to Christ',
    'Old and New in conversation',
    'Staying faithful across a full year'
  ],
  gain = ARRAY[
    'A grasp of the whole Bible',
    'A year-long shared discipline',
    'Roots that steady your marriage'
  ],
  minutes_label = '~20 min',
  rhythm_label = 'Four readings a day',
  book_label = 'Whole Bible'
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

UPDATE public.plans SET
  tagline = 'Meet Jesus, together',
  about = 'Read the fourth gospel side by side and watch how Jesus meets ordinary people — and your marriage — with grace and truth.',
  explore = ARRAY[
    'The seven signs of John',
    'Who Jesus says He is',
    'Belief that changes a home',
    'Abiding as a daily practice'
  ],
  gain = ARRAY[
    'A clearer picture of Jesus',
    'Conversations about faith you''ve never had',
    'A gospel-shaped way of loving each other'
  ],
  minutes_label = '~12 min',
  rhythm_label = 'One chapter a day',
  book_label = 'John'
WHERE id = 'b1b2c3d4-e5f6-7890-abcd-ef1234567891';

UPDATE public.plans SET
  tagline = 'Words for every weather',
  about = 'Thirty psalms for the full range of a shared life — joy, fear, gratitude, grief — giving you honest words to bring to God as a couple.',
  explore = ARRAY[
    'Praying your real emotions',
    'Lament without losing faith',
    'Praise as a daily rhythm',
    'Trust when the ground shifts'
  ],
  gain = ARRAY[
    'Language for feelings you can''t name',
    'A calmer, more honest prayer life',
    'Comfort you can return to any night'
  ],
  minutes_label = '~8 min',
  rhythm_label = 'A psalm a day',
  book_label = 'Psalms'
WHERE id = 'c1b2c3d4-e5f6-7890-abcd-ef1234567892';

UPDATE public.plans SET
  tagline = 'An unbreakable marriage',
  about = 'A three-week walk through Ecclesiastes on what it means to face life woven together — with God as the third strand that holds when you can''t.',
  explore = ARRAY[
    'Why two are better than one',
    'Facing changing seasons as a team',
    'Letting God be the strand that holds',
    'Rhythms that outlast feelings'
  ],
  gain = ARRAY[
    'A shared language for hard seasons',
    'A habit of praying before deciding',
    'Deeper trust through honest reflection'
  ],
  minutes_label = '~10 min',
  rhythm_label = 'One chapter a day',
  book_label = 'Ecclesiastes'
WHERE id = 'd1b2c3d4-e5f6-7890-abcd-ef1234567893';

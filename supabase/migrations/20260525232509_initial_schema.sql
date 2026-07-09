-- ============================================================
-- COUPLES (created before users references it)
-- ============================================================
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  invite_expires_at TIMESTAMPTZ NOT NULL,
  partner_a_id UUID NOT NULL REFERENCES auth.users(id),
  partner_b_id UUID REFERENCES auth.users(id),
  paired_at TIMESTAMPTZ,
  streak_count INTEGER DEFAULT 0,
  streak_last_date DATE,
  freeze_days_used INTEGER DEFAULT 0,
  freeze_period_start DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_initial TEXT NOT NULL DEFAULT 'U',
  couple_id UUID REFERENCES public.couples(id),
  notification_morning_time TIME DEFAULT '06:30',
  notification_partner BOOLEAN DEFAULT true,
  notification_prayer BOOLEAN DEFAULT true,
  expo_push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PLANS (reading plan templates)
-- ============================================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  duration_days INTEGER NOT NULL,
  is_curated BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PLAN DAYS (one row per day of a plan)
-- ============================================================
CREATE TABLE public.plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  passage_reference TEXT NOT NULL,
  passage_title TEXT,
  passage_text TEXT NOT NULL,
  pull_quote TEXT,
  pull_quote_ref TEXT,
  reflection_prompt TEXT NOT NULL,
  UNIQUE(plan_id, day_number)
);

-- ============================================================
-- COUPLE PLANS (a couple's active enrollment in a plan)
-- ============================================================
CREATE TABLE public.couple_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  start_date DATE NOT NULL,
  current_day INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(couple_id, plan_id)
);

-- ============================================================
-- ENTRIES (journal reflections)
-- ============================================================
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_plan_id UUID NOT NULL REFERENCES public.couple_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('text', 'voice')),
  text_content TEXT,
  audio_url TEXT,
  audio_duration_seconds INTEGER,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(couple_plan_id, day_number, user_id)
);

-- ============================================================
-- PRAYERS
-- ============================================================
CREATE TABLE public.prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  text TEXT NOT NULL CHECK (char_length(text) <= 280),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'answered')),
  answered_at TIMESTAMPTZ,
  answer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRAYER MARKS ("I prayed for this today")
-- ============================================================
CREATE TABLE public.prayer_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_id UUID NOT NULL REFERENCES public.prayers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  marked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prayer_id, user_id, marked_date)
);

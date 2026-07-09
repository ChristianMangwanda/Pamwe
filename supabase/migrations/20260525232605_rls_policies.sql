-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_marks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS policies
-- ============================================================
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "users_select_partner" ON public.users
  FOR SELECT USING (
    couple_id IS NOT NULL
    AND couple_id IN (
      SELECT couple_id FROM public.users WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ============================================================
-- COUPLES policies
-- ============================================================
CREATE POLICY "couples_select_own" ON public.couples
  FOR SELECT USING (
    partner_a_id = (SELECT auth.uid()) OR partner_b_id = (SELECT auth.uid())
  );

CREATE POLICY "couples_select_by_invite" ON public.couples
  FOR SELECT USING (
    partner_b_id IS NULL
    AND invite_expires_at > now()
  );

CREATE POLICY "couples_insert" ON public.couples
  FOR INSERT WITH CHECK (partner_a_id = (SELECT auth.uid()));

CREATE POLICY "couples_update_join" ON public.couples
  FOR UPDATE USING (
    partner_b_id IS NULL
    AND invite_expires_at > now()
  );

-- ============================================================
-- PLANS policies (readable by all authenticated users)
-- ============================================================
CREATE POLICY "plans_select_all" ON public.plans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "plan_days_select_all" ON public.plan_days
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- COUPLE PLANS policies
-- ============================================================
CREATE POLICY "couple_plans_select" ON public.couple_plans
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "couple_plans_insert" ON public.couple_plans
  FOR INSERT WITH CHECK (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "couple_plans_update" ON public.couple_plans
  FOR UPDATE USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- ENTRIES policies — THE LOCKED REVEAL
-- ============================================================

-- Users can always see their own entries
CREATE POLICY "entries_select_own" ON public.entries
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Users can see partner's entry ONLY if both have submitted for that day
CREATE POLICY "entries_select_partner_after_mutual_submit" ON public.entries
  FOR SELECT TO authenticated USING (
    user_id != (SELECT auth.uid())
    AND couple_plan_id IN (
      SELECT cp.id FROM public.couple_plans cp
      JOIN public.couples c ON cp.couple_id = c.id
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
    AND submitted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.entries my_entry
      WHERE my_entry.couple_plan_id = entries.couple_plan_id
      AND my_entry.day_number = entries.day_number
      AND my_entry.user_id = (SELECT auth.uid())
      AND my_entry.submitted_at IS NOT NULL
    )
  );

CREATE POLICY "entries_insert_own" ON public.entries
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Can only update own unsubmitted entries (autosave drafts)
CREATE POLICY "entries_update_own_draft" ON public.entries
  FOR UPDATE TO authenticated USING (
    user_id = (SELECT auth.uid()) AND submitted_at IS NULL
  );

-- ============================================================
-- PRAYERS policies
-- ============================================================
CREATE POLICY "prayers_select" ON public.prayers
  FOR SELECT USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "prayers_insert" ON public.prayers
  FOR INSERT WITH CHECK (author_id = (SELECT auth.uid()));

CREATE POLICY "prayers_update" ON public.prayers
  FOR UPDATE USING (
    couple_id IN (
      SELECT c.id FROM public.couples c
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- PRAYER MARKS policies
-- ============================================================
CREATE POLICY "prayer_marks_select" ON public.prayer_marks
  FOR SELECT USING (
    prayer_id IN (
      SELECT p.id FROM public.prayers p
      JOIN public.couples c ON p.couple_id = c.id
      WHERE c.partner_a_id = (SELECT auth.uid()) OR c.partner_b_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "prayer_marks_insert" ON public.prayer_marks
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================
-- Performance indexes
-- ============================================================

-- Critical: powers the locked reveal RLS self-join
CREATE INDEX idx_entries_reveal_lookup
  ON public.entries (couple_plan_id, day_number, user_id, submitted_at);

CREATE INDEX idx_couples_invite_code ON public.couples (invite_code);
CREATE INDEX idx_couples_partners ON public.couples (partner_a_id, partner_b_id);
CREATE INDEX idx_users_couple ON public.users (couple_id);
CREATE INDEX idx_couple_plans_couple ON public.couple_plans (couple_id);
CREATE INDEX idx_prayers_couple ON public.prayers (couple_id);
CREATE INDEX idx_prayer_marks_prayer ON public.prayer_marks (prayer_id);

-- ============================================================
-- Auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_initial)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.email, 'U')), 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

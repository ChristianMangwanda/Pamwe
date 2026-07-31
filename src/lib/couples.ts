import { supabase } from './supabase';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createCouple() {
  // getSession() reads locally; getUser() is a network call that can hang
  // during first-run onboarding (same for the sites below).
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const inviteCode = generateCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const { data, error } = await supabase
    .from('couples')
    .insert({
      invite_code: inviteCode,
      invite_expires_at: expiresAt.toISOString(),
      partner_a_id: user.id,
      timezone,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('users')
    .update({ couple_id: data.id })
    .eq('id', user.id);

  return data;
}

export function inviteExpired(couple: { invite_expires_at?: string | null }): boolean {
  if (!couple.invite_expires_at) return true;
  return new Date(couple.invite_expires_at).getTime() <= Date.now();
}

// #18: a lapsed code used to brick the couple (no path ever refreshed it).
// Only valid while unpaired; RLS (couples_update_regenerate_invite) enforces
// that the caller is partner A and the couple has no partner B.
export async function regenerateInviteCode(coupleId: string) {
  const inviteCode = generateCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('couples')
    .update({
      invite_code: inviteCode,
      invite_expires_at: expiresAt.toISOString(),
    })
    .eq('id', coupleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinCouple(inviteCode: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');

  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select()
    .eq('invite_code', inviteCode.toUpperCase())
    .is('partner_b_id', null)
    .gt('invite_expires_at', new Date().toISOString())
    .single();

  if (findError || !couple) throw new Error("That code didn't work. Check it with your partner and try again.");
  if (couple.partner_a_id === user.id) throw new Error("You can't join your own invite");

  const { error: updateError } = await supabase
    .from('couples')
    .update({
      partner_b_id: user.id,
      paired_at: new Date().toISOString(),
    })
    .eq('id', couple.id);

  if (updateError) throw updateError;

  await supabase
    .from('users')
    .update({ couple_id: couple.id })
    .eq('id', user.id);

  return couple;
}

export async function getUserCouple(userId?: string) {
  let uid = userId;
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession();
    uid = session?.user?.id;
  }
  if (!uid) return null;

  // Distinguish "no couple" (null) from "query failed" (throw): swallowing
  // errors here made the auth gate re-onboard paired couples on a network
  // blip — from where they could create a SECOND couple.
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', uid)
    .single();

  // PGRST116 = no profile row yet (signup-trigger race) — genuinely no couple.
  if (profileError && profileError.code !== 'PGRST116') throw profileError;
  if (!profile?.couple_id) return null;

  const { data: couple, error: coupleError } = await supabase
    .from('couples')
    .select()
    .eq('id', profile.couple_id)
    .maybeSingle();

  if (coupleError) throw coupleError;
  return couple;
}

export async function getPartnerProfile(couple: any, userId?: string) {
  if (!couple) return null;
  let uid = userId;
  if (!uid) {
    const { data: { session } } = await supabase.auth.getSession();
    uid = session?.user?.id;
  }
  if (!uid) return null;

  const partnerId =
    couple.partner_a_id === uid ? couple.partner_b_id : couple.partner_a_id;
  if (!partnerId) return null;

  const { data } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_initial')
    .eq('id', partnerId)
    .maybeSingle();

  return data;
}

export function profileInitial(
  profile: { avatar_initial?: string | null; display_name?: string | null; email?: string | null } | null,
): string | null {
  const ch = profile?.avatar_initial || profile?.display_name?.[0] || profile?.email?.[0];
  return ch ? ch.toUpperCase() : null;
}

/** The date a couple counts from: their own anniversary once they set one,
 *  otherwise the day they paired in the app. */
export function togetherSince(
  couple: { anniversary?: string | null; paired_at?: string | null } | null,
): Date | null {
  // A DATE column arrives as 'YYYY-MM-DD', which new Date() reads as UTC
  // midnight. Parsing the parts keeps it a local calendar day, so the count
  // does not jump by one either side of the date line.
  if (couple?.anniversary) {
    const [y, m, d] = couple.anniversary.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return couple?.paired_at ? new Date(couple.paired_at) : null;
}

/** A Date as the local calendar day 'YYYY-MM-DD'. toISOString() would convert to
 *  UTC first and hand back yesterday for anyone west of Greenwich. */
export function toISODate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/** Whole days from togetherSince() to today, counting the first day as 1.
 *  One rule for the You tab and the Lock Screen widget, so they never disagree. */
export function daysTogether(
  couple: { anniversary?: string | null; paired_at?: string | null } | null,
  now: Date = new Date(),
): number {
  const since = togetherSince(couple);
  if (!since) return 0;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.floor((startOfDay(now) - startOfDay(since)) / 86400000) + 1;
  return Math.max(0, days);
}

/** Set (or clear, with null) the couple's anniversary. Goes through an RPC
 *  because no UPDATE policy on couples reaches a paired member's own row. */
export async function setAnniversary(anniversary: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_couple_anniversary', { p_anniversary: anniversary });
  if (error) throw error;
}

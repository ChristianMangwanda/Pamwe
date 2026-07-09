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
  const { data: { user } } = await supabase.auth.getUser();
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

export async function joinCouple(inviteCode: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: couple, error: findError } = await supabase
    .from('couples')
    .select()
    .eq('invite_code', inviteCode.toUpperCase())
    .is('partner_b_id', null)
    .gt('invite_expires_at', new Date().toISOString())
    .single();

  if (findError || !couple) throw new Error('Invalid or expired invite code');
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
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('couple_id')
    .eq('id', uid)
    .single();

  if (!profile?.couple_id) return null;

  const { data: couple } = await supabase
    .from('couples')
    .select()
    .eq('id', profile.couple_id)
    .single();

  return couple;
}

export async function getPartnerProfile(couple: any, userId?: string) {
  if (!couple) return null;
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
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

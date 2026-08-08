import { supabase } from './supabase';

// Calls the delete-account Edge Function, which runs the demote-don't-delete
// routine with the service role (see supabase/functions/delete-account). The
// caller's session JWT is attached automatically; a user can only delete itself.
export async function deleteMyAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// Sets the display name the partner sees, plus the derived avatar initial.
export async function updateDisplayName(name: string) {
  // getSession() is a local read — getUser() is a network round-trip that can
  // hang right after a fresh magic-link sign-in.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not authenticated');
  const trimmed = name.trim();
  // .select().single() makes a zero-row update (missing users row) fail loudly
  // instead of advancing without saving.
  const { error } = await supabase
    .from('users')
    .update({ display_name: trimmed, avatar_initial: (trimmed[0] || 'U').toUpperCase() })
    .eq('id', user.id)
    .select('id')
    .single();
  if (error) throw error;
}

/** Record that this user accepted the terms and privacy policy, once.
 *
 *  The policy says the legal basis for holding a couple's reflections is their
 *  explicit consent, given when they create an account. The welcome screen asks
 *  for it (continuing is agreeing); this is what makes it a fact we hold rather
 *  than a sentence we wrote. Best effort on purpose: never block a sign-in over
 *  it, and never overwrite the original date. */
export async function recordTermsAcceptance() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;
  await supabase
    .from('users')
    .update({ accepted_terms_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('accepted_terms_at', null);
}

export async function getMyProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('id, display_name, avatar_initial, email')
    .eq('id', user.id)
    .maybeSingle();
  return data;
}

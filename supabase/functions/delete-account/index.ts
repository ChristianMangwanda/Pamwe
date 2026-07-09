import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generate a fresh invite code (same alphabet as src/lib/couples.ts — no ambiguous
// O/0/I/1) so a surviving partner lands on a usable waiting screen they can reshare.
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify the caller from their own JWT — a user can only delete themselves.
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const admin = createClient(url, serviceKey);
  const userId = user.id;

  // 1. Resolve couple + partner BEFORE removing anything.
  const { data: profile } = await admin
    .from("users").select("couple_id").eq("id", userId).single();
  const coupleId = profile?.couple_id ?? null;

  let couple: any = null;
  let partnerId: string | null = null;
  if (coupleId) {
    const { data: c } = await admin.from("couples").select("*").eq("id", coupleId).single();
    couple = c;
    if (c) partnerId = c.partner_a_id === userId ? c.partner_b_id : c.partner_a_id;
  }

  // 2. Delete the departing user's voice recordings from storage BEFORE the
  //    rows that locate them are removed (privacy promise: deletion removes
  //    recordings; debug tour finding #10).
  const { data: voiceEntries } = await admin
    .from("entries")
    .select("couple_plan_id, day_number")
    .eq("user_id", userId)
    .eq("entry_type", "voice");
  const audioPaths = (voiceEntries ?? []).map(
    (e) => `${e.couple_plan_id}/${e.day_number}/${userId}.m4a`
  );
  if (audioPaths.length) {
    try {
      await admin.storage.from("voice-entries").remove(audioPaths);
    } catch {
      // best-effort; row deletion proceeds regardless
    }
  }

  // 3. Delete the departing user's OWN content. None of these cascade from
  //    auth.users, so they must be removed by hand before the auth-row delete.
  await admin.from("prayer_marks").delete().eq("user_id", userId);
  await admin.from("entries").delete().eq("user_id", userId);
  await admin.from("prayers").delete().eq("author_id", userId);

  // 4. Demote the couple — never DELETE the couples row, because
  //    couples -> couple_plans -> entries and couples -> prayers cascade would
  //    destroy the surviving partner's data.
  if (couple) {
    if (!partnerId) {
      // Solo / never-paired couple: nothing of the partner's to protect, so the
      // row (and its cascade of the departing user's own plans) can go.
      await admin.from("couples").delete().eq("id", couple.id);
    } else {
      const resetFields = {
        partner_b_id: null,
        paired_at: null,
        streak_count: 0,
        streak_last_date: null,
        freeze_days_used: 0,
        freeze_period_start: null,
        invite_code: generateInviteCode(),
        invite_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      if (couple.partner_a_id === userId) {
        // Departing user holds the NOT NULL partner_a slot — promote the survivor.
        await admin.from("couples")
          .update({ ...resetFields, partner_a_id: partnerId })
          .eq("id", couple.id);
      } else {
        await admin.from("couples").update(resetFields).eq("id", couple.id);
      }
    }
  }

  // 5. Notify the surviving partner (best-effort) and route them to unpaired.
  if (partnerId) {
    const { data: partner } = await admin
      .from("users").select("expo_push_token").eq("id", partnerId).single();
    if (partner?.expo_push_token) {
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: partner.expo_push_token,
            sound: "default",
            title: "Your partner has left Pamwe",
            body: "Your own reflections are saved. You can pair again whenever you're ready.",
            data: { type: "partner_left" },
          }),
        });
      } catch {
        // best-effort; deletion proceeds regardless
      }
    }
  }

  // 6. Delete the auth user — public.users cascades, and nothing else now
  //    references this auth.users row.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

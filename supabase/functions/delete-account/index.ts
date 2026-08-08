import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

// Demote, don't delete: the survivor keeps everything. See
// 20260808000006_delete_account_rpc.sql for the routine itself.
//
// This used to run as eighteen separate statements from here, each committing on
// its own, so a failure halfway left content permanently gone AND the account
// alive, behind a 500 that claimed nothing had happened. The database work is now
// one transaction in delete_account(); what is left here is the two things that
// cannot be inside it, in the order that makes each failure survivable:
//
//   1. storage objects, which are not transactional, so they go FIRST and the
//      result is CHECKED. remove() resolves { data, error } and does not throw,
//      so the old try/catch never saw a storage RLS refusal or a partial delete:
//      the recordings stayed while the entries rows that locate them were
//      deleted, leaving audio nobody could ever find or remove again. Failing
//      here costs nothing, because the account is still whole and retryable.
//   2. the auth.users row, which belongs to GoTrue and is deleted through the
//      Admin API afterwards, when nothing references it.
//
// The partner push now goes LAST, after the account is actually gone. It used to
// fire before the auth delete, so a failure at the final step told someone their
// partner had left when they had not.
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

  // 1. Voice recordings, before the rows that locate them are removed.
  const { data: voiceEntries, error: voiceErr } = await admin
    .from("entries")
    .select("couple_plan_id, day_number")
    .eq("user_id", userId)
    .eq("entry_type", "voice");

  if (voiceErr) {
    console.error("delete-account: voice entry lookup failed", voiceErr);
    return new Response(JSON.stringify({ error: voiceErr.message }), { status: 500 });
  }

  const audioPaths = (voiceEntries ?? []).map(
    (e) => `${e.couple_plan_id}/${e.day_number}/${userId}.m4a`
  );
  if (audioPaths.length) {
    const { error: rmErr } = await admin.storage.from("voice-entries").remove(audioPaths);
    if (rmErr) {
      // Stop while the entries rows still point at these objects, so a retry can
      // find them. Deleting the rows first would strand the audio for good, which
      // is the opposite of what deleting an account promises.
      console.error("delete-account: voice recording removal failed", rmErr);
      return new Response(
        JSON.stringify({ error: `voice recordings: ${rmErr.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // 2. Everything in the public schema, atomically.
  const { data: outcome, error: rpcErr } = await admin.rpc("delete_account", { p_user: userId });
  if (rpcErr) {
    console.error("delete-account: delete_account rpc failed", rpcErr);
    return new Response(JSON.stringify({ error: rpcErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. The auth row. public.users cascades from it, and nothing else references
  //    it now. If this fails the user simply retries: delete_account() is keyed
  //    on the caller and safe to re-enter.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });
  }

  // 4. Tell the surviving partner, best effort, now that it is true.
  const partnerToken = outcome?.partner_push_token;
  if (partnerToken) {
    try {
      await sendExpoPush(admin, "delete-account", [{
        to: partnerToken,
        sound: "default",
        title: "Your partner has left Pamwe",
        body: "Your own reflections are saved. You can pair again whenever you're ready.",
        data: { type: "partner_left" },
      }]);
    } catch (e) {
      console.error("delete-account: partner push failed", e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

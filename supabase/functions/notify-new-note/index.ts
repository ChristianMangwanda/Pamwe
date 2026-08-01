import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const { record } = await req.json();
  if (!record) return new Response("No record", { status: 200 });

  const { couple_id, user_id: authorId, book, chapter, verse } = record;

  // Query errors are 5xx, never folded into "not found": as a webhook target
  // the only trace of this run is net._http_response, so a swallowed error
  // becomes an invisible 200.
  const { data: couple, error: coupleErr } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", couple_id)
    .single();

  if (coupleErr) {
    console.error("notify-new-note: couples lookup failed", coupleErr);
    return new Response("couples lookup failed", { status: 500 });
  }
  if (!couple) return new Response("No couple found", { status: 200 });

  const partnerId =
    couple.partner_a_id === authorId ? couple.partner_b_id : couple.partner_a_id;
  if (!partnerId) return new Response("No partner", { status: 200 });

  // Both rows in one round trip; the author's name is the whole point of the
  // copy, so it is worth fetching rather than saying "your partner".
  const { data: people, error: peopleErr } = await supabase
    .from("users")
    .select("id, display_name, expo_push_token, notification_note")
    .in("id", [partnerId, authorId]);

  if (peopleErr) {
    console.error("notify-new-note: users lookup failed", peopleErr);
    return new Response("users lookup failed", { status: 500 });
  }

  const partner = people?.find((p) => p.id === partnerId);
  const author = people?.find((p) => p.id === authorId);

  if (!partner?.expo_push_token || partner.notification_note === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const who = author?.display_name?.trim() || "Your partner";
  const ref = `${book} ${chapter}:${verse}`;

  const { result } = await sendExpoPush(supabase, "notify-new-note", [{
    to: partner.expo_push_token,
    sound: "default",
    title: `${who} took note of ${ref}`,
    body: "Want to see it?",
    // The note itself is deliberately not in the payload: it lands on a lock
    // screen, and this is the one place the couple write only to each other.
    data: { type: "note", book, chapter, verse },
  }]);

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

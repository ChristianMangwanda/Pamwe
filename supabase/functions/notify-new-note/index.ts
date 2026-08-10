import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { sendExpoPush, tokensFor, fanOut } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-new-note");
  if (denied) return denied;

  const { record } = await req.json();
  if (!record?.id) return new Response("No note id", { status: 200 });

  // Read the note from the table rather than from the request. book/chapter/verse
  // used to be pasted into the notification title straight off the payload, so
  // the reference on the banner was free text chosen by the caller.
  const { data: note, error: noteErr } = await supabase
    .from("verse_notes")
    .select("couple_id, user_id, book, chapter, verse")
    .eq("id", record.id)
    .maybeSingle();

  if (noteErr) {
    console.error("notify-new-note: note lookup failed", noteErr);
    return new Response("note lookup failed", { status: 500 });
  }
  if (!note) return new Response("Note gone", { status: 200 });

  const { couple_id, user_id: authorId, book, chapter, verse } = note;

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
    .select("id, display_name, expo_push_token, notification_note, notification_preview")
    .in("id", [partnerId, authorId]);

  if (peopleErr) {
    console.error("notify-new-note: users lookup failed", peopleErr);
    return new Response("users lookup failed", { status: 500 });
  }

  const partner = people?.find((p) => p.id === partnerId);
  const author = people?.find((p) => p.id === authorId);

  if (partner?.notification_note === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const who = author?.display_name?.trim() || "Your partner";
  const ref = `${book} ${chapter}:${verse}`;

  // Every phone they are signed in on, not just the last one to register.
  const deviceTokens = await tokensFor(supabase, partnerId, partner?.expo_push_token);
  if (deviceTokens.length === 0) {
    return new Response("No devices to notify", { status: 200 });
  }

  const { result } = await sendExpoPush(supabase, "notify-new-note", fanOut(deviceTokens, {
    sound: "default",
    title: `${who} took note of ${ref}`,
    body: "Want to see it?",
    // The note itself is deliberately not in the payload: it lands on a lock
    // screen, and this is the one place the couple write only to each other.
    data: { type: "note", book, chapter, verse },
  }, partner?.notification_preview));

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { sendExpoPush, tokensFor, fanOut } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// DB webhook target for an INSERT on public.verse_note_responses
// (verify_jwt = false, same as the other notify-* webhooks).
//
// Only comments reach here: the trigger's WHEN clause filters hearts and amens
// out, the same way notify_on_new_response does, so an ambient tap never buzzes
// a phone. Rides the same notification_note preference as the note itself,
// because it is the same conversation and one switch should govern it.
Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-verse-comment");
  if (denied) return denied;

  const { record } = await req.json();
  if (!record || record.kind !== "comment") {
    return new Response("Not a comment", { status: 200 });
  }

  const { couple_id, user_id: authorId, note_id } = record;

  // Query errors are 5xx, never folded into "not found": as a webhook target
  // the only trace of this run is net._http_response.
  const [{ data: couple, error: coupleErr }, { data: note, error: noteErr }] = await Promise.all([
    supabase
      .from("couples")
      .select("partner_a_id, partner_b_id")
      .eq("id", couple_id)
      .single(),
    supabase
      .from("verse_notes")
      .select("book, chapter, verse")
      .eq("id", note_id)
      .single(),
  ]);

  if (coupleErr) {
    console.error("notify-verse-comment: couples lookup failed", coupleErr);
    return new Response("couples lookup failed", { status: 500 });
  }
  if (noteErr) {
    console.error("notify-verse-comment: note lookup failed", noteErr);
    return new Response("note lookup failed", { status: 500 });
  }
  if (!couple || !note) return new Response("No couple or note found", { status: 200 });

  const partnerId =
    couple.partner_a_id === authorId ? couple.partner_b_id : couple.partner_a_id;
  if (!partnerId) return new Response("No partner", { status: 200 });

  const { data: people, error: peopleErr } = await supabase
    .from("users")
    .select("id, display_name, expo_push_token, notification_note")
    .in("id", [partnerId, authorId]);

  if (peopleErr) {
    console.error("notify-verse-comment: users lookup failed", peopleErr);
    return new Response("users lookup failed", { status: 500 });
  }

  const partner = people?.find((p) => p.id === partnerId);
  const author = people?.find((p) => p.id === authorId);

  if (partner?.notification_note === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const who = author?.display_name?.trim() || "Your partner";
  const ref = `${note.book} ${note.chapter}:${note.verse}`;

  // Every phone they are signed in on, not just the last one to register.
  const deviceTokens = await tokensFor(supabase, partnerId, partner?.expo_push_token);
  if (deviceTokens.length === 0) {
    return new Response("No devices to notify", { status: 200 });
  }

  const { result } = await sendExpoPush(supabase, "notify-verse-comment", fanOut(deviceTokens, {
    sound: "default",
    title: `${who} said something on ${ref}`,
    body: "Want to see it?",
    // The words stay off the lock screen, the same as the note they answer.
    data: {
      type: "verse_comment",
      book: note.book,
      chapter: note.chapter,
      verse: note.verse,
    },
  }));

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

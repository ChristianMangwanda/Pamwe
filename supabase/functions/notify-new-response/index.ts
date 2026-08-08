import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// DB webhook target for an INSERT on public.entry_responses (verify_jwt = false,
// same as the other notify-* webhooks). Replying to a partner's reflection was
// completely silent: they only found out by reopening the reveal.
//
// Only 'reply' notifies. Hearts and amens are ambient by design, and a banner
// for every tap would turn the warmest part of the ritual into noise. The
// trigger filters on kind too, so a heart never even reaches this function.
Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-new-response");
  if (denied) return denied;

  const { record } = await req.json();

  if (!record?.id) {
    return new Response("No response id", { status: 200 });
  }

  // Read the reply from the table rather than from the request. The body used to
  // be trusted verbatim AND author_id was taken on trust, so whoever could reach
  // this function chose both the words on the banner and the name above them,
  // which is to say they could impersonate a partner.
  const { data: response, error: responseErr } = await supabase
    .from("entry_responses")
    .select("kind, entry_id, author_id, body, parent_id")
    .eq("id", record.id)
    .maybeSingle();

  if (responseErr) {
    console.error("notify-new-response: response lookup failed", responseErr);
    return new Response("response lookup failed", { status: 500 });
  }

  if (!response) {
    return new Response("Response gone", { status: 200 });
  }

  if (response.kind !== "reply") {
    return new Response("Not a reply", { status: 200 });
  }

  const { entry_id, author_id, body, parent_id } = response;

  // Tell whoever is being answered. Without a parent that is the entry's author,
  // the way it has always been. With one it is the author of the reply above,
  // which is what makes a chain work: answering her reply on MY OWN reflection
  // has to reach her, and the entry's author there is me.
  //
  // Report a query error as a 5xx rather than folding it into "not found": as a
  // webhook target the only trace of this run is net._http_response.
  let recipientId: string | null = null;

  if (parent_id) {
    const { data: parent, error: parentErr } = await supabase
      .from("entry_responses")
      .select("author_id")
      .eq("id", parent_id)
      .single();
    if (parentErr) {
      console.error("notify-new-response: parent lookup failed", parentErr);
      return new Response("parent lookup failed", { status: 500 });
    }
    recipientId = parent?.author_id ?? null;
  } else {
    const { data: entry, error: entryErr } = await supabase
      .from("entries")
      .select("user_id")
      .eq("id", entry_id)
      .single();
    if (entryErr) {
      console.error("notify-new-response: entry lookup failed", entryErr);
      return new Response("entry lookup failed", { status: 500 });
    }
    recipientId = entry?.user_id ?? null;
  }

  if (!recipientId) {
    return new Response("No recipient found", { status: 200 });
  }

  // Answering yourself is possible in a chain (two of your own replies in a
  // row). Never push someone their own words.
  if (recipientId === author_id) {
    return new Response("Own words", { status: 200 });
  }

  const [{ data: recipient, error: recipientErr }, { data: author }] = await Promise.all([
    supabase
      .from("users")
      .select("expo_push_token, notification_partner")
      .eq("id", recipientId)
      .single(),
    supabase
      .from("users")
      .select("display_name")
      .eq("id", author_id)
      .single(),
  ]);

  if (recipientErr) {
    console.error("notify-new-response: recipient lookup failed", recipientErr);
    return new Response("recipient lookup failed", { status: 500 });
  }

  if (!recipient?.expo_push_token || recipient.notification_partner === false) {
    return new Response("Recipient has no token or opted out", { status: 200 });
  }

  const name = (author?.display_name ?? "Your partner").trim() || "Your partner";
  const preview = typeof body === "string" && body.length > 80
    ? `${body.slice(0, 77)}…`
    : (body ?? "");

  const { result } = await sendExpoPush(supabase, "notify-new-response", [{
    to: recipient.expo_push_token,
    sound: "default",
    title: parent_id ? `${name} replied to you` : `${name} replied to your reflection`,
    body: preview,
    data: { type: "response" },
  }]);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

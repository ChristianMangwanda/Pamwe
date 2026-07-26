import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

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
  const { record } = await req.json();

  if (!record || record.kind !== "reply") {
    return new Response("Not a reply", { status: 200 });
  }

  const { entry_id, author_id, body } = record;

  // The reply is on an entry; whoever WROTE that entry is the one to tell.
  // Report a query error as a 5xx rather than folding it into "not found": as a
  // webhook target the only trace of this run is net._http_response.
  const { data: entry, error: entryErr } = await supabase
    .from("entries")
    .select("user_id")
    .eq("id", entry_id)
    .single();

  if (entryErr) {
    console.error("notify-new-response: entry lookup failed", entryErr);
    return new Response("entry lookup failed", { status: 500 });
  }

  if (!entry) {
    return new Response("No entry found", { status: 200 });
  }

  // Replying to your own reflection isn't possible through the app, but never
  // push someone their own words if it ever becomes so.
  if (entry.user_id === author_id) {
    return new Response("Own entry", { status: 200 });
  }

  const [{ data: recipient, error: recipientErr }, { data: author }] = await Promise.all([
    supabase
      .from("users")
      .select("expo_push_token, notification_partner")
      .eq("id", entry.user_id)
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
    title: `${name} replied to your reflection`,
    body: preview,
    data: { type: "response" },
  }]);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

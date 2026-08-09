import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { sendExpoPush, tokensFor, fanOut } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-new-prayer");
  if (denied) return denied;

  const { record } = await req.json();

  if (!record?.id) {
    return new Response("No prayer id", { status: 200 });
  }

  // Read the prayer from the table rather than from the request. The body used to
  // be trusted verbatim, so whoever could reach this function chose the text that
  // appeared on someone's lock screen. It also crashed on a payload with no text
  // at all. The secret check above already means the caller is the trigger; this
  // means the notification can only ever say what a real row says.
  const { data: prayer, error: prayerErr } = await supabase
    .from("prayers")
    .select("text, couple_id, author_id, notify_partner")
    .eq("id", record.id)
    .maybeSingle();

  if (prayerErr) {
    console.error("notify-new-prayer: prayer lookup failed", prayerErr);
    return new Response("prayer lookup failed", { status: 500 });
  }

  if (!prayer) {
    return new Response("Prayer gone", { status: 200 });
  }

  if (prayer.notify_partner === false) {
    return new Response("Notify disabled", { status: 200 });
  }

  const { couple_id, author_id, text } = prayer;

  // Report a query *error* as a 5xx rather than folding it into "not found":
  // as a webhook target the only trace of this run is net._http_response, so a
  // swallowed error becomes an invisible 200 (a missing service_role grant hid
  // here for days, reading as "No couple found").
  const { data: couple, error: coupleErr } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", couple_id)
    .single();

  if (coupleErr) {
    console.error("notify-new-prayer: couples lookup failed", coupleErr);
    return new Response("couples lookup failed", { status: 500 });
  }

  if (!couple) {
    return new Response("No couple found", { status: 200 });
  }

  const partnerId =
    couple.partner_a_id === author_id
      ? couple.partner_b_id
      : couple.partner_a_id;

  if (!partnerId) {
    return new Response("No partner", { status: 200 });
  }

  const { data: partner, error: partnerErr } = await supabase
    .from("users")
    .select("expo_push_token, notification_prayer")
    .eq("id", partnerId)
    .single();

  if (partnerErr) {
    console.error("notify-new-prayer: partner lookup failed", partnerErr);
    return new Response("partner lookup failed", { status: 500 });
  }

  if (partner?.notification_prayer === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const preview = (text ?? "").length > 80 ? text.slice(0, 77) + "…" : (text ?? "");

  // sendExpoPush logs rejected tickets and clears DeviceNotRegistered tokens.
  // Every phone they are signed in on, not just the last one to register.
  const deviceTokens = await tokensFor(supabase, partnerId, partner?.expo_push_token);
  if (deviceTokens.length === 0) {
    return new Response("No devices to notify", { status: 200 });
  }

  const { result } = await sendExpoPush(supabase, "notify-new-prayer", fanOut(deviceTokens, {
    sound: "default",
    title: "Your partner added a prayer",
    body: preview,
    data: { type: "prayer" },
  }));
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

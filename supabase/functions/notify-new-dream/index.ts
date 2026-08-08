import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// DB webhook target for an INSERT on public.dreams (verify_jwt = false, same as
// the other notify-* webhooks). The banner deliberately carries no preview of
// the dream: unlike a prayer point, a dream can be private in a way you don't
// want sitting on a lock screen. It says one arrived, not what it said.
Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-new-dream");
  if (denied) return denied;

  const { record } = await req.json();

  if (!record) {
    return new Response("No record", { status: 200 });
  }

  const { couple_id, author_id } = record;

  // Report a query *error* as a 5xx rather than folding it into "not found":
  // as a webhook target the only trace of this run is net._http_response, so a
  // swallowed error becomes an invisible 200.
  const { data: couple, error: coupleErr } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", couple_id)
    .single();

  if (coupleErr) {
    console.error("notify-new-dream: couples lookup failed", coupleErr);
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
    .select("expo_push_token, notification_dream")
    .eq("id", partnerId)
    .single();

  if (partnerErr) {
    console.error("notify-new-dream: partner lookup failed", partnerErr);
    return new Response("partner lookup failed", { status: 500 });
  }

  if (!partner?.expo_push_token || partner.notification_dream === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  // sendExpoPush logs rejected tickets and clears DeviceNotRegistered tokens.
  const { result } = await sendExpoPush(supabase, "notify-new-dream", [{
    to: partner.expo_push_token,
    sound: "default",
    title: "Your partner wrote down a dream",
    body: "Open Pamwe to read it together.",
    data: { type: "dream" },
  }]);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

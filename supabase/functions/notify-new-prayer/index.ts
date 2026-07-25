import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const { record } = await req.json();

  if (!record || record.notify_partner === false) {
    return new Response("Notify disabled", { status: 200 });
  }

  const { couple_id, author_id, text } = record;

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

  if (!partner?.expo_push_token || partner.notification_prayer === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const preview = text.length > 80 ? text.slice(0, 77) + "…" : text;

  // sendExpoPush logs rejected tickets and clears DeviceNotRegistered tokens.
  const { result } = await sendExpoPush(supabase, "notify-new-prayer", [{
    to: partner.expo_push_token,
    sound: "default",
    title: "Your partner added a prayer",
    body: preview,
    data: { type: "prayer" },
  }]);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

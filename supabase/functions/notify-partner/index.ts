import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  const { record } = await req.json();

  if (!record.submitted_at) {
    return new Response("Draft, not submitted", { status: 200 });
  }

  const { couple_plan_id, day_number, user_id } = record;

  const { data: couplePlan } = await supabase
    .from("couple_plans")
    .select("couple_id")
    .eq("id", couple_plan_id)
    .single();

  if (!couplePlan) {
    return new Response("No couple plan found", { status: 200 });
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", couplePlan.couple_id)
    .single();

  if (!couple) {
    return new Response("No couple found", { status: 200 });
  }

  const partnerId =
    couple.partner_a_id === user_id
      ? couple.partner_b_id
      : couple.partner_a_id;

  if (!partnerId) {
    return new Response("No partner", { status: 200 });
  }

  const { data: partner } = await supabase
    .from("users")
    .select("expo_push_token, notification_partner")
    .eq("id", partnerId)
    .single();

  if (!partner?.expo_push_token || partner.notification_partner === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const { data: partnerEntry } = await supabase
    .from("entries")
    .select("submitted_at")
    .eq("couple_plan_id", couple_plan_id)
    .eq("day_number", day_number)
    .eq("user_id", partnerId)
    .maybeSingle();

  const partnerAlsoSubmitted = !!partnerEntry?.submitted_at;

  const message = partnerAlsoSubmitted
    ? {
        title: "Both reflections are in",
        body: "Open Pamwe and read them together.",
      }
    : {
        title: "Your partner just wrote theirs",
        body: "Write yours and open them together.",
      };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: partner.expo_push_token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: { type: "partner_entry", reveal: partnerAlsoSubmitted },
    }),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

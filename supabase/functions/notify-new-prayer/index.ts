import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const { data: couple } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", couple_id)
    .single();

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

  const { data: partner } = await supabase
    .from("users")
    .select("expo_push_token, notification_partner")
    .eq("id", partnerId)
    .single();

  if (!partner?.expo_push_token || partner.notification_partner === false) {
    return new Response("Partner has no token or opted out", { status: 200 });
  }

  const preview = text.length > 80 ? text.slice(0, 77) + "…" : text;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: partner.expo_push_token,
      sound: "default",
      title: "Your partner added a prayer",
      body: preview,
      data: { type: "prayer" },
    }),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

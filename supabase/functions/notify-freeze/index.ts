import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Fired by the streak trigger only when a freeze was just used to bridge a
// missed day. The freeze itself stays silent (no UI affordance); this is the
// one gentle, non-punishing morning-after note. Sent to both partners.
Deno.serve(async (req) => {
  const { couple_id } = await req.json();
  if (!couple_id) {
    return new Response("No couple", { status: 200 });
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", couple_id)
    .single();

  if (!couple) {
    return new Response("No couple found", { status: 200 });
  }

  const ids = [couple.partner_a_id, couple.partner_b_id].filter(Boolean);

  const { data: users } = await supabase
    .from("users")
    .select("expo_push_token")
    .in("id", ids);

  const tokens = (users ?? [])
    .map((u) => u.expo_push_token)
    .filter(Boolean);

  if (!tokens.length) {
    return new Response("No tokens", { status: 200 });
  }

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: "Today is a fresh start",
    body: "Your streak is safe. Pick up where you left off.",
    data: { type: "freeze" },
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

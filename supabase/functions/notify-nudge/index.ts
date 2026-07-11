// notify-nudge — a couple member taps "nudge my partner" on Today when the
// partner hasn't read yet. User-invoked (verify_jwt = true), unlike the webhook
// notifiers. Sends one warm push, at most once per hour per sender.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COOLDOWN_MS = 60 * 60 * 1000; // one nudge per hour per sender

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // The gateway verified the JWT; trust its sub claim.
  let meId = "";
  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    meId = JSON.parse(atob(jwt.split(".")[1] ?? "")).sub as string;
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!meId) return json({ error: "Unauthorized" }, 401);

  // My couple + partner.
  const { data: me } = await admin.from("users").select("couple_id, display_name").eq("id", meId).single();
  if (!me?.couple_id) return json({ error: "No couple" }, 200);

  const { data: couple } = await admin
    .from("couples").select("partner_a_id, partner_b_id").eq("id", me.couple_id).single();
  if (!couple) return json({ error: "No couple" }, 200);

  const partnerId = couple.partner_a_id === meId ? couple.partner_b_id : couple.partner_a_id;
  if (!partnerId) return json({ error: "No partner" }, 200);

  // One nudge per hour per sender.
  const { data: recent } = await admin
    .from("partner_nudges")
    .select("created_at")
    .eq("from_user", meId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < COOLDOWN_MS) {
    return json({ ok: false, cooldown: true, message: "You just sent a nudge. Give it a little while." }, 200);
  }

  // Log the nudge regardless of whether the push has a token to land on, so the
  // cooldown holds even before push is enabled.
  await admin.from("partner_nudges").insert({ couple_id: me.couple_id, from_user: meId });

  const { data: partner } = await admin
    .from("users").select("expo_push_token, notification_partner").eq("id", partnerId).single();

  if (!partner?.expo_push_token || partner.notification_partner === false) {
    return json({ ok: true, delivered: false }, 200);
  }

  const myName = (me.display_name ?? "Your partner").trim() || "Your partner";
  const resp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: partner.expo_push_token,
      sound: "default",
      title: `${myName} is thinking of you`,
      body: "Ready to read together today?",
      data: { type: "nudge" },
    }),
  });
  const result = await resp.json();
  return json({ ok: true, delivered: true, result }, 200);
});

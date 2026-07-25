// notify-nudge — a couple member taps "nudge my partner" on Today when the
// partner hasn't read yet. User-invoked (verify_jwt = true), unlike the webhook
// notifiers. Sends one warm push, at most once per hour per sender.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

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

  // My couple + partner. A query *error* is a server fault and must not be
  // mistaken for absence: swallowing it is what let a missing service_role
  // grant masquerade as "No couple" behind an HTTP 200 for days.
  const { data: me, error: meErr } = await admin
    .from("users").select("couple_id, display_name").eq("id", meId).single();
  if (meErr) {
    console.error("notify-nudge: users lookup failed", meErr);
    return json({ ok: false, reason: "server" }, 500);
  }
  if (!me?.couple_id) return json({ ok: false, reason: "no_couple" }, 200);

  const { data: couple, error: coupleErr } = await admin
    .from("couples").select("partner_a_id, partner_b_id").eq("id", me.couple_id).single();
  if (coupleErr) {
    console.error("notify-nudge: couples lookup failed", coupleErr);
    return json({ ok: false, reason: "server" }, 500);
  }
  if (!couple) return json({ ok: false, reason: "no_couple" }, 200);

  const partnerId = couple.partner_a_id === meId ? couple.partner_b_id : couple.partner_a_id;
  if (!partnerId) return json({ ok: false, reason: "no_partner" }, 200);

  // One nudge per hour per sender.
  const { data: recent, error: recentErr } = await admin
    .from("partner_nudges")
    .select("created_at")
    .eq("from_user", meId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentErr) {
    console.error("notify-nudge: cooldown lookup failed", recentErr);
    return json({ ok: false, reason: "server" }, 500);
  }
  if (recent && Date.now() - new Date(recent.created_at).getTime() < COOLDOWN_MS) {
    return json({ ok: false, cooldown: true, message: "You just sent a nudge. Give it a little while." }, 200);
  }

  // Log the nudge regardless of whether the push has a token to land on, so the
  // cooldown holds even before push is enabled. If this insert fails the
  // cooldown silently stops holding, so treat it as a server fault.
  const { error: logErr } = await admin
    .from("partner_nudges").insert({ couple_id: me.couple_id, from_user: meId });
  if (logErr) {
    console.error("notify-nudge: nudge log insert failed", logErr);
    return json({ ok: false, reason: "server" }, 500);
  }

  const { data: partner, error: partnerErr } = await admin
    .from("users").select("expo_push_token, notification_partner").eq("id", partnerId).single();
  if (partnerErr) {
    console.error("notify-nudge: partner lookup failed", partnerErr);
    return json({ ok: false, reason: "server" }, 500);
  }

  if (!partner?.expo_push_token) return json({ ok: true, delivered: false, reason: "no_token" }, 200);
  if (partner.notification_partner === false) {
    return json({ ok: true, delivered: false, reason: "notifications_off" }, 200);
  }

  const myName = (me.display_name ?? "Your partner").trim() || "Your partner";
  // sendExpoPush logs rejected tickets and clears DeviceNotRegistered tokens.
  const { ok } = await sendExpoPush(admin, "notify-nudge", [{
    to: partner.expo_push_token,
    sound: "default",
    title: `${myName} is thinking of you`,
    body: "Ready to read together today?",
    data: { type: "nudge" },
  }]);
  if (!ok) return json({ ok: true, delivered: false, reason: "push_failed" }, 200);
  return json({ ok: true, delivered: true }, 200);
});

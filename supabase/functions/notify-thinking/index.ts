// notify-thinking — one tap on Today that tells your partner you're thinking of
// them. No reading, no task, no ask: the whole point is that it carries nothing
// to do. User-invoked (verify_jwt = true), like notify-nudge.
//
// It shares the partner_nudges cooldown table with the read-nudge but under
// kind = 'thinking', so the two never silence each other.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendExpoPush } from "../_shared/push.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Gentler than the read-nudge's hour: this is meant to be spontaneous, but not
// a way to buzz someone's phone on repeat.
const COOLDOWN_MS = 30 * 60 * 1000;

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

  // A query *error* is a server fault and must not be mistaken for absence:
  // swallowing it is what let a missing service_role grant masquerade as
  // "No couple" behind an HTTP 200 for days.
  const { data: me, error: meErr } = await admin
    .from("users").select("couple_id, display_name").eq("id", meId).single();
  if (meErr) {
    console.error("notify-thinking: users lookup failed", meErr);
    return json({ ok: false, reason: "server" }, 500);
  }
  if (!me?.couple_id) return json({ ok: false, reason: "no_couple" }, 200);

  const { data: couple, error: coupleErr } = await admin
    .from("couples").select("partner_a_id, partner_b_id").eq("id", me.couple_id).single();
  if (coupleErr) {
    console.error("notify-thinking: couples lookup failed", coupleErr);
    return json({ ok: false, reason: "server" }, 500);
  }
  if (!couple) return json({ ok: false, reason: "no_couple" }, 200);

  const partnerId = couple.partner_a_id === meId ? couple.partner_b_id : couple.partner_a_id;
  if (!partnerId) return json({ ok: false, reason: "no_partner" }, 200);

  const { data: recent, error: recentErr } = await admin
    .from("partner_nudges")
    .select("created_at")
    .eq("from_user", meId)
    .eq("kind", "thinking")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentErr) {
    console.error("notify-thinking: cooldown lookup failed", recentErr);
    return json({ ok: false, reason: "server" }, 500);
  }
  if (recent && Date.now() - new Date(recent.created_at).getTime() < COOLDOWN_MS) {
    return json({ ok: false, cooldown: true, message: "They know. Give it a little while." }, 200);
  }

  // Log it either way, so the cooldown holds even when no banner can land.
  const { error: logErr } = await admin
    .from("partner_nudges").insert({ couple_id: me.couple_id, from_user: meId, kind: "thinking" });
  if (logErr) {
    console.error("notify-thinking: log insert failed", logErr);
    return json({ ok: false, reason: "server" }, 500);
  }

  const { data: partner, error: partnerErr } = await admin
    .from("users").select("expo_push_token, notification_partner").eq("id", partnerId).single();
  if (partnerErr) {
    console.error("notify-thinking: partner lookup failed", partnerErr);
    return json({ ok: false, reason: "server" }, 500);
  }

  if (!partner?.expo_push_token) return json({ ok: true, delivered: false, reason: "no_token" }, 200);
  if (partner.notification_partner === false) {
    return json({ ok: true, delivered: false, reason: "notifications_off" }, 200);
  }

  const myName = (me.display_name ?? "Your partner").trim() || "Your partner";
  const { ok } = await sendExpoPush(admin, "notify-thinking", [{
    to: partner.expo_push_token,
    sound: "default",
    title: `${myName} is thinking of you`,
    body: "No task, no reading. Just that.",
    data: { type: "thinking" },
  }]);
  if (!ok) return json({ ok: true, delivered: false, reason: "push_failed" }, 200);
  return json({ ok: true, delivered: true }, 200);
});

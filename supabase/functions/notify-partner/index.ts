import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { sendExpoPush, tokensFor, fanOut } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/** How long one sitting lasts, for the purposes of not saying the same thing
 *  twice. Long enough to cover writing several days back to back, short enough
 *  that two genuinely separate readings in an evening both land. */
const RUN_WINDOW_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-partner");
  if (denied) return denied;

  const { record } = await req.json();

  if (!record?.submitted_at) {
    return new Response("Draft, not submitted", { status: 200 });
  }

  const { couple_plan_id, day_number, user_id } = record;

  // Report a query *error* as a 5xx rather than folding it into "not found":
  // as a webhook target the only trace of this run is net._http_response, so a
  // swallowed error becomes an invisible 200 (a missing service_role grant hid
  // here for days, reading as "No couple plan found").
  const { data: couplePlan, error: couplePlanErr } = await supabase
    .from("couple_plans")
    .select("couple_id")
    .eq("id", couple_plan_id)
    .single();

  if (couplePlanErr) {
    console.error("notify-partner: couple_plans lookup failed", couplePlanErr);
    return new Response("couple_plans lookup failed", { status: 500 });
  }

  if (!couplePlan) {
    return new Response("No couple plan found", { status: 200 });
  }

  const { data: couple, error: coupleErr } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id, paused_at")
    .eq("id", couplePlan.couple_id)
    .single();

  if (coupleErr) {
    console.error("notify-partner: couples lookup failed", coupleErr);
    return new Response("couples lookup failed", { status: 500 });
  }

  if (!couple) {
    return new Response("No couple found", { status: 200 });
  }

  // Paused couples go quiet. Reaching here while paused should be impossible
  // (Today is replaced by the paused screen, so there is nothing to submit),
  // which is exactly why it is worth refusing: the one path that can still get
  // here is a stale client, and a stale client is the one that would break the
  // promise.
  if (couple.paused_at) return new Response("Couple is paused", { status: 200 });

  const partnerId =
    couple.partner_a_id === user_id
      ? couple.partner_b_id
      : couple.partner_a_id;

  if (!partnerId) {
    return new Response("No partner", { status: 200 });
  }

  const { data: partner, error: partnerErr } = await supabase
    .from("users")
    .select("notification_partner, notification_preview")
    .eq("id", partnerId)
    .single();

  if (partnerErr) {
    console.error("notify-partner: partner lookup failed", partnerErr);
    return new Response("partner lookup failed", { status: 500 });
  }

  if (partner?.notification_partner === false) {
    return new Response("Partner opted out", { status: 200 });
  }

  const { data: partnerEntry } = await supabase
    .from("entries")
    .select("submitted_at")
    .eq("couple_plan_id", couple_plan_id)
    .eq("day_number", day_number)
    .eq("user_id", partnerId)
    .maybeSingle();

  const partnerAlsoSubmitted = !!partnerEntry?.submitted_at;

  // One banner per catch-up run, not one per day.
  //
  // A person clearing a four day backlog seals four entries in a couple of
  // minutes, and each one used to buzz the partner's phone with the same
  // sentence. The first is the news; the rest are the same news repeated.
  //
  // Only the "they wrote theirs" side is coalesced. A day where the partner has
  // ALSO written is a reveal that just became readable, and every one of those
  // is a different thing to open, so they all still push.
  //
  // Stateless on purpose: no ledger, no new column, no CHECK to widen, in a week
  // where this function is the last thing that should carry new state. And it
  // fails OPEN. `recent` is null on any query error, which sends the push, so a
  // fault here can never silence the notification this app is built around.
  if (!partnerAlsoSubmitted) {
    const since = new Date(Date.now() - RUN_WINDOW_MS).toISOString();
    const { data: recent } = await supabase
      .from("entries")
      .select("day_number")
      .eq("couple_plan_id", couple_plan_id)
      .eq("user_id", user_id)
      .neq("day_number", day_number)
      .not("submitted_at", "is", null)
      .gte("submitted_at", since)
      .limit(1);

    if (recent && recent.length > 0) {
      return new Response("Already told them about this run", { status: 200 });
    }
  }

  const message = partnerAlsoSubmitted
    ? {
        title: "Both are in!",
        body: "Read today's word",
      }
    : {
        title: "Your partner just wrote theirs",
        body: "Write your reflection",
      };

  // Every phone they are signed in on, not just the last one to register.
  const deviceTokens = await tokensFor(supabase, partnerId);
  if (deviceTokens.length === 0) {
    return new Response("No devices to notify", { status: 200 });
  }

  // sendExpoPush logs rejected tickets and clears DeviceNotRegistered tokens.
  const { result } = await sendExpoPush(supabase, "notify-partner", fanOut(deviceTokens, {
    sound: "default",
    title: message.title,
    body: message.body,
    // `day` pins the reveal this push is about. Without it the app opened
    // whatever current_day had become by the time the banner was tapped, and if
    // the sender had already amened, that is the NEXT day, where neither
    // partner has written. The reveal then reported a connection problem.
    data: { type: "partner_entry", reveal: partnerAlsoSubmitted, day: day_number },
  }, partner?.notification_preview));
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

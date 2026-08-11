import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";
import { sendExpoPush, tokensFor, fanOut } from "../_shared/push.ts";
import { requireWebhookSecret } from "../_shared/webhook.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// DB webhook target for public.couple_requests, on INSERT and on the move out of
// 'pending' (verify_jwt = false, same as the other notify-* webhooks).
//
// Pausing is a decision the two of you make, which only works if the ask
// actually reaches the other phone. A request nobody sees is a couple waiting on
// each other with no idea they are.
//
// WHO to tell flips with the status, and that is the whole of the routing: a new
// ask goes to the person who did not make it, and an answer goes back to the one
// who did. The row is re-fetched by id rather than trusted from the body, like
// the other rewritten notifiers, so the banner can only ever say what a real row
// says.
Deno.serve(async (req) => {
  const denied = requireWebhookSecret(req, "notify-couple-request");
  if (denied) return denied;

  const { record } = await req.json();
  if (!record?.id) return new Response("No record", { status: 200 });

  const { data: request, error: requestErr } = await supabase
    .from("couple_requests")
    .select("id, couple_id, kind, status, requested_by")
    .eq("id", record.id)
    .single();

  if (requestErr) {
    console.error("notify-couple-request: request lookup failed", requestErr);
    return new Response("request lookup failed", { status: 500 });
  }
  if (!request) return new Response("No request found", { status: 200 });

  const { data: couple, error: coupleErr } = await supabase
    .from("couples")
    .select("partner_a_id, partner_b_id")
    .eq("id", request.couple_id)
    .single();

  if (coupleErr) {
    console.error("notify-couple-request: couples lookup failed", coupleErr);
    return new Response("couples lookup failed", { status: 500 });
  }
  if (!couple) return new Response("No couple found", { status: 200 });

  const other =
    couple.partner_a_id === request.requested_by
      ? couple.partner_b_id
      : couple.partner_a_id;

  // A pending row is an ask, so it goes to the other partner. Anything else is
  // an answer, so it goes back to whoever has been waiting on it. A withdrawal
  // is an answer in this sense: the person who was asked should stop expecting
  // to have to decide.
  const pending = request.status === "pending";
  const recipient = pending ? other : (request.status === "withdrawn" ? other : request.requested_by);
  if (!recipient) return new Response("No partner", { status: 200 });

  const { data: person, error: personErr } = await supabase
    .from("users")
    .select("display_name, notification_partner, notification_preview")
    .eq("id", recipient)
    .single();

  if (personErr) {
    console.error("notify-couple-request: recipient lookup failed", personErr);
    return new Response("recipient lookup failed", { status: 500 });
  }

  // Rides on the partner preference rather than a switch of its own. This is
  // rare and it is about the two of you, so a person who has turned off partner
  // notifications is the only person who would not want it, and one more toggle
  // is one more setting nobody reads.
  if (person?.notification_partner === false) {
    return new Response("Opted out", { status: 200 });
  }

  const { data: asker } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", request.requested_by)
    .single();

  const name = asker?.display_name?.split(" ")[0] ?? "Your partner";
  const pausing = request.kind === "pause";

  let title: string;
  let body: string;
  if (pending) {
    title = pausing ? `${name} asked to pause Pamwe` : `${name} would like to start again`;
    body = pausing
      ? "Nothing stops until you agree."
      : "Nothing changes until you agree.";
  } else if (request.status === "accepted") {
    title = pausing ? "Pamwe is paused" : "You are reading again";
    body = pausing
      ? "Pages and reminders have stopped for you both."
      : "Today is back, and your streak picks up where it stopped.";
  } else if (request.status === "declined") {
    title = pausing ? "Not pausing for now" : "Not restarting for now";
    body = "Nothing has changed.";
  } else {
    title = pausing ? "That pause was withdrawn" : "That restart was withdrawn";
    body = "Nothing has changed.";
  }

  const deviceTokens = await tokensFor(supabase, recipient);
  if (deviceTokens.length === 0) {
    return new Response("No devices to notify", { status: 200 });
  }

  const { result } = await sendExpoPush(supabase, "notify-couple-request", fanOut(deviceTokens, {
    sound: "default",
    title,
    body,
    data: { type: "couple-request" },
  }, person?.notification_preview));

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

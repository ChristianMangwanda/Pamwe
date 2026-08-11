// Shared caller check for the notify-* webhook targets.
//
// These functions run with verify_jwt = false, because their caller is a database
// trigger rather than a signed-in user, so the gateway lets anyone POST to them.
// Until 2026-08-08 nothing else checked either: they read `record` off the request
// body and pushed with the service role, which meant anyone could aim a
// notification at a phone, and in two cases write the text on it.
//
// The triggers send a shared secret in x-webhook-secret (see
// 20260808000005_notify_webhook_secret.sql, which reads it from the same GUC or
// Vault the URL and service key already come from). This is the other half.
//
// Returns a Response to send back when the caller is not the database, or null
// when the request may proceed.
//
// Unset means refuse, not allow: local dev keeps the value in
// supabase/functions/.env and hosted in the dashboard secrets, so a missing one is
// a deployment mistake and should be loud. A plain comparison is enough here; the
// secret is 256 bits of randomness and the attack a constant-time compare defends
// against needs far more signal than an internet round trip to a push endpoint
// leaves behind.
export function requireWebhookSecret(req: Request, tag: string): Response | null {
  const expected = Deno.env.get("NOTIFY_WEBHOOK_SECRET");
  if (!expected) {
    console.error(`${tag}: NOTIFY_WEBHOOK_SECRET is not set`);
    return new Response("Webhook secret not configured", { status: 500 });
  }
  if (req.headers.get("x-webhook-secret") !== expected) {
    console.error(`${tag}: rejected a caller with no valid webhook secret`);
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

// Shared Expo push sender for the notify-* functions.
//
// Expo answers HTTP 200 with a per-message ticket; a dead token surfaces as
// ticket.details.error === "DeviceNotRegistered" (uninstall, token rotation).
// Left alone, that token fails every future send for that user, silently.
// This sends the batch, logs rejected tickets, and clears any token Expo says
// is dead so the next sign-in can register a fresh one (savePushToken writes
// it back on launch).

export interface ExpoPushMessage {
  to: string;
  sound?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface ExpoPushOutcome {
  ok: boolean;          // HTTP ok AND no error tickets
  result: unknown;      // Expo's raw response body
}

/** Every device a person is signed in on.
 *
 *  Tokens moved to their own table (20260811000001) because one column per
 *  account meant one phone per person: a second device overwrote the first and
 *  the first went quiet. `legacy` is users.expo_push_token, still kept in step
 *  by the database, and it is the fallback for a device that registered before
 *  this shipped and has not relaunched since. */
export async function tokensFor(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  legacy?: string | null,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) {
    console.error("tokensFor: lookup failed, falling back to the legacy column", error);
    return legacy ? [legacy] : [];
  }

  const tokens = (data ?? []).map((r: { token: string }) => r.token).filter(Boolean);
  if (legacy && !tokens.includes(legacy)) tokens.push(legacy);
  return tokens;
}

/** The same notification, addressed to each of a person's devices. */
export function fanOut(
  tokens: string[],
  message: Omit<ExpoPushMessage, "to">,
): ExpoPushMessage[] {
  return tokens.map((to) => ({ ...message, to }));
}

export async function sendExpoPush(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  tag: string,
  messages: ExpoPushMessage[],
): Promise<ExpoPushOutcome> {
  // Always POST an array so tickets pair with messages by index.
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await response.json().catch(() => null);
  const tickets: any[] = Array.isArray((result as any)?.data)
    ? (result as any).data
    : [(result as any)?.data].filter(Boolean);

  let anyError = !response.ok;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket?.status !== "error") continue;
    anyError = true;
    console.error(`${tag}: expo push rejected`, ticket);
    if (ticket?.details?.error === "DeviceNotRegistered" && messages[i]?.to) {
      // Remove the dead DEVICE, not the person's whole registration: an
      // uninstalled second phone must not silence the one still in their hand.
      const dead = messages[i].to;
      const { data: row, error } = await supabase
        .from("push_tokens")
        .delete()
        .eq("token", dead)
        .select("user_id")
        .maybeSingle();
      if (error) console.error(`${tag}: dead-token cleanup failed`, error);
      else console.log(`${tag}: cleared dead push token`);

      // Keep the legacy column pointing at a device that still exists. It is
      // what older deployed functions read, and what this one falls back to.
      if (row?.user_id) {
        const { error: syncErr } = await supabase.rpc("sync_legacy_push_token", {
          p_user: row.user_id,
        });
        if (syncErr) console.error(`${tag}: legacy token sync failed`, syncErr);
      } else {
        await supabase.from("users").update({ expo_push_token: null }).eq("expo_push_token", dead);
      }
    }
  }

  return { ok: !anyError, result };
}

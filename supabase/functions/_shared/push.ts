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
 *  the first went quiet. The users.expo_push_token fallback is gone
 *  (20260815000001): every phone in use runs b27+ and registers here. */
export async function tokensFor(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) {
    console.error("tokensFor: lookup failed", error);
    return [];
  }

  return (data ?? []).map((r: { token: string }) => r.token).filter(Boolean);
}

/** The same notification, addressed to each of a person's devices.
 *
 *  `preview` is the recipient's notification_preview. On 'generic' the title
 *  and body are replaced with a line that says only that something happened:
 *  these banners carry a partner's reflection, the words of a prayer, a dream,
 *  and they render on a locked phone in front of whoever is looking at it.
 *  The DATA is untouched, so tapping still lands in exactly the right place. */
export function fanOut(
  tokens: string[],
  message: Omit<ExpoPushMessage, "to">,
  preview?: string | null,
): ExpoPushMessage[] {
  const shown = preview === "generic"
    ? { ...message, title: "Pamwe", body: "Something is waiting for you." }
    : message;
  return tokens.map((to) => ({ ...shown, to }));
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
      const { error } = await supabase
        .from("push_tokens")
        .delete()
        .eq("token", messages[i].to);
      if (error) console.error(`${tag}: dead-token cleanup failed`, error);
      else console.log(`${tag}: cleared dead push token`);
    }
  }

  return { ok: !anyError, result };
}

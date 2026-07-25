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
      const { error } = await supabase
        .from("users")
        .update({ expo_push_token: null })
        .eq("expo_push_token", messages[i].to);
      if (error) console.error(`${tag}: dead-token cleanup failed`, error);
      else console.log(`${tag}: cleared dead push token`);
    }
  }

  return { ok: !anyError, result };
}

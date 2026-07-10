// Ask Pamwe — Claude-powered reading-plan recommendations for the plan builder.
//
// User-invoked (verify_jwt = true), unlike the webhook functions. The app calls it
// via supabase.functions.invoke('ask-pamwe', { body: { query } }); the caller's JWT
// authenticates the request. Returns 2-3 structured plan recommendations.
//
// Secret required: ANTHROPIC_API_KEY (set via `supabase secrets set` on hosted, or a
// gitignored supabase/functions/.env for local `supabase functions serve`).
// Model is env-configurable via ANTHROPIC_MODEL (default claude-sonnet-5).

import Anthropic from "npm:@anthropic-ai/sdk@0.68.0";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
const MAX_QUERY = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Structured-output schema: constrains Claude to machine-safe recommendations so
// parsing can't fail. (Length/complex-array constraints aren't expressible here —
// the client reconciles reading counts against `days` after validating books.)
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          meta: { type: "string" },
          days: { type: "integer", enum: [7, 14, 21, 30] },
          rhythm: { type: "string", enum: ["verses", "chapter", "deep"] },
          readings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                day: { type: "integer" },
                reference: { type: "string" },
              },
              required: ["day", "reference"],
            },
          },
          prompts: { type: "array", items: { type: "string" } },
        },
        required: ["title", "meta", "days", "rhythm", "readings", "prompts"],
      },
    },
  },
  required: ["recommendations"],
};

const SYSTEM = `You are Ask Pamwe, a gentle guide inside Pamwe, a devotional app where a Christian couple reads Scripture together, reflects individually, then reveals their reflections to each other.

A couple describes a season, feeling, question, or theme. Recommend 2-3 short Bible reading plans that fit, drawing on your knowledge of Scripture and its themes.

Rules for every recommendation:
- title: warm and specific (e.g. "Anchored in Anxious Seasons", "Learning to Forgive Together").
- meta: one short line naming the scope, e.g. "Psalms · 14 days" or "The Sermon on the Mount · 7 days".
- days: exactly one of 7, 14, 21, or 30.
- rhythm: "verses" (a short passage a day), "chapter" (a chapter a day), or "deep" (a longer sitting).
- readings: one entry per day, numbered 1..days. Each reference is a real passage as "Book Chapter" (e.g. "John 1", "Psalm 23", "1 Corinthians 13"). Use full canonical book names from the Protestant canon (66 books). Prefer whole chapters. It's fine to walk a book in order or curate passages across books around the theme.
- prompts: 2-3 couples-focused reflection prompts (second person plural, e.g. "Where are you each carrying worry right now?"). Original, warm, non-clichéd.

Keep it grounded in Scripture, tender, and marriage-aware. Never invent books or chapters that don't exist. Never use em dashes in any text you write; use commas, colons, or periods instead.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Ask Pamwe isn't configured yet." }, 503);

  let query = "";
  try {
    const body = await req.json();
    query = String(body?.query ?? "").trim();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  if (!query) return json({ error: "Tell Pamwe what you'd like to read about." }, 400);
  if (query.length > MAX_QUERY) return json({ error: `Please keep it under ${MAX_QUERY} characters.` }, 400);

  const anthropic = new Anthropic({ apiKey });

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: "disabled" },
      system: SYSTEM,
      output_config: {
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [{ role: "user", content: query }],
    });

    if (message.stop_reason === "refusal") {
      return json({ error: "Pamwe couldn't help with that one. Try another idea." }, 502);
    }

    const text = message.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "Pamwe's answer came back garbled. Please try again." }, 502);
    }

    return json(parsed, 200);
  } catch (err) {
    console.error("ask-pamwe error:", err);
    return json({ error: "Pamwe is resting right now. Please try again in a moment." }, 502);
  }
});

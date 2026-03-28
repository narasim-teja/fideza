/**
 * LLM provider — supports Anthropic, OpenAI, Google Gemini, and OpenRouter.
 * Exposes a generic callLLM(systemPrompt, userPrompt) → string interface.
 * Callers handle JSON parsing themselves.
 */
import { config } from "../config";

// Free models on OpenRouter tried in order of reliability
const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "qwen/qwen3-coder:free",
  "google/gemma-3-27b-it:free",
  "openai/gpt-oss-120b:free",
];

async function callOpenRouterRaw(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const r = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  if (!r.choices?.length) {
    throw new Error(
      `No choices returned. Response: ${JSON.stringify(r).slice(0, 300)}`,
    );
  }

  const msg = r.choices[0].message;
  const content = msg.content ?? (msg as any).reasoning ?? null;
  if (!content) throw new Error("LLM returned empty content");
  return content;
}

async function callOpenRouterWithFallback(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { openrouterApiKey, openrouterModel } = config;

  const modelsToTry =
    openrouterModel === "auto"
      ? FREE_MODELS
      : [openrouterModel, ...FREE_MODELS.filter((m) => m !== openrouterModel)];

  const errors: string[] = [];

  for (const model of modelsToTry) {
    try {
      console.log(`  Trying model: ${model}`);
      const result = await callOpenRouterRaw(
        openrouterApiKey,
        model,
        systemPrompt,
        userPrompt,
      );
      console.log(`  → succeeded with: ${model}`);
      return result;
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.warn(`  → ${model} failed: ${msg.slice(0, 120)}`);
      errors.push(`[${model}] ${msg.slice(0, 120)}`);
    }
  }

  throw new Error(`All OpenRouter models failed:\n${errors.join("\n")}`);
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (config.aiProvider === "openrouter") {
    return callOpenRouterWithFallback(systemPrompt, userPrompt);
  }

  if (config.aiProvider === "openai") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: config.openaiApiKey });
    const r = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return r.choices[0].message.content!;
  }

  if (config.aiProvider === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(config.geminiApiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const r = await model.generateContent(
      `${systemPrompt}\n\n${userPrompt}`,
    );
    return r.response.text();
  }

  // Default: Anthropic
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const r = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = r.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}

/**
 * Parse JSON from LLM response text.
 * Handles markdown fences and extra prose around JSON.
 */
export function parseJSON<T>(text: string): T {
  let cleaned = text.replace(/```json?\n?|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
  return JSON.parse(cleaned);
}

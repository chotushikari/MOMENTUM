import { NextResponse } from "next/server";

import type { HookResponse, HookVariant, HookVariantType } from "@/lib/shorts/types";

interface OpenAIResponse { output_text?: unknown; }

const hookSchema = {
  type: "object", additionalProperties: false, required: ["hooks"], properties: {
    hooks: { type: "array", minItems: 5, maxItems: 5, items: {
      type: "object", additionalProperties: false, required: ["id", "type", "label", "text", "rationale"], properties: {
        id: { type: "string" }, type: { type: "string", enum: ["curiosity", "challenge", "contrarian", "story", "surprise"] }, label: { type: "string" }, text: { type: "string" }, rationale: { type: "string" },
      },
    } },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function value(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }

function parseHooks(valueToParse: unknown): readonly HookVariant[] | undefined {
  if (!isRecord(valueToParse) || !Array.isArray(valueToParse.hooks)) return undefined;
  const hooks = valueToParse.hooks.map((item): HookVariant | undefined => {
    if (!isRecord(item)) return undefined;
    const id = value(item.id); const label = value(item.label); const text = value(item.text); const rationale = value(item.rationale);
    const types = ["curiosity", "challenge", "contrarian", "story", "surprise"] as const;
    const type = typeof item.type === "string" && types.includes(item.type as HookVariantType) ? item.type as HookVariantType : undefined;
    return id && label && text && rationale && type ? { id, label, text, rationale, type } : undefined;
  }).filter((item): item is HookVariant => Boolean(item));
  return hooks.length === 5 ? hooks : undefined;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json<HookResponse>({ status: "unavailable", mode: "unavailable", message: "AI analysis unavailable · Authentication configuration missing." });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json<HookResponse>({ status: "error", mode: "unavailable", message: "Hook request was not valid JSON." }, { status: 400 }); }
  if (!isRecord(body) || !isRecord(body.trend) || !isRecord(body.profile)) return NextResponse.json<HookResponse>({ status: "error", mode: "unavailable", message: "Trend and creator profile are required." }, { status: 400 });
  const prompt = [
    "You are MOMENTUM generating five grounded YouTube Shorts hooks.",
    "Use only the supplied observed evidence. Do not invent facts, metrics, locations, or transcript details.",
    "Make the variants specific to the observed format while avoiding exact copying. Return one each: curiosity, challenge, contrarian, story, surprise.",
    `Creator profile: ${String(body.profile.label)} (${String(body.profile.type)}).`,
    `Trend evidence: ${JSON.stringify(body.trend)}`,
    `Opportunity context: ${JSON.stringify(body.opportunity ?? null)}`,
  ].join("\n");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", input: prompt, text: { format: { type: "json_schema", name: "momentum_hook_variants", strict: true, schema: hookSchema } } }),
      signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403 ? "AI analysis unavailable · Authentication" : response.status === 429 ? "AI analysis unavailable · Quota or rate limit" : "AI analysis unavailable · Provider unavailable";
      return NextResponse.json<HookResponse>({ status: "error", mode: "unavailable", message });
    }
    const result = (await response.json()) as OpenAIResponse;
    const hooks = typeof result.output_text === "string" ? parseHooks(JSON.parse(result.output_text)) : undefined;
    if (!hooks) throw new Error("Invalid hook output");
    return NextResponse.json<HookResponse>({ status: "success", mode: "openai", hooks });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? "AI analysis unavailable · Timeout" : "AI analysis unavailable · Response validation";
    return NextResponse.json<HookResponse>({ status: "error", mode: "unavailable", message });
  } finally { clearTimeout(timeout); }
}

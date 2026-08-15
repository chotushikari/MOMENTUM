import { NextResponse } from "next/server";

import type { CompareResponse, ComparisonResult, Trend } from "@/lib/shorts/types";

interface OpenAIResponse { output_text?: unknown; output?: unknown; }

const comparisonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["commonPatterns", "differences", "strongestHook", "strongestFormat", "strongestPayoff", "mostRemixableStructure", "emergingVariation", "evidenceRefs"],
  properties: {
    commonPatterns: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    differences: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    strongestHook: { type: "string" },
    strongestFormat: { type: "string" },
    strongestPayoff: { type: "string" },
    mostRemixableStructure: { type: "string" },
    emergingVariation: { type: "string" },
    evidenceRefs: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 20 },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractOutputText(response: OpenAIResponse): string | undefined {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
  if (!Array.isArray(response.output)) return undefined;
  for (const item of response.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) if (isRecord(content) && typeof content.text === "string" && content.text.trim()) return content.text;
  }
  return undefined;
}

function strings(value: unknown, max: number): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, max);
  return result.length ? result : undefined;
}

function parseComparison(value: unknown): ComparisonResult | undefined {
  if (!isRecord(value)) return undefined;
  const commonPatterns = strings(value.commonPatterns, 5);
  const differences = strings(value.differences, 5);
  const evidenceRefs = strings(value.evidenceRefs, 20);
  const fields = ["strongestHook", "strongestFormat", "strongestPayoff", "mostRemixableStructure", "emergingVariation"].map((key) => value[key]);
  if (!commonPatterns || !differences || !evidenceRefs || fields.some((item) => typeof item !== "string" || !item.trim())) return undefined;
  return { commonPatterns, differences, strongestHook: fields[0] as string, strongestFormat: fields[1] as string, strongestPayoff: fields[2] as string, mostRemixableStructure: fields[3] as string, emergingVariation: fields[4] as string, evidenceRefs };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json<CompareResponse>({ status: "unavailable", mode: "unavailable", message: "AI analysis unavailable · Authentication configuration missing." });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json<CompareResponse>({ status: "error", mode: "unavailable", message: "Comparison request was not valid JSON." }, { status: 400 }); }
  if (!isRecord(body) || !Array.isArray(body.trends) || body.trends.length < 2 || body.trends.length > 5) return NextResponse.json<CompareResponse>({ status: "error", mode: "unavailable", message: "Select 2-5 Shorts to compare." }, { status: 400 });
  const trends = body.trends as Trend[];
  const evidence = trends.map((trend) => ({ id: trend.representative.id, title: trend.representative.title, channel: trend.representative.channel, publishedAt: trend.representative.publishedAt, views: trend.representative.views, likes: trend.representative.likes, comments: trend.representative.comments, url: trend.representative.url, metrics: trend.metrics, relatedTitles: trend.relatedShorts.map((short) => short.title) }));
  const prompt = [
    "You are MOMENTUM comparing observed YouTube Shorts.",
    "Use only supplied evidence. Never invent timing, transcripts, metrics, or trend history.",
    "Identify reusable mechanics, not instructions to copy exact videos.",
    `Observed Shorts: ${JSON.stringify(evidence)}`,
  ].join("\n");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", input: prompt, text: { format: { type: "json_schema", name: "momentum_short_comparison", strict: true, schema: comparisonSchema } } }),
      signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) {
      const message = response.status === 401 || response.status === 403 ? "AI analysis unavailable · Authentication" : response.status === 429 ? "AI analysis unavailable · Quota or rate limit" : "AI analysis unavailable · Provider unavailable";
      return NextResponse.json<CompareResponse>({ status: "error", mode: "unavailable", message });
    }
    const result = (await response.json()) as OpenAIResponse;
    const outputText = extractOutputText(result);
    const comparison = outputText ? parseComparison(JSON.parse(outputText)) : undefined;
    if (!comparison) throw new Error("Invalid comparison output");
    return NextResponse.json<CompareResponse>({ status: "success", mode: "openai", comparison });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? "AI analysis unavailable · Timeout" : "AI analysis unavailable · Response validation";
    return NextResponse.json<CompareResponse>({ status: "error", mode: "unavailable", message });
  } finally {
    clearTimeout(timeout);
  }
}

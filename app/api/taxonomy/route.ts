import { NextResponse } from "next/server";

import type { TaxonomyResponse } from "@/lib/shorts/types";

const cache = new Map<string, readonly string[]>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractOutputText(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.output_text === "string") return value.output_text;
  if (!Array.isArray(value.output)) return undefined;
  for (const item of value.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") return content.text;
    }
  }
  return undefined;
}

function cleanList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 2).map((item) => item.trim().slice(0, 80)).slice(0, 8);
  return items.length >= 3 ? items : undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<TaxonomyResponse>({ status: "error", mode: "unavailable", message: "The taxonomy request was not valid JSON." }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.category !== "string" || typeof body.subcategory !== "string") {
    return NextResponse.json<TaxonomyResponse>({ status: "error", mode: "unavailable", message: "Choose a category and subcategory first." }, { status: 400 });
  }

  const category = body.category.trim().slice(0, 60);
  const subcategory = body.subcategory.trim().slice(0, 60);
  const cacheKey = `${category.toLowerCase()}::${subcategory.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json<TaxonomyResponse>({ status: "success", mode: "openai", subniches: cached, message: "Cached taxonomy suggestions." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json<TaxonomyResponse>({ status: "unavailable", mode: "unavailable", message: "AI taxonomy suggestions are unavailable. The curated taxonomy remains available." });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `Suggest 5 to 8 specific, current sub-niches for the technology creator intelligence category "${category}" and subcategory "${subcategory}". Return only concise noun phrases; do not invent metrics, events, or claims.`,
        max_output_tokens: 300,
        text: { format: { type: "json_schema", name: "taxonomy_suggestions", strict: true, schema: { type: "object", properties: { subniches: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 } }, required: ["subniches"], additionalProperties: false } } },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return NextResponse.json<TaxonomyResponse>({ status: "unavailable", mode: "unavailable", message: "AI taxonomy is temporarily unavailable. The curated taxonomy remains available." });
    const payload: unknown = await response.json();
    const text = extractOutputText(payload);
    if (!text) throw new Error("Missing taxonomy output");
    const parsed: unknown = JSON.parse(text);
    const subniches = isRecord(parsed) ? cleanList(parsed.subniches) : undefined;
    if (!subniches) throw new Error("Invalid taxonomy output");
    cache.set(cacheKey, subniches);
    return NextResponse.json<TaxonomyResponse>({ status: "success", mode: "openai", subniches, message: "AI taxonomy suggestions are ready." });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? "AI taxonomy timed out. The curated taxonomy remains available." : "AI taxonomy could not be validated. The curated taxonomy remains available.";
    return NextResponse.json<TaxonomyResponse>({ status: "unavailable", mode: "unavailable", message });
  } finally {
    clearTimeout(timeout);
  }
}

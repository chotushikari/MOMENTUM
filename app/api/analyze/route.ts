import { NextResponse } from "next/server";

import type {
  AnalysisRequest,
  AnalysisResponse,
  ContentDuration,
  ContentPlan,
  DistributionPlan,
  HookVariant,
  HookVariantType,
  PersonalizedOpportunity,
  TrendAnalysis,
} from "@/lib/shorts/types";

interface OpenAIResponse {
  output_text?: unknown;
  output?: unknown;
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "whyItWorks", "viralDna", "hookAnalysis", "contentStructure", "presentationStyle",
    "emotionalMechanics", "participationMechanics", "trendDna", "evolution", "state",
    "confidence", "evidenceNotes", "hooks", "opportunities", "contentPlan", "distribution",
  ],
  properties: {
    whyItWorks: { type: "string" },
    viralDna: {
      type: "object", additionalProperties: false,
      required: ["hook", "emotion", "format", "participation", "remixability", "culturalRelevance"],
      properties: {
        hook: { type: "string" }, emotion: { type: "string" }, format: { type: "string" },
        participation: { type: "string" }, remixability: { type: "string" }, culturalRelevance: { type: "string" },
      },
    },
    hookAnalysis: { type: "string" },
    contentStructure: {
      type: "object", additionalProperties: false,
      required: ["hook", "setup", "escalation", "payoff", "cta", "evidenceLimit"],
      properties: {
        hook: { type: "string" }, setup: { type: "string" }, escalation: { type: "string" },
        payoff: { type: "string" }, cta: { type: "string" }, evidenceLimit: { type: "string" },
      },
    },
    presentationStyle: { type: "string" },
    emotionalMechanics: { type: "string" },
    participationMechanics: { type: "string" },
    trendDna: {
      type: "object", additionalProperties: false,
      required: ["coreFormat", "emotionalDriver", "viewerPromise", "visualLanguage", "participationMechanism", "remixVectors"],
      properties: {
        coreFormat: { type: "string" }, emotionalDriver: { type: "string" }, viewerPromise: { type: "string" },
        visualLanguage: { type: "string" }, participationMechanism: { type: "string" },
        remixVectors: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
      },
    },
    evolution: {
      type: "object", additionalProperties: false,
      required: ["stage", "movement", "nextWatch"],
      properties: { stage: { type: "string" }, movement: { type: "string" }, nextWatch: { type: "string" } },
    },
    state: { type: "string", enum: ["viral", "emerging", "established", "fading", "unknown"] },
    confidence: { type: "string", enum: ["high", "medium", "low", "unavailable"] },
    evidenceNotes: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    hooks: {
      type: "array", minItems: 5, maxItems: 5, items: {
        type: "object", additionalProperties: false, required: ["id", "type", "label", "text", "rationale"],
        properties: {
          id: { type: "string" }, type: { type: "string", enum: ["curiosity", "challenge", "contrarian", "story", "surprise"] },
          label: { type: "string" }, text: { type: "string" }, rationale: { type: "string" },
        },
      },
    },
    opportunities: {
      type: "array", minItems: 3, maxItems: 5, items: {
        type: "object", additionalProperties: false,
        required: ["title", "rationale", "level", "trendConnection", "profileConnection", "drivers"],
        properties: {
          title: { type: "string" }, rationale: { type: "string" }, level: { type: "number", minimum: 1, maximum: 99 },
          trendConnection: { type: "string" }, profileConnection: { type: "string" },
          drivers: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
        },
      },
    },
    contentPlan: {
      type: "object", additionalProperties: false,
      required: ["concept", "hook", "firstThreeSeconds", "structure", "suggestedDuration", "shotList", "onScreenText", "voiceover", "cta", "title", "description", "hashtags", "keywords", "evidenceNote"],
      properties: {
        concept: { type: "string" }, hook: { type: "string" }, firstThreeSeconds: { type: "string" }, structure: { type: "string" },
        suggestedDuration: { type: "number", enum: [15, 30, 45, 60] }, shotList: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        onScreenText: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 }, voiceover: { type: "string" }, cta: { type: "string" },
        title: { type: "string" }, description: { type: "string" }, keywords: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
        evidenceNote: { type: "string" },
        hashtags: {
          type: "object", additionalProperties: false, required: ["primary", "topic", "format", "discovery"],
          properties: {
            primary: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            topic: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            format: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            discovery: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          },
        },
      },
    },
    distribution: {
      type: "object", additionalProperties: false, required: ["uploadWindow", "confidence", "basis", "hashtags", "title", "keywords"],
      properties: {
        uploadWindow: { type: "string" }, confidence: { type: "string", enum: ["high", "medium", "low", "unavailable"] }, basis: { type: "string" },
        title: { type: "string" }, keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 8 },
        hashtags: {
          type: "object", additionalProperties: false, required: ["primary", "topic", "format", "discovery"],
          properties: {
            primary: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }, topic: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
            format: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 }, discovery: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
          },
        },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown, max = 8): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.map(stringValue).filter((item): item is string => Boolean(item)).slice(0, max);
  return values.length ? values : undefined;
}

function extractOutputText(response: OpenAIResponse): string | undefined {
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
  if (!Array.isArray(response.output)) return undefined;
  for (const item of response.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string" && content.text.trim()) return content.text;
    }
  }
  return undefined;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === "string" && values.includes(value as T) ? value as T : undefined;
}

function parseHashtags(value: unknown): ContentPlan["hashtags"] | undefined {
  if (!isRecord(value)) return undefined;
  const primary = stringArray(value.primary, 4);
  const topic = stringArray(value.topic, 4);
  const format = stringArray(value.format, 4);
  const discovery = stringArray(value.discovery, 4);
  return primary && topic && format && discovery ? { primary, topic, format, discovery } : undefined;
}

function parseContentPlan(value: unknown): ContentPlan | undefined {
  if (!isRecord(value)) return undefined;
  const hashtags = parseHashtags(value.hashtags);
  const suggestedDuration = typeof value.suggestedDuration === "number" && [15, 30, 45, 60].includes(value.suggestedDuration) ? value.suggestedDuration as ContentDuration : undefined;
  const strings = ["concept", "hook", "firstThreeSeconds", "structure", "voiceover", "cta", "title", "description", "evidenceNote"].map((key) => stringValue(value[key]));
  const shotList = stringArray(value.shotList);
  const onScreenText = stringArray(value.onScreenText, 6);
  const keywords = stringArray(value.keywords);
  if (!hashtags || suggestedDuration === undefined || strings.some((item) => !item) || !shotList || !onScreenText || !keywords) return undefined;
  return {
    concept: strings[0] as string, hook: strings[1] as string, firstThreeSeconds: strings[2] as string, structure: strings[3] as string,
    suggestedDuration, shotList, onScreenText, voiceover: strings[4] as string, cta: strings[5] as string, title: strings[6] as string,
    description: strings[7] as string, hashtags, keywords, evidenceNote: strings[8] as string,
  };
}

function parseAnalysis(value: unknown): { analysis: TrendAnalysis; opportunities: readonly PersonalizedOpportunity[]; contentPlan: ContentPlan; hooks: readonly HookVariant[]; distribution: DistributionPlan } | undefined {
  if (!isRecord(value) || !isRecord(value.viralDna) || !isRecord(value.contentStructure) || !isRecord(value.trendDna) || !isRecord(value.evolution)) return undefined;
  const dna = value.viralDna;
  const structure = value.contentStructure;
  const trendDna = value.trendDna;
  const evolution = value.evolution;
  const whyItWorks = stringValue(value.whyItWorks);
  const dnaKeys = ["hook", "emotion", "format", "participation", "remixability", "culturalRelevance"];
  const dnaValues = dnaKeys.map((key) => stringValue(dna[key]));
  const structureValues = ["hook", "setup", "escalation", "payoff", "cta", "evidenceLimit"].map((key) => stringValue(structure[key]));
  const trendDnaValues = ["coreFormat", "emotionalDriver", "viewerPromise", "visualLanguage", "participationMechanism"].map((key) => stringValue(trendDna[key]));
  const evolutionValues = [stringValue(evolution.stage), stringValue(evolution.movement), stringValue(evolution.nextWatch)];
  const hookAnalysis = stringValue(value.hookAnalysis);
  const presentationStyle = stringValue(value.presentationStyle);
  const emotionalMechanics = stringValue(value.emotionalMechanics);
  const participationMechanics = stringValue(value.participationMechanics);
  const evidenceNotes = stringArray(value.evidenceNotes, 5);
  const remixVectors = stringArray(trendDna.remixVectors, 5);
  const trendState = enumValue(value.state, ["viral", "emerging", "established", "fading", "unknown"] as const);
  const confidence = enumValue(value.confidence, ["high", "medium", "low", "unavailable"] as const);
  const contentPlan = parseContentPlan(value.contentPlan);
  if (!whyItWorks || dnaValues.some((item) => !item) || structureValues.some((item) => !item) || trendDnaValues.some((item) => !item) || evolutionValues.some((item) => !item) || !hookAnalysis || !presentationStyle || !emotionalMechanics || !participationMechanics || !evidenceNotes || !remixVectors || !trendState || !confidence || !contentPlan) return undefined;

  const hooks = Array.isArray(value.hooks) ? value.hooks.map((item): HookVariant | undefined => {
    if (!isRecord(item)) return undefined;
    const id = stringValue(item.id); const label = stringValue(item.label); const text = stringValue(item.text); const rationale = stringValue(item.rationale);
    const type = enumValue(item.type, ["curiosity", "challenge", "contrarian", "story", "surprise"] as readonly HookVariantType[]);
    return id && label && text && rationale && type ? { id, label, text, rationale, type } : undefined;
  }).filter((item): item is HookVariant => Boolean(item)).slice(0, 5) : [];
  const opportunities = Array.isArray(value.opportunities) ? value.opportunities.map((item, index): PersonalizedOpportunity | undefined => {
    if (!isRecord(item)) return undefined;
    const title = stringValue(item.title); const rationale = stringValue(item.rationale); const trendConnection = stringValue(item.trendConnection); const profileConnection = stringValue(item.profileConnection);
    const level = typeof item.level === "number" ? Math.min(99, Math.max(1, Math.round(item.level))) : undefined; const drivers = stringArray(item.drivers, 5);
    return title && rationale && trendConnection && profileConnection && level !== undefined && drivers ? { id: `generated-opportunity-${index + 1}`, title, rationale, level, levelLabel: level >= 85 ? "High Opportunity" : level >= 70 ? "Promising Opportunity" : "Worth Watching", profile: "just-exploring", trendConnection, profileConnection, drivers } : undefined;
  }).filter((item): item is PersonalizedOpportunity => Boolean(item)).slice(0, 5) : [];
  if (hooks.length !== 5 || opportunities.length < 3) return undefined;
  const distributionValue = isRecord(value.distribution) ? value.distribution : undefined;
  const distributionHashtags = distributionValue ? parseHashtags(distributionValue.hashtags) : undefined;
  const distributionConfidence = distributionValue ? enumValue(distributionValue.confidence, ["high", "medium", "low", "unavailable"] as const) : undefined;
  const uploadWindow = distributionValue ? stringValue(distributionValue.uploadWindow) : undefined;
  const basis = distributionValue ? stringValue(distributionValue.basis) : undefined;
  const distributionTitle = distributionValue ? stringValue(distributionValue.title) : undefined;
  const distributionKeywords = distributionValue ? stringArray(distributionValue.keywords) : undefined;
  if (!distributionHashtags || !distributionConfidence || !uploadWindow || !basis || !distributionTitle || !distributionKeywords) return undefined;
  const distribution: DistributionPlan = { uploadWindow, confidence: distributionConfidence, basis, hashtags: distributionHashtags, title: distributionTitle, keywords: distributionKeywords };
  const analysis: TrendAnalysis = {
    mode: "openai", whyItWorks, viralDna: { hook: dnaValues[0] as string, emotion: dnaValues[1] as string, format: dnaValues[2] as string, participation: dnaValues[3] as string, remixability: dnaValues[4] as string, culturalRelevance: dnaValues[5] as string },
    hookAnalysis, contentStructure: { hook: structureValues[0] as string, setup: structureValues[1] as string, escalation: structureValues[2] as string, payoff: structureValues[3] as string, cta: structureValues[4] as string, evidenceLimit: structureValues[5] as string },
    presentationStyle, emotionalMechanics, participationMechanics, trendDna: { coreFormat: trendDnaValues[0] as string, emotionalDriver: trendDnaValues[1] as string, viewerPromise: trendDnaValues[2] as string, visualLanguage: trendDnaValues[3] as string, participationMechanism: trendDnaValues[4] as string, remixVectors },
    evolution: { stage: evolutionValues[0] as string, movement: evolutionValues[1] as string, nextWatch: evolutionValues[2] as string }, state: trendState, confidence, evidenceNotes, hooks, contentPlan, distribution, evidenceRefs: [],
  };
  return { analysis, opportunities, contentPlan, hooks, distribution };
}

function providerErrorMessage(status: number): string {
  if (status === 401 || status === 403) return "AI analysis unavailable · Authentication";
  if (status === 429) return "AI analysis unavailable · Quota or rate limit";
  return "AI analysis unavailable · Provider unavailable";
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json<AnalysisResponse>({ status: "unavailable", mode: "unavailable", message: "AI analysis unavailable · Authentication configuration missing. Observed YouTube data remains available." });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json<AnalysisResponse>({ status: "error", mode: "unavailable", message: "AI analysis unavailable · Invalid request" }, { status: 400 }); }
  if (!isRecord(body) || !isRecord(body.trend) || !isRecord(body.profile) || !isRecord(body.trend.representative) || !Array.isArray(body.trend.relatedShorts) || typeof body.profile.type !== "string" || typeof body.profile.label !== "string") {
    return NextResponse.json<AnalysisResponse>({ status: "error", mode: "unavailable", message: "Trend evidence and creator profile are required." }, { status: 400 });
  }
  const typedBody = body as unknown as AnalysisRequest;
  const evidence = [typedBody.trend.representative, ...typedBody.trend.relatedShorts].map((short) => ({ id: short.id, title: short.title, description: short.description, channel: short.channel, publishedAt: short.publishedAt, durationSeconds: short.durationSeconds, views: short.views, likes: short.likes, comments: short.comments, url: short.url }));
  const selectedOpportunity = typedBody.selectedOpportunity ? JSON.stringify({ title: typedBody.selectedOpportunity.title, trendConnection: typedBody.selectedOpportunity.trendConnection, profileConnection: typedBody.selectedOpportunity.profileConnection, drivers: typedBody.selectedOpportunity.drivers }) : "No opportunity selected yet.";
  const prompt = [
    "You are MOMENTUM, a grounded YouTube Shorts intelligence analyst and creator strategist.",
    "Use only supplied observed evidence. Never invent metrics, transcript facts, exact scene timing, cultural claims, or trend growth.",
    "Separate what is observed from what is derived and what is an interpretation. If transcript or timing evidence is unavailable, state the limitation in evidenceLimit and evidenceNotes.",
    "Analyze the reusable mechanics rather than encouraging an exact copy of the source video.",
    "Return the exact JSON schema. Generate five hook variants (curiosity, challenge, contrarian, story, surprise), 3-5 profile-specific opportunities, one content plan, and concise grouped hashtags.",
    `Selected creator profile: ${typedBody.profile.label} (${typedBody.profile.type}).`,
    `Selected opportunity: ${selectedOpportunity}`,
    `Requested content duration: ${typedBody.durationSeconds ?? 30} seconds.`,
    `Preferred hook variant: ${typedBody.hookVariantType ?? "curiosity"}.`,
    `Observed YouTube evidence: ${JSON.stringify(evidence)}`,
    `Derived application metrics (not historical growth): ${JSON.stringify(typedBody.trend.metrics)}`,
  ].join("\n");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini", input: prompt, text: { format: { type: "json_schema", name: "momentum_creator_intelligence", strict: true, schema: analysisSchema } } }),
      signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) return NextResponse.json<AnalysisResponse>({ status: "error", mode: "unavailable", message: providerErrorMessage(response.status) });
    const result = (await response.json()) as OpenAIResponse;
    const outputText = extractOutputText(result);
    if (!outputText) throw new Error("Missing structured output");
    const outputValue: unknown = JSON.parse(outputText);
    const parsed = parseAnalysis(outputValue);
    if (!parsed) throw new Error("Invalid structured output");
    parsed.analysis.evidenceRefs = evidence.map((item) => item.id);
    return NextResponse.json<AnalysisResponse>({ status: "success", mode: "openai", analysis: parsed.analysis, opportunities: parsed.opportunities.map((opportunity) => ({ ...opportunity, profile: typedBody.profile.type })), contentPlan: parsed.contentPlan, hooks: parsed.hooks, distribution: parsed.distribution });
  } catch (error) {
    const message = error instanceof DOMException && error.name === "AbortError" ? "AI analysis unavailable · Timeout" : "AI analysis unavailable · Response validation";
    return NextResponse.json<AnalysisResponse>({ status: "error", mode: "unavailable", message });
  } finally {
    clearTimeout(timeout);
  }
}

"use client";

import {
  Bookmark,
  CheckCircle2,
  Check,
  ChevronDown,
  CircleAlert,
  Clipboard,
  Clock3,
  ExternalLink,
  Filter,
  GitCompareArrows,
  Info,
  Layers3,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { defaultFilters, getSampleSnapshot } from "@/lib/shorts/sample";
import { personalizeOpportunities } from "@/lib/shorts/personalize";
import {
  discoveryModes,
  type AnalysisResponse,
  type ComparisonResult,
  type CompareResponse,
  type ContentPlan,
  type ContentDuration,
  contentDurations,
  type CreatorProfile,
  type DashboardSnapshot,
  type DiscoveryMode,
  type PersonalizedOpportunity,
  type ScanFilters,
  type ScanResponse,
  type Trend,
  type TrendAnalysis,
  type DistributionPlan,
  type HookResponse,
  type HookVariant,
  type HookVariantType,
} from "@/lib/shorts/types";

const regions = ["India", "United States", "United Kingdom", "Australia"] as const;
const categories = ["Food", "Travel", "Fitness", "Business", "Entertainment"] as const;
const niches = ["Street Food", "Budget Travel", "Home Workouts", "Creator Tools", "Local Culture"] as const;
const timeRanges = ["Last 6h", "Last 24h", "Last 7d"] as const;

const platformOptions = [
  { value: "youtube-shorts", label: "YouTube Shorts" },
  { value: "instagram-reels", label: "Instagram Reels — Coming Soon" },
  { value: "tiktok", label: "TikTok — Coming Soon" },
] as const;

const creatorProfiles: readonly CreatorProfile[] = [
  { type: "food-creator", label: "Food creator" },
  { type: "travel-creator", label: "Travel creator" },
  { type: "fitness-creator", label: "Fitness creator" },
  { type: "student", label: "Student" },
  { type: "business", label: "Business" },
  { type: "brand", label: "Brand" },
  { type: "influencer", label: "Influencer" },
  { type: "agency", label: "Agency" },
  { type: "just-exploring", label: "Just exploring" },
];

const modeCopy: Record<DiscoveryMode, { label: string; question: string }> = {
  "viral-now": { label: "Viral now", question: "What is already winning?" },
  emerging: { label: "Emerging", question: "What is gaining attention before saturation?" },
  "fastest-rising": { label: "Fastest rising", question: "What is accelerating fastest?" },
};

type ScanUiState = "preview" | "loading" | "success" | "notice";

function stringOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isScanResponse(value: unknown): value is ScanResponse {
  return isRecord(value) && typeof value.status === "string" && typeof value.mode === "string";
}

function isAnalysisResponse(value: unknown): value is AnalysisResponse {
  return isRecord(value) && typeof value.status === "string" && typeof value.mode === "string";
}

function isHookResponse(value: unknown): value is HookResponse {
  return isRecord(value) && typeof value.status === "string" && typeof value.mode === "string";
}

function isCompareResponse(value: unknown): value is CompareResponse {
  return isRecord(value) && typeof value.status === "string" && typeof value.mode === "string";
}

function formatMetric(value: number | undefined, suffix = ""): string {
  if (value === undefined || value <= 0) return "Unavailable";
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M${suffix}`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}K${suffix}`;
  return `${value.toLocaleString()}${suffix}`;
}

function score(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

function capitalize(value: string | undefined): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Unavailable";
}

const hookLabels: Record<HookVariantType, string> = {
  curiosity: "Curiosity",
  challenge: "Challenge",
  contrarian: "Contrarian",
  story: "Story",
  surprise: "Surprise",
};

function sampleHooks(trend: Trend): readonly HookVariant[] {
  const subject = trend.topic || trend.representative.title;
  return ([
    ["curiosity", `What happens when you turn ${subject.toLowerCase()} into a real constraint?`],
    ["challenge", `Can I make this ${subject.toLowerCase()} work in one take?`],
    ["contrarian", `The popular version of ${subject.toLowerCase()} misses one important thing.`],
    ["story", `I thought ${subject.toLowerCase()} would be simple. Then this changed the plan.`],
    ["surprise", `The last step is why this ${subject.toLowerCase()} keeps people watching.`],
  ] as const).map(([type, text], index) => ({
    id: `sample-hook-${index + 1}`,
    type,
    label: hookLabels[type],
    text,
    rationale: "Sample preview scaffold based on the observed title and format; validate the claim before publishing.",
  }));
}

function sampleContentPlan(trend: Trend, opportunity: PersonalizedOpportunity, duration: ContentDuration): ContentPlan {
  const subject = opportunity.title || trend.topic;
  return {
    concept: `${subject} with one visible constraint and a clear payoff.`,
    hook: `Can this ${trend.topic.toLowerCase()} actually work for someone starting from scratch?`,
    firstThreeSeconds: "Show the constraint, the first close-up, and the promise on screen before any setup.",
    structure: "Hook -> setup -> visible test -> escalation -> payoff -> invitation to try a variation.",
    suggestedDuration: duration,
    shotList: ["Open on the constraint or result", "Introduce the setup in one cut", "Show the first test", "Escalate with a visible comparison", "Land the payoff", "End with a specific variation prompt"],
    onScreenText: ["The constraint", "Watch the test", "Would you try this?"],
    voiceover: "Keep the narration observational and specific to what is visible. Do not state claims the source evidence cannot support.",
    cta: "Ask viewers for the next variation they would test.",
    title: subject,
    description: "A sample content plan derived from the observed format. Validate all factual details before publishing.",
    hashtags: { primary: ["#shorts"], topic: ["#creatorideas"], format: ["#challenge"], discovery: ["#howto"] },
    keywords: [trend.topic, "short form video", "creator idea", "content experiment"],
    evidenceNote: "Sample plan only. It is not an observed script, transcript, or timing claim.",
  };
}

function sampleDistribution(trend: Trend): DistributionPlan {
  return {
    uploadWindow: "Not enough evidence for a timing recommendation.",
    confidence: "unavailable",
    basis: "Sample preview has no reliable publication-history dataset.",
    hashtags: { primary: ["#shorts"], topic: ["#creatorideas"], format: ["#challenge"], discovery: ["#howto"] },
    title: trend.representative.title,
    keywords: [trend.topic, "short form video", "creator idea"],
  };
}

function sampleComparison(trends: readonly Trend[]): ComparisonResult {
  return {
    commonPatterns: ["Clear first-second promise", "Visible process or constraint", "Payoff that invites a viewer opinion"],
    differences: trends.slice(0, 3).map((trend) => `${trend.representative.title} uses a distinct topic surface and pacing cue.`),
    strongestHook: "The clearest constraint or question appears before the explanation.",
    strongestFormat: "A short test with visible progress and a final verdict.",
    strongestPayoff: "The payoff is easiest to understand when the result is shown, not only described.",
    mostRemixableStructure: "Swap the topic while keeping the promise, test, escalation, and verdict sequence.",
    emergingVariation: "Sample comparison only; no historical trend evolution is available.",
    evidenceRefs: trends.map((trend) => trend.representative.id),
  };
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 border-r border-[#ddd8cf] px-3 py-1 first:pl-0 last:border-r-0 lg:first:pl-3">
      <span className="block text-[9px] font-semibold tracking-[0.14em] text-[#8a8177]">{label}</span>
      <span className="relative mt-1 block">
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-full appearance-none bg-transparent pr-5 text-[13px] font-medium text-[#272521] outline-none focus-visible:text-[#bc553d]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1.5 size-3.5 text-[#8a8177]" aria-hidden="true" />
      </span>
    </label>
  );
}

function StatusBanner({ state, message }: { state: ScanUiState; message: string }) {
  const loading = state === "loading";
  const success = state === "success";
  return (
    <div
      className={`flex items-start gap-3 border px-4 py-3 text-[12px] leading-5 ${
        loading
          ? "border-[#e6c9a5] bg-[#fff8ed] text-[#7c5a32]"
          : success
            ? "border-[#c8d8cd] bg-[#f3f8f3] text-[#47654e]"
            : "border-[#ddd8cf] bg-[#fbfaf7] text-[#6d675f]"
      }`}
      role={loading ? "status" : state === "notice" ? "alert" : "note"}
    >
      {loading ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden="true" /> : success ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}

function TrendCard({ trend, compared, onSelect, onToggleCompare }: { trend: Trend; compared: boolean; onSelect: () => void; onToggleCompare: () => void }) {
  const short = trend.representative;
  return (
    <article className="group border-b border-[#ded9d1] bg-[#fbfaf7] transition-colors hover:bg-[#f8f4ed]">
      <button type="button" onClick={onSelect} className="grid w-full gap-4 p-4 text-left sm:grid-cols-[11rem_minmax(0,1fr)] sm:p-5 focus-visible:outline-none">
        <div className="relative aspect-video overflow-hidden bg-[#e4dfd5] sm:aspect-[16/10]">
          {/* YouTube owns the observed thumbnail URL; preserving it keeps the source visible. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={short.thumbnailUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
          <span className="absolute left-2 top-2 bg-[#242522]/90 px-1.5 py-1 text-[8px] font-semibold tracking-[0.12em] text-white">{short.mode === "live" ? "OBSERVED" : "SAMPLE"}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-semibold tracking-[0.13em] text-[#bc553d]">
            <span>{trend.category.toUpperCase()}</span>
            <span className="font-medium tracking-normal text-[#817a71]">{trend.metrics.freshness}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[18px] font-semibold leading-6 tracking-[-0.01em] text-[#292723]">{short.title}</h3>
          <p className="mt-1 text-[12px] text-[#777067]">{short.channel}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#e5e0d8] pt-3 text-[11px] text-[#6f685f]">
            <span>{formatMetric(short.views, " views")}</span>
            <span>{formatMetric(short.likes, " likes")}</span>
            <span>{formatMetric(short.comments, " comments")}</span>
          </div>
          <p className="mt-3 line-clamp-1 text-[12px] font-medium text-[#4c4841]">{trend.metrics.opportunity ? `${capitalize(trend.metrics.opportunity)} creator opportunity` : "Opportunity unavailable"} <span className="text-[#9a938a]">·</span> {trend.metrics.saturation === "unknown" ? "saturation unavailable" : `${capitalize(trend.metrics.saturation)} saturation`}</p>
        </div>
      </button>
      <div className="flex items-center gap-5 border-t border-[#e5e0d8] px-4 py-2.5 text-[10px] text-[#817a71] sm:px-5">
        <span><strong className="font-semibold text-[#4d4942]">Viral</strong> {score(trend.metrics.viralScore)}</span>
        <span><strong className="font-semibold text-[#4d4942]">Momentum</strong> {score(trend.metrics.momentum)}</span>
        <button type="button" aria-pressed={compared} aria-label={compared ? `Remove ${short.title} from comparison` : `Compare ${short.title}`} onClick={onToggleCompare} className={`ml-auto inline-flex items-center gap-1.5 border px-2 py-1 font-semibold ${compared ? "border-[#d6a896] bg-[#f9ebe5] text-[#9b4634]" : "border-transparent text-[#bc553d] hover:border-[#d6a896]"}`}><GitCompareArrows className="size-3" aria-hidden="true" />{compared ? "Comparing" : "Compare"}</button>
      </div>
    </article>
  );
}

function EvidenceRow({ trend }: { trend: Trend }) {
  const short = trend.representative;
  return (
    <div className="border-t border-[#e4dfd7] py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold tracking-[0.13em] text-[#bc553d]">OBSERVED YOUTUBE SHORT</p>
          <a href={short.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm font-semibold leading-5 text-[#2d2a26] hover:text-[#bc553d]">{short.title}</a>
          <p className="mt-1 text-[11px] text-[#777067]">{short.channel} · {short.publishedAt}</p>
        </div>
        <a href={short.url} target="_blank" rel="noreferrer" aria-label={`Open ${short.title} on YouTube`} className="shrink-0 text-[#bc553d] hover:text-[#873d2d]"><ExternalLink className="size-4" aria-hidden="true" /></a>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#6f685f]">
        <span>{formatMetric(short.views, " views")}</span>
        <span>{formatMetric(short.likes, " likes")}</span>
        <span>{formatMetric(short.comments, " comments")}</span>
        {short.durationSeconds !== undefined ? <span>{short.durationSeconds}s</span> : null}
      </div>
    </div>
  );
}

function DnaRow({ label, value }: { label: string; value: string }) {
  return <div className="border-t border-[#e4dfd7] py-3"><p className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">{label}</p><p className="mt-1 text-[12px] leading-5 text-[#4d4942]">{value}</p></div>;
}

function OpportunityCard({ opportunity, selected, onSelect }: { opportunity: PersonalizedOpportunity; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`border-t border-[#e4dfd7] py-4 ${selected ? "bg-[#fffaf5]" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={onSelect} aria-pressed={selected} className="text-left text-[15px] font-semibold leading-5 text-[#2d2a26] hover:text-[#bc553d]">{opportunity.title}</button>
        <div className="shrink-0 text-right"><p className="text-[9px] font-semibold tracking-[0.12em] text-[#bc553d]">OPPORTUNITY {opportunity.level}</p><p className="mt-1 text-[10px] text-[#817a71]">{opportunity.levelLabel}</p></div>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[#605a52]">{opportunity.rationale}</p>
      <p className="mt-2 text-[10px] leading-4 text-[#8a8177]">{opportunity.profileConnection ? `${opportunity.profileConnection} · ` : ""}Drivers: {opportunity.drivers.join(" · ")}</p>
    </article>
  );
}

function TrendDrawer({
  trend,
  profile,
  analysis,
  opportunities,
  contentPlan,
  hooks,
  distribution,
  selectedOpportunityId,
  durationSeconds,
  selectedHookId,
  hookMessage,
  generatingHooks,
  analysisMessage,
  analyzing,
  saved,
  onClose,
  onAnalyze,
  onProfileChange,
  onOpportunitySelect,
  onDurationChange,
  onGenerateHooks,
  onHookSelect,
  onToggleSaved,
}: {
  trend: Trend;
  profile: CreatorProfile;
  analysis: TrendAnalysis;
  opportunities: readonly PersonalizedOpportunity[];
  contentPlan?: ContentPlan;
  hooks: readonly HookVariant[];
  distribution?: DistributionPlan;
  selectedOpportunityId?: string;
  durationSeconds: ContentDuration;
  selectedHookId?: string;
  hookMessage?: string;
  generatingHooks: boolean;
  analysisMessage?: string;
  analyzing: boolean;
  saved: boolean;
  onClose: () => void;
  onAnalyze: () => void;
  onProfileChange: (profile: CreatorProfile) => void;
  onOpportunitySelect: (opportunity: PersonalizedOpportunity) => void;
  onDurationChange: (duration: ContentDuration) => void;
  onGenerateHooks: () => void;
  onHookSelect: (hook: HookVariant) => void;
  onToggleSaved: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const analysisUnavailable = analysis.mode === "unavailable";
  const [copiedLabel, setCopiedLabel] = useState<string>();
  const titleId = `trend-drawer-${trend.id}`;
  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(undefined), 1600);
    } catch {
      setCopiedLabel("Copy unavailable");
    }
  }
  return (
    <div className="fixed inset-0 z-50 bg-[#242522]/35" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-[#fbfaf7] shadow-2xl motion-safe:animate-[drawer-in_220ms_ease-out]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-4 border-b border-[#ddd8cf] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3"><span className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">TREND INTELLIGENCE</span><span className="text-[10px] text-[#8a8177]">{trend.representative.mode === "live" ? "Observed" : "Sample preview"}</span></div>
          <div className="flex items-center gap-2"><button type="button" aria-pressed={saved} aria-label={saved ? "Remove saved trend" : "Save trend"} onClick={onToggleSaved} className={`grid size-8 place-items-center border ${saved ? "border-[#d6a896] bg-[#f9ebe5] text-[#bc553d]" : "border-[#d8d2c9] text-[#777067] hover:text-[#bc553d]"}`}><Bookmark className="size-4" fill={saved ? "currentColor" : "none"} aria-hidden="true" /></button><button type="button" aria-label="Close trend intelligence" onClick={onClose} className="grid size-8 place-items-center border border-[#d8d2c9] text-[#777067] hover:text-[#2d2a26]"><X className="size-4" aria-hidden="true" /></button></div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-12 sm:px-7"><div className="sr-only" aria-live="polite">{copiedLabel}</div>
          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby={titleId}>
            <div className="relative aspect-[16/7] overflow-hidden bg-[#e4dfd5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trend.representative.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 bg-[#242522]/90 px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-white">{trend.representative.mode === "live" ? "OBSERVED" : "SAMPLE"}</span>
            </div>
            <p className="mt-5 text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">{trend.category.toUpperCase()}</p>
            <h2 id={titleId} className="mt-2 text-3xl font-semibold leading-9 tracking-[-0.025em] text-[#24221f]">{trend.representative.title}</h2>
            <p className="mt-2 text-sm text-[#777067]">{trend.representative.channel} · {trend.metrics.freshness}</p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#625c54]"><span><strong className="font-semibold text-[#2d2a26]">{formatMetric(trend.representative.views)}</strong> views</span><span><strong className="font-semibold text-[#2d2a26]">{formatMetric(trend.representative.likes)}</strong> likes</span><span><strong className="font-semibold text-[#2d2a26]">{formatMetric(trend.representative.comments)}</strong> comments</span><a href={trend.representative.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#bc553d]">Open Short <ExternalLink className="size-3" aria-hidden="true" /></a></div>
          </section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="why-working-heading">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">AI INTERPRETATION</p><h3 id="why-working-heading" className="mt-1 text-xl font-semibold">Why it&apos;s working</h3></div><span className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">{analysis.mode === "openai" ? "OPENAI" : analysis.mode === "sample" ? "SAMPLE" : "UNAVAILABLE"}</span></div>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-[#4d4942]">{analysis.whyItWorks}</p>
            {analysisUnavailable ? <div className="mt-4 border border-dashed border-[#d7c4b6] bg-[#fffaf5] p-4"><p className="text-[11px] leading-5 text-[#766453]">This live trend has observed evidence, but no validated interpretation yet.</p><button type="button" onClick={onAnalyze} disabled={analyzing} className="mt-3 inline-flex h-9 items-center gap-2 bg-[#242522] px-3 text-[11px] font-semibold text-white hover:bg-[#bc553d] disabled:cursor-wait disabled:opacity-60">{analyzing ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />} {analyzing ? "Analyzing" : "Run grounded analysis"}</button>{analysisMessage ? <p className="mt-2 text-[10px] leading-4 text-[#8a8177]">{analysisMessage}</p> : null}</div> : null}
          </section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="viral-dna-heading"><div className="flex items-center justify-between gap-3"><h3 id="viral-dna-heading" className="text-xl font-semibold">Viral DNA</h3><span className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">INTERPRETATION</span></div><div className="mt-2 grid gap-x-6 sm:grid-cols-2"><DnaRow label="HOOK" value={analysis.viralDna.hook} /><DnaRow label="EMOTION" value={analysis.viralDna.emotion} /><DnaRow label="FORMAT" value={analysis.viralDna.format} /><DnaRow label="PARTICIPATION" value={analysis.viralDna.participation} /><DnaRow label="REMIXABILITY" value={analysis.viralDna.remixability} /><DnaRow label="CULTURAL RELEVANCE" value={analysis.viralDna.culturalRelevance} /></div></section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="mechanics-heading"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">MECHANICS</p><h3 id="mechanics-heading" className="mt-1 text-xl font-semibold">Why the format holds attention</h3></div><Layers3 className="size-4 text-[#bc553d]" aria-hidden="true" /></div><div className="mt-4 grid gap-x-6 sm:grid-cols-2"><DnaRow label="HOOK ANALYSIS" value={analysis.hookAnalysis ?? "Not available in this interpretation."} /><DnaRow label="PRESENTATION STYLE" value={analysis.presentationStyle ?? "Not available in this interpretation."} /><DnaRow label="EMOTIONAL MECHANICS" value={analysis.emotionalMechanics ?? "Not available in this interpretation."} /><DnaRow label="PARTICIPATION / REMIX" value={analysis.participationMechanics ?? "Not available in this interpretation."} /></div><div className="mt-4 border-l-2 border-[#d6a896] pl-4"><p className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">STRUCTURE</p>{analysis.contentStructure ? <div className="mt-2 grid gap-2 text-[12px] leading-5 text-[#4d4942] sm:grid-cols-2"><p><strong>Hook:</strong> {analysis.contentStructure.hook}</p><p><strong>Setup:</strong> {analysis.contentStructure.setup}</p><p><strong>Escalation:</strong> {analysis.contentStructure.escalation}</p><p><strong>Payoff:</strong> {analysis.contentStructure.payoff}</p><p><strong>CTA:</strong> {analysis.contentStructure.cta}</p><p><strong>Limit:</strong> {analysis.contentStructure.evidenceLimit}</p></div> : <p className="mt-2 text-[12px] text-[#766f66]">Structure inference is not available.</p>}</div></section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="trend-dna-heading"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">PATTERN ACROSS EVIDENCE</p><h3 id="trend-dna-heading" className="mt-1 text-xl font-semibold">Trend DNA</h3></div><span className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">AI INTERPRETATION</span></div>{analysis.trendDna ? <div className="mt-4 grid gap-x-6 sm:grid-cols-2"><DnaRow label="CORE FORMAT" value={analysis.trendDna.coreFormat} /><DnaRow label="VIEWER PROMISE" value={analysis.trendDna.viewerPromise} /><DnaRow label="EMOTIONAL DRIVER" value={analysis.trendDna.emotionalDriver} /><DnaRow label="VISUAL LANGUAGE" value={analysis.trendDna.visualLanguage} /><DnaRow label="PARTICIPATION" value={analysis.trendDna.participationMechanism} /><DnaRow label="REMIX VECTORS" value={analysis.trendDna.remixVectors.join(" · ")} /></div> : <p className="mt-3 text-[12px] leading-5 text-[#766f66]">Trend DNA needs a validated multi-Short interpretation.</p>}</section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="momentum-heading"><div className="flex items-end justify-between gap-4"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">DERIVED METRIC</p><h3 id="momentum-heading" className="mt-1 text-xl font-semibold">Momentum</h3></div><span className="text-3xl font-semibold text-[#bc553d]">{score(trend.metrics.momentum)}</span></div><div className="mt-4 h-1.5 bg-[#e4dfd7]"><div className="h-full bg-[#bc553d]" style={{ width: `${trend.metrics.momentum ?? 0}%` }} /></div><p className="mt-3 text-[11px] leading-5 text-[#766f66]">{trend.metrics.interpretationNote}</p><p className="mt-2 text-[10px] font-semibold tracking-[0.1em] text-[#8a8177]">{trend.metrics.momentumBasis === "cross-sectional" ? "CURRENT MOMENTUM ESTIMATE · HISTORICAL MOMENTUM UNAVAILABLE" : trend.metrics.momentumBasis.toUpperCase()}</p>{analysis.state ? <p className="mt-2 text-[10px] font-semibold tracking-[0.1em] text-[#bc553d]">TREND STATE · {analysis.state.toUpperCase()}</p> : null}</section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="evolution-heading"><h3 id="evolution-heading" className="text-xl font-semibold">Trend evolution</h3><div className="mt-3 space-y-3 border-l-2 border-[#d6a896] pl-4 text-[12px] leading-5 text-[#4d4942]"><p><strong className="font-semibold text-[#2d2a26]">Stage:</strong> {analysis.evolution.stage}</p><p><strong className="font-semibold text-[#2d2a26]">Movement:</strong> {analysis.evolution.movement}</p><p><strong className="font-semibold text-[#2d2a26]">Next watch:</strong> {analysis.evolution.nextWatch}</p></div></section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="opportunity-heading"><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">THE PAYOFF</p><h3 id="opportunity-heading" className="mt-1 text-xl font-semibold">What can I do with this?</h3><p className="mt-2 text-[12px] leading-5 text-[#766f66]">Your profile is context, not a promise. Each recommendation explains the observed fit.</p><div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3">{creatorProfiles.map((creatorProfile) => <button key={creatorProfile.type} type="button" aria-pressed={profile.type === creatorProfile.type} onClick={() => onProfileChange(creatorProfile)} className={`min-h-9 border px-2 text-left text-[11px] font-medium ${profile.type === creatorProfile.type ? "border-[#d6a896] bg-[#f9ebe5] text-[#9b4634]" : "border-[#ded9d1] text-[#625c54] hover:border-[#c3a99b]"}`}>{creatorProfile.label}{profile.type === creatorProfile.type ? <Check className="float-right mt-0.5 size-3" aria-hidden="true" /> : null}</button>)}</div>{opportunities.length ? <div className="mt-5">{opportunities.map((opportunity) => <OpportunityCard key={opportunity.id} opportunity={opportunity} selected={selectedOpportunityId === opportunity.id} onSelect={() => onOpportunitySelect(opportunity)} />)}</div> : <div className="mt-5 border border-dashed border-[#d7c4b6] bg-[#fffaf5] px-4 py-5 text-[12px] leading-5 text-[#766453]">Select a profile and run grounded analysis to generate opportunities from the observed evidence.</div>}</section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="build-heading"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">CREATE MODE</p><h3 id="build-heading" className="mt-1 text-xl font-semibold">Build this idea</h3></div><WandSparkles className="size-4 text-[#bc553d]" aria-hidden="true" /></div><p className="mt-2 text-[12px] leading-5 text-[#766f66]">A focused content plan for the selected opportunity. Sample plans are labeled; live plans require validated AI output.</p><div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Content duration">{contentDurations.map((duration) => <button key={duration} type="button" aria-pressed={durationSeconds === duration} onClick={() => onDurationChange(duration)} className={`h-8 border px-3 text-[11px] font-semibold ${durationSeconds === duration ? "border-[#bc553d] bg-[#f9ebe5] text-[#9b4634]" : "border-[#d8d2c9] text-[#6f685f] hover:border-[#c3a99b]"}`}>{duration}s</button>)}</div>{contentPlan ? <div className="mt-5 border border-[#d8d2c9] bg-[#fffdf9] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.12em] text-[#bc553d]">{trend.representative.mode === "sample" ? "SAMPLE PLAN" : "AI CONTENT PLAN"}</p><h4 className="mt-1 text-lg font-semibold">{contentPlan.concept}</h4></div><button type="button" aria-label="Copy content plan hook" onClick={() => copyText("Hook copied", contentPlan.hook)} className="grid size-8 place-items-center border border-[#d8d2c9] text-[#777067] hover:text-[#bc553d]"><Clipboard className="size-3.5" aria-hidden="true" /></button></div><div className="mt-4 grid gap-3 text-[12px] leading-5 text-[#4d4942] sm:grid-cols-2"><p><strong>Hook:</strong> {contentPlan.hook}</p><p><strong>First 3 seconds:</strong> {contentPlan.firstThreeSeconds}</p><p><strong>Structure:</strong> {contentPlan.structure}</p><p><strong>Suggested duration:</strong> {contentPlan.suggestedDuration}s</p><p><strong>CTA:</strong> {contentPlan.cta}</p><p><strong>Voiceover:</strong> {contentPlan.voiceover}</p></div><div className="mt-4 border-t border-[#e4dfd7] pt-3"><p className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">SHOT LIST</p><ul className="mt-2 grid gap-1 text-[12px] leading-5 text-[#4d4942] sm:grid-cols-2">{contentPlan.shotList.map((shot) => <li key={shot} className="flex gap-2"><CheckCircle2 className="mt-1 size-3 shrink-0 text-[#bc553d]" aria-hidden="true" />{shot}</li>)}</ul></div><div className="mt-4 border-t border-[#e4dfd7] pt-3 text-[11px] leading-5 text-[#766f66]">{contentPlan.evidenceNote}</div></div> : <div className="mt-5 border border-dashed border-[#d7c4b6] bg-[#fffaf5] px-4 py-5 text-[12px] leading-5 text-[#766453]">Run grounded analysis to build a plan from this live evidence. No AI content has been substituted.</div>}</section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="hooks-heading"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">HOOK GENERATOR</p><h3 id="hooks-heading" className="mt-1 text-xl font-semibold">Five ways in</h3></div><button type="button" onClick={onGenerateHooks} disabled={generatingHooks} className="inline-flex h-8 items-center gap-1.5 border border-[#d8d2c9] px-2.5 text-[10px] font-semibold text-[#6f685f] hover:border-[#bc553d] hover:text-[#bc553d] disabled:cursor-wait disabled:opacity-60">{generatingHooks ? <LoaderCircle className="size-3 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3" aria-hidden="true" />}{generatingHooks ? "Generating" : "Regenerate"}</button></div><p className="mt-2 text-[12px] leading-5 text-[#766f66]">Choose one angle without rebuilding the rest of the plan.</p>{hooks.length ? <div className="mt-4 space-y-2">{hooks.map((hook) => <button key={hook.id} type="button" aria-pressed={selectedHookId === hook.id} onClick={() => onHookSelect(hook)} className={`w-full border p-3 text-left ${selectedHookId === hook.id ? "border-[#d6a896] bg-[#fffaf5]" : "border-[#e4dfd7] hover:border-[#c3a99b]"}`}><span className="flex items-center justify-between gap-3"><span className="text-[9px] font-semibold tracking-[0.12em] text-[#bc553d]">{hookLabels[hook.type]}</span>{selectedHookId === hook.id ? <Check className="size-3.5 text-[#bc553d]" aria-hidden="true" /> : null}</span><span className="mt-1 block text-[13px] font-medium leading-5 text-[#2d2a26]">{hook.text}</span><span className="mt-1 block text-[10px] leading-4 text-[#817a71]">{hook.rationale}</span></button>)}</div> : <div className="mt-4 border border-dashed border-[#d7c4b6] bg-[#fffaf5] px-4 py-4 text-[12px] text-[#766453]">No validated hook variants yet.</div>}{hookMessage ? <p className="mt-3 text-[10px] leading-4 text-[#8a8177]">{hookMessage}</p> : null}</section>

          <section className="border-b border-[#ddd8cf] py-6" aria-labelledby="distribution-heading"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">DISTRIBUTION</p><h3 id="distribution-heading" className="mt-1 text-xl font-semibold">Package the idea</h3></div><Clock3 className="size-4 text-[#bc553d]" aria-hidden="true" /></div>{distribution ? <div className="mt-4 grid gap-x-6 sm:grid-cols-2"><DnaRow label="TITLE" value={distribution.title} /><DnaRow label="UPLOAD WINDOW" value={distribution.uploadWindow} /><DnaRow label="CONFIDENCE" value={distribution.confidence.toUpperCase()} /><DnaRow label="BASIS" value={distribution.basis} /><DnaRow label="HASHTAGS" value={[...distribution.hashtags.primary, ...distribution.hashtags.topic, ...distribution.hashtags.format, ...distribution.hashtags.discovery].join(" ")} /><DnaRow label="KEYWORDS" value={distribution.keywords.join(" · ")} /></div> : <p className="mt-3 text-[12px] leading-5 text-[#766f66]">Distribution suggestions are unavailable until the evidence is interpreted.</p>}</section>

          <section className="py-6" aria-labelledby="evidence-heading"><div className="flex items-center justify-between gap-3"><h3 id="evidence-heading" className="text-xl font-semibold">Evidence</h3><span className="text-[9px] font-semibold tracking-[0.12em] text-[#8a8177]">OBSERVED ONLY</span></div><EvidenceRow trend={trend} />{trend.relatedShorts.map((relatedTrend) => <EvidenceRow key={relatedTrend.id} trend={{ ...trend, representative: relatedTrend }} />)}</section>
        </div>
      </aside>
    </div>
  );
}

function ComparisonDrawer({ comparison, mode, onClose }: { comparison: ComparisonResult; mode: "sample" | "openai" | "unavailable"; onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = ""; };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 bg-[#242522]/35" onMouseDown={onClose}><aside role="dialog" aria-modal="true" aria-labelledby="comparison-heading" className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-[#fbfaf7] shadow-2xl motion-safe:animate-[drawer-in_220ms_ease-out]" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-center justify-between border-b border-[#ddd8cf] px-5 py-4 sm:px-7"><div><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">COMPARISON WORKSPACE</p><h2 id="comparison-heading" className="mt-1 text-xl font-semibold">What changes across these Shorts?</h2></div><button type="button" aria-label="Close comparison" onClick={onClose} className="grid size-8 place-items-center border border-[#d8d2c9] text-[#777067] hover:text-[#2d2a26]"><X className="size-4" aria-hidden="true" /></button></header><div className="min-h-0 flex-1 overflow-y-auto px-5 pb-12 sm:px-7"><div className="flex items-center gap-2 border-b border-[#ddd8cf] py-4 text-[10px] font-semibold tracking-[0.12em] text-[#8a8177]"><GitCompareArrows className="size-4 text-[#bc553d]" aria-hidden="true" />{mode === "sample" ? "SAMPLE COMPARISON" : mode === "openai" ? "OPENAI INTERPRETATION" : "AI UNAVAILABLE"}</div><section className="border-b border-[#ddd8cf] py-6"><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">COMMON PATTERNS</p><div className="mt-3 space-y-3">{comparison.commonPatterns.map((item) => <p key={item} className="border-l-2 border-[#d6a896] pl-3 text-[13px] leading-5 text-[#4d4942]">{item}</p>)}</div></section><section className="border-b border-[#ddd8cf] py-6"><p className="text-[9px] font-semibold tracking-[0.14em] text-[#bc553d]">DIFFERENCES</p><div className="mt-3 space-y-3">{comparison.differences.map((item) => <p key={item} className="border-l-2 border-[#d8d2c9] pl-3 text-[13px] leading-5 text-[#4d4942]">{item}</p>)}</div></section><section className="grid gap-x-6 sm:grid-cols-2"><DnaRow label="STRONGEST HOOK" value={comparison.strongestHook} /><DnaRow label="STRONGEST FORMAT" value={comparison.strongestFormat} /><DnaRow label="STRONGEST PAYOFF" value={comparison.strongestPayoff} /><DnaRow label="MOST REMIXABLE" value={comparison.mostRemixableStructure} /><DnaRow label="EMERGING VARIATION" value={comparison.emergingVariation} /><DnaRow label="EVIDENCE" value={`${comparison.evidenceRefs.length} observed Shorts supplied`} /></section></div></aside></div>;
}

function EmptyState({ status, onRetry }: { status?: ScanResponse["status"]; onRetry: () => void }) {
  const copy = status === "configuration"
    ? { title: "Live scanning is not configured", body: "Add the server-side YouTube key before requesting live Shorts. The sample preview is kept separate from this state.", action: "Try scan again" }
    : status === "rate-limited"
      ? { title: "YouTube quota is unavailable", body: "The live provider rejected this request because its quota is unavailable. No sample data was substituted.", action: "Try scan again" }
      : status === "error" || status === "degraded"
        ? { title: "The live scan did not complete", body: "MOMENTUM could not verify a usable live result for this request. Check the filters and try again.", action: "Try scan again" }
        : { title: "No Shorts in this lens", body: "This view has no verified results for the current filters. Widen the time range or choose another lens.", action: "Scan again" };
  return <div className="border border-dashed border-[#d5cfc6] bg-[#fbfaf7] px-6 py-14 text-center"><CircleAlert className="mx-auto size-5 text-[#bc553d]" aria-hidden="true" /><h3 className="mt-4 text-lg font-semibold text-[#2d2a26]">{copy.title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#766f66]">{copy.body}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex h-9 items-center gap-2 border border-[#c9b2a7] px-3 text-[11px] font-semibold text-[#9b4634] hover:bg-[#f9ebe5]"><Search className="size-3.5" aria-hidden="true" />{copy.action}</button></div>;
}

export function ShortsDashboard() {
  const [filters, setFilters] = useState<ScanFilters>(defaultFilters);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(() => getSampleSnapshot());
  const [samplePreview, setSamplePreview] = useState(true);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>("viral-now");
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [scanState, setScanState] = useState<ScanUiState>("preview");
  const [lastScanStatus, setLastScanStatus] = useState<ScanResponse["status"]>();
  const [scanMessage, setScanMessage] = useState("Sample preview only. Run Scan to request live YouTube Shorts from the server.");
  const [profile, setProfile] = useState<CreatorProfile>(creatorProfiles[creatorProfiles.length - 1]);
  const [analysisOverrides, setAnalysisOverrides] = useState<Record<string, TrendAnalysis>>({});
  const [opportunityOverrides, setOpportunityOverrides] = useState<Record<string, readonly PersonalizedOpportunity[]>>({});
  const [analysisMessages, setAnalysisMessages] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [savedIds, setSavedIds] = useState<readonly string[]>([]);
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<Record<string, string>>({});
  const [durationSeconds, setDurationSeconds] = useState<ContentDuration>(30);
  const [selectedHookIds, setSelectedHookIds] = useState<Record<string, string>>({});
  const [contentPlanOverrides, setContentPlanOverrides] = useState<Record<string, ContentPlan>>({});
  const [hookOverrides, setHookOverrides] = useState<Record<string, readonly HookVariant[]>>({});
  const [distributionOverrides, setDistributionOverrides] = useState<Record<string, DistributionPlan>>({});
  const [hookMessages, setHookMessages] = useState<Record<string, string>>({});
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [compareIds, setCompareIds] = useState<readonly string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult>();
  const [comparisonMode, setComparisonMode] = useState<"sample" | "openai" | "unavailable">("unavailable");
  const [comparisonMessage, setComparisonMessage] = useState<string>();
  const [comparing, setComparing] = useState(false);

  const displayedTrends = useMemo(() => {
    const trends = [...(snapshot?.trends ?? [])];
    if (discoveryMode === "fastest-rising") return trends.sort((a, b) => (b.metrics.momentum ?? -1) - (a.metrics.momentum ?? -1)).slice(0, 5);
    if (discoveryMode === "emerging") return trends.sort((a, b) => (b.metrics.opportunityScore ?? -1) - (a.metrics.opportunityScore ?? -1)).filter((trend) => trend.metrics.saturation !== "crowded").slice(0, 5);
    return trends.sort((a, b) => (b.metrics.viralScore ?? -1) - (a.metrics.viralScore ?? -1)).slice(0, 5);
  }, [discoveryMode, snapshot]);

  const selectedTrend = snapshot?.trends.find((trend) => trend.id === selectedTrendId);
  const selectedAnalysis = selectedTrend ? analysisOverrides[selectedTrend.id] ?? selectedTrend.analysis : undefined;
  const selectedOpportunities = selectedTrend && selectedAnalysis
    ? opportunityOverrides[selectedTrend.id] ?? personalizeOpportunities(selectedTrend, profile)
    : [];
  const selectedOpportunity = selectedOpportunities.find((opportunity) => opportunity.id === selectedOpportunityIds[selectedTrend?.id ?? ""]) ?? selectedOpportunities[0];
  const selectedContentPlan = selectedTrend && selectedOpportunity
    ? contentPlanOverrides[selectedTrend.id] ?? (selectedOpportunityIds[selectedTrend.id] ? undefined : selectedAnalysis?.contentPlan) ?? (selectedTrend.representative.mode === "sample" ? sampleContentPlan(selectedTrend, selectedOpportunity, durationSeconds) : undefined)
    : undefined;
  const selectedHooks = selectedTrend
    ? hookOverrides[selectedTrend.id] ?? selectedAnalysis?.hooks ?? (selectedTrend.representative.mode === "sample" ? sampleHooks(selectedTrend) : [])
    : [];
  const selectedDistribution = selectedTrend
    ? distributionOverrides[selectedTrend.id] ?? selectedAnalysis?.distribution ?? (selectedTrend.representative.mode === "sample" ? sampleDistribution(selectedTrend) : undefined)
    : undefined;
  const selectedHook = selectedHooks.find((hook) => hook.id === selectedHookIds[selectedTrend?.id ?? ""]) ?? selectedHooks[0];

  function updateFilter(key: keyof ScanFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function scan() {
    setSelectedTrendId(null);
    setSamplePreview(false);
    setSnapshot(null);
    setScanState("loading");
    setLastScanStatus(undefined);
    setScanMessage("Scanning the selected YouTube Shorts market…");
    const query = new URLSearchParams({ ...filters });
    try {
      const response = await fetch(`/api/scan?${query.toString()}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!isScanResponse(payload)) throw new Error("Invalid scan response");
      if (payload.snapshot) setSnapshot(payload.snapshot);
      setLastScanStatus(payload.status);
      setScanMessage(payload.message ?? (payload.status === "success" ? "Live results are ready." : "Live results were not returned."));
      setScanState(payload.status === "success" ? "success" : "notice");
    } catch {
      setLastScanStatus("error");
      setScanMessage("The live scan could not be completed. No sample data was substituted.");
      setScanState("notice");
    }
  }

  async function runAnalysis() {
    if (!selectedTrend) return;
    setAnalyzing(true);
    setAnalysisMessages((current) => ({ ...current, [selectedTrend.id]: "Sending only this Short and its observed evidence for validation…" }));
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trend: selectedTrend, profile, selectedOpportunity, durationSeconds, hookVariantType: selectedHook?.type ?? "curiosity" }) });
      const payload: unknown = await response.json();
      if (!isAnalysisResponse(payload)) throw new Error("Invalid analysis response");
      if (payload.analysis) setAnalysisOverrides((current) => ({ ...current, [selectedTrend.id]: payload.analysis as TrendAnalysis }));
      if (payload.opportunities) setOpportunityOverrides((current) => ({ ...current, [selectedTrend.id]: payload.opportunities as readonly PersonalizedOpportunity[] }));
      if (payload.contentPlan) setContentPlanOverrides((current) => ({ ...current, [selectedTrend.id]: payload.contentPlan as ContentPlan }));
      if (payload.hooks) setHookOverrides((current) => ({ ...current, [selectedTrend.id]: payload.hooks as readonly HookVariant[] }));
      if (payload.distribution) setDistributionOverrides((current) => ({ ...current, [selectedTrend.id]: payload.distribution as DistributionPlan }));
      setAnalysisMessages((current) => ({ ...current, [selectedTrend.id]: payload.message ?? "Grounded interpretation validated from the supplied evidence." }));
    } catch {
      setAnalysisMessages((current) => ({ ...current, [selectedTrend.id]: "Analysis is unavailable. Observed YouTube evidence remains available." }));
    } finally {
      setAnalyzing(false);
    }
  }

  async function regenerateHooks() {
    if (!selectedTrend) return;
    if (selectedTrend.representative.mode === "sample") {
      setHookOverrides((current) => ({ ...current, [selectedTrend.id]: sampleHooks(selectedTrend) }));
      setHookMessages((current) => ({ ...current, [selectedTrend.id]: "Sample hook set refreshed. This is not live AI output." }));
      return;
    }
    setGeneratingHooks(true);
    setHookMessages((current) => ({ ...current, [selectedTrend.id]: "Generating five grounded hook variants…" }));
    try {
      const response = await fetch("/api/hooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trend: selectedTrend, profile, opportunity: selectedOpportunity }) });
      const payload: unknown = await response.json();
      if (!isHookResponse(payload)) throw new Error("Invalid hook response");
      if (payload.hooks) setHookOverrides((current) => ({ ...current, [selectedTrend.id]: payload.hooks as readonly HookVariant[] }));
      setHookMessages((current) => ({ ...current, [selectedTrend.id]: payload.message ?? "Five grounded hook variants are ready." }));
    } catch {
      setHookMessages((current) => ({ ...current, [selectedTrend.id]: "AI analysis unavailable. Observed evidence remains available." }));
    } finally {
      setGeneratingHooks(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 5 ? [...current, id] : current);
    if (compareIds.length >= 5 && !compareIds.includes(id)) setComparisonMessage("Compare up to five Shorts at a time.");
  }

  async function runComparison() {
    const trends = (snapshot?.trends ?? []).filter((trend) => compareIds.includes(trend.id)).slice(0, 5);
    if (trends.length < 2) return;
    setComparing(true);
    setComparisonMessage(undefined);
    if (trends.every((trend) => trend.representative.mode === "sample")) {
      setComparison(sampleComparison(trends));
      setComparisonMode("sample");
      setComparing(false);
      return;
    }
    try {
      const response = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trends }) });
      const payload: unknown = await response.json();
      if (!isCompareResponse(payload)) throw new Error("Invalid comparison response");
      if (payload.comparison) setComparison(payload.comparison);
      setComparisonMode(payload.mode === "openai" ? "openai" : "unavailable");
      setComparisonMessage(payload.message);
    } catch {
      setComparisonMode("unavailable");
      setComparisonMessage("AI analysis unavailable. The selected Shorts remain available for individual inspection.");
    } finally {
      setComparing(false);
    }
  }

  function changeProfile(nextProfile: CreatorProfile) {
    setProfile(nextProfile);
    if (selectedTrend?.representative.mode === "live") {
      setOpportunityOverrides((current) => ({ ...current, [selectedTrend.id]: [] }));
    }
  }

  const topStatus = samplePreview ? "SAMPLE PREVIEW" : snapshot?.mode === "live" ? "LIVE YOUTUBE" : "LIVE SCAN";
  const hasResults = displayedTrends.length > 0;
  const emptyState = !hasResults && !samplePreview;

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#24221f]">
      <header className="border-b border-[#ddd8cf] bg-[#fbfaf7]">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 px-4 py-4 sm:px-7 lg:px-10">
          <div className="flex items-center gap-3"><div className="grid size-8 place-items-center bg-[#242522] text-[13px] font-semibold text-white">M</div><div><p className="text-[13px] font-semibold tracking-[0.16em] text-[#242522]">MOMENTUM</p><p className="text-[9px] font-medium tracking-[0.13em] text-[#817a71]">SHORT-FORM INTELLIGENCE</p></div></div>
          <div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-[#817a71] sm:inline-flex"><Video className="size-3.5 text-[#bc553d]" aria-hidden="true" /> YOUTUBE SHORTS</span><span className="border border-[#d8d2c9] px-2 py-1 text-[9px] font-semibold tracking-[0.11em] text-[#766f66]">{topStatus}</span></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1380px] px-4 pb-16 sm:px-7 lg:px-10">
        <section className="border-b border-[#d8d2c9] pb-8 pt-10 sm:pt-14" aria-labelledby="page-title">
          <div className="max-w-3xl"><p className="text-[10px] font-semibold tracking-[0.17em] text-[#bc553d]">MOMENTUM / SHORT-FORM INTELLIGENCE FOR YOUTUBE SHORTS</p><h1 id="page-title" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#24221f] sm:text-5xl">What&apos;s moving right now?</h1><p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#6f685f]">Scan a market, see what is already winning, and find the formats with room for your next move.</p></div>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="hidden flex-1 items-stretch border border-[#cfc7bc] bg-[#fbfaf7] lg:grid lg:grid-cols-5">
              <FilterSelect label="REGION" value={filters.region} options={stringOptions(regions)} onChange={(value) => updateFilter("region", value)} />
              <FilterSelect label="CATEGORY" value={filters.category} options={stringOptions(categories)} onChange={(value) => updateFilter("category", value)} />
              <FilterSelect label="NICHE" value={filters.niche} options={stringOptions(niches)} onChange={(value) => updateFilter("niche", value)} />
              <FilterSelect label="PLATFORM" value={filters.platform} options={platformOptions} onChange={(value) => updateFilter("platform", value)} />
              <FilterSelect label="TIME" value={filters.timeRange} options={stringOptions(timeRanges)} onChange={(value) => updateFilter("timeRange", value)} />
            </div>
            <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex h-12 items-center justify-center gap-2 border border-[#cfc7bc] bg-[#fbfaf7] px-4 text-sm font-semibold text-[#4b4740] lg:hidden"><Filter className="size-4 text-[#bc553d]" aria-hidden="true" />Filters<span className="text-[10px] font-normal text-[#817a71]">{filters.region} · {filters.category}</span></button>
            <button type="button" onClick={scan} disabled={scanState === "loading"} className="inline-flex h-12 items-center justify-center gap-2 bg-[#242522] px-7 text-sm font-semibold text-white hover:bg-[#bc553d] disabled:cursor-wait disabled:opacity-70"><Search className="size-4" aria-hidden="true" />{scanState === "loading" ? "Scanning" : "Scan"}<span className="hidden text-[10px] font-normal text-[#b7b4ae] sm:inline">↵</span></button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-[#8a8177]"><span className="h-1.5 w-1.5 bg-[#bc553d]" aria-hidden="true" />{samplePreview ? "Sample preview is separate from live YouTube results." : "Live scan requested. Observed source data and interpretation remain separate."}</div>
        </section>

        <div className="mt-4"><StatusBanner state={scanState} message={scanMessage} /></div>

        <section className="mt-10" aria-labelledby="discovery-heading">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[0.16em] text-[#bc553d]">DISCOVER</p><h2 id="discovery-heading" className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Three lenses on one market.</h2></div><p className="text-[10px] font-semibold tracking-[0.12em] text-[#8a8177]">{snapshot ? `${snapshot.trends.length} ${snapshot.mode === "live" ? "OBSERVED" : "SAMPLE"} SHORTS` : "NO LIVE RESULTS"}</p></div>
          <div className="mt-5 grid border-y border-[#d8d2c9] sm:grid-cols-3" role="tablist" aria-label="Discovery modes">
            {discoveryModes.map((mode) => <button key={mode} type="button" role="tab" aria-selected={discoveryMode === mode} onClick={() => { setDiscoveryMode(mode); setSelectedTrendId(null); }} className={`border-b-2 px-3 py-4 text-left transition-colors sm:px-5 ${discoveryMode === mode ? "border-[#bc553d] bg-[#fbfaf7]" : "border-transparent hover:bg-[#f8f4ed]"}`}><span className={`block text-sm font-semibold ${discoveryMode === mode ? "text-[#bc553d]" : "text-[#4b4740]"}`}>{modeCopy[mode].label}</span><span className="mt-1 block text-[11px] leading-4 text-[#817a71]">{modeCopy[mode].question}</span></button>)}
          </div>

          <div className="mt-6">
            {emptyState ? <EmptyState status={lastScanStatus} onRetry={scan} /> : hasResults ? <div className="divide-y divide-[#ded9d1] border-y border-[#ded9d1]">{displayedTrends.map((trend) => <TrendCard key={trend.id} trend={trend} compared={compareIds.includes(trend.id)} onSelect={() => setSelectedTrendId(trend.id)} onToggleCompare={() => toggleCompare(trend.id)} />)}</div> : <div className="border border-dashed border-[#d5cfc6] bg-[#fbfaf7] px-6 py-12 text-center"><TrendingUp className="mx-auto size-5 text-[#bc553d]" aria-hidden="true" /><h3 className="mt-3 text-lg font-semibold">Run a scan to populate this lens.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#766f66]">The sample preview above is intentionally separate from live requests.</p></div>}
          </div>
          {compareIds.length ? <div className="mt-4 flex flex-wrap items-center gap-3 border border-[#d8d2c9] bg-[#fbfaf7] px-4 py-3"><GitCompareArrows className="size-4 text-[#bc553d]" aria-hidden="true" /><span className="text-[12px] font-semibold text-[#4b4740]">{compareIds.length} selected for comparison</span><button type="button" onClick={runComparison} disabled={compareIds.length < 2 || comparing} className="ml-auto inline-flex h-8 items-center gap-2 bg-[#242522] px-3 text-[11px] font-semibold text-white hover:bg-[#bc553d] disabled:cursor-not-allowed disabled:opacity-50">{comparing ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <GitCompareArrows className="size-3.5" aria-hidden="true" />}{comparing ? "Comparing" : "Compare Shorts"}</button><button type="button" onClick={() => setCompareIds([])} className="text-[11px] font-semibold text-[#8a8177] hover:text-[#bc553d]">Clear</button>{comparisonMessage ? <p className="basis-full text-[10px] text-[#8a8177]">{comparisonMessage}</p> : null}</div> : null}
        </section>
      </div>

      {selectedTrend && selectedAnalysis ? <TrendDrawer trend={selectedTrend} profile={profile} analysis={selectedAnalysis} opportunities={selectedOpportunities} contentPlan={selectedContentPlan} hooks={selectedHooks} distribution={selectedDistribution} selectedOpportunityId={selectedOpportunity?.id} durationSeconds={durationSeconds} selectedHookId={selectedHook?.id} hookMessage={hookMessages[selectedTrend.id]} generatingHooks={generatingHooks} analysisMessage={analysisMessages[selectedTrend.id]} analyzing={analyzing} saved={savedIds.includes(selectedTrend.id)} onClose={() => setSelectedTrendId(null)} onAnalyze={runAnalysis} onProfileChange={changeProfile} onOpportunitySelect={(opportunity) => setSelectedOpportunityIds((current) => ({ ...current, [selectedTrend.id]: opportunity.id }))} onDurationChange={setDurationSeconds} onGenerateHooks={regenerateHooks} onHookSelect={(hook) => setSelectedHookIds((current) => ({ ...current, [selectedTrend.id]: hook.id }))} onToggleSaved={() => setSavedIds((current) => current.includes(selectedTrend.id) ? current.filter((id) => id !== selectedTrend.id) : [...current, selectedTrend.id])} /> : null}

      {comparison ? <ComparisonDrawer comparison={comparison} mode={comparisonMode} onClose={() => setComparison(undefined)} /> : null}

      {mobileFiltersOpen ? <div className="fixed inset-0 z-50 flex items-end bg-[#242522]/35 p-3 sm:items-center sm:justify-center" onMouseDown={() => setMobileFiltersOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="mobile-filters-heading" className="w-full max-w-lg border border-[#d8d2c9] bg-[#fbfaf7] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-semibold tracking-[0.15em] text-[#bc553d]">COMMAND FILTERS</p><h2 id="mobile-filters-heading" className="mt-1 text-xl font-semibold">Choose your market.</h2></div><button type="button" aria-label="Close filters" onClick={() => setMobileFiltersOpen(false)} className="grid size-8 place-items-center border border-[#d8d2c9] text-[#777067]"><X className="size-4" aria-hidden="true" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><FilterSelect label="REGION" value={filters.region} options={stringOptions(regions)} onChange={(value) => updateFilter("region", value)} /><FilterSelect label="CATEGORY" value={filters.category} options={stringOptions(categories)} onChange={(value) => updateFilter("category", value)} /><FilterSelect label="NICHE" value={filters.niche} options={stringOptions(niches)} onChange={(value) => updateFilter("niche", value)} /><FilterSelect label="PLATFORM" value={filters.platform} options={platformOptions} onChange={(value) => updateFilter("platform", value)} /><FilterSelect label="TIME" value={filters.timeRange} options={stringOptions(timeRanges)} onChange={(value) => updateFilter("timeRange", value)} /></div><button type="button" onClick={() => setMobileFiltersOpen(false)} className="mt-6 h-11 w-full bg-[#242522] text-sm font-semibold text-white hover:bg-[#bc553d]">Apply filters</button></section></div> : null}
    </main>
  );
}

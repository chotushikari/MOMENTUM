import type {
  DashboardSnapshot,
  DerivedMetrics,
  HistoricalMetrics,
  HistoricalObservation,
  RetrievalMode,
  ScanDiagnostics,
  ScanFilters,
  ScanResponse,
  Short,
  Trend,
  TrendState,
  YouTubeSearchItem,
  YouTubeVideoItem,
} from "@/lib/shorts/types";

const searchEndpoint = "https://www.googleapis.com/youtube/v3/search";
const videosEndpoint = "https://www.googleapis.com/youtube/v3/videos";
const requestTimeoutMs = 8000;
const quotaBudgetUnits = 10000;
const maxSearchQueries = 3;
const maxPagesPerQuery = 2;
const maxPopularPages = 2;
const maxCandidates = 200;
const maxRepresentativeResults = 5;

const regionCodes: Record<string, string> = {
  India: "IN",
  "Delhi NCR": "IN",
  Mumbai: "IN",
  Bengaluru: "IN",
  Pune: "IN",
  Hyderabad: "IN",
  "United States": "US",
  "United Kingdom": "GB",
  Australia: "AU",
};

const stopWords = new Set([
  "about", "after", "again", "also", "been", "best", "from", "have", "into", "just", "like", "more", "only", "over", "that", "the", "this", "three", "top", "what", "when", "where", "with", "your",
]);

const observationStore = new Map<string, HistoricalObservation[]>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 30);
  return values.length ? values : undefined;
}

function isoDurationToSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function hoursSince(publishedAt: string): number | undefined {
  const timestamp = new Date(publishedAt).getTime();
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, (Date.now() - timestamp) / 3600000);
}

function freshnessLabel(publishedAt: string): string {
  const hours = hoursSince(publishedAt);
  if (hours === undefined) return "Freshness unavailable";
  if (hours < 1) return "Under 1h";
  if (hours < 24) return `${Math.round(hours)}h old`;
  return `${Math.round(hours / 24)}d old`;
}

function clamp(value: number, min = 0, max = 99): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function apiReason(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.error) || !Array.isArray(body.error.errors)) return undefined;
  const firstError = body.error.errors.find(isRecord);
  return firstError ? asString(firstError.reason) : undefined;
}

type YouTubeFailureKind = "rate-limited" | "timeout" | "network" | "malformed";

export class YouTubeRequestError extends Error {
  constructor(
    public readonly kind: YouTubeFailureKind,
    public readonly status?: number,
    public readonly reason?: string,
  ) {
    super("YouTube API request failed");
  }
}

interface RequestBudget {
  apiRequests: number;
  quotaUnits: number;
  openaiRequests: number;
  queriesExecuted: string[];
}

const queryExpansionCache = new Map<string, readonly string[]>();

async function fetchJson(url: string, budget: RequestBudget, quotaUnits: number): Promise<unknown> {
  if (budget.quotaUnits + quotaUnits > quotaBudgetUnits) throw new YouTubeRequestError("rate-limited", 429, "localQuotaBudget");
  budget.apiRequests += 1;
  budget.quotaUnits += quotaUnits;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new YouTubeRequestError("timeout");
      throw new YouTubeRequestError("network");
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new YouTubeRequestError("malformed", response.status);
    }

    if (!response.ok) {
      const reason = apiReason(body);
      const rateLimited = response.status === 403 || response.status === 429 || reason === "quotaExceeded";
      throw new YouTubeRequestError(rateLimited ? "rate-limited" : "network", response.status, reason);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function parseItems<T>(body: unknown, guard: (value: unknown) => value is T): readonly T[] | undefined {
  if (!isRecord(body) || !Array.isArray(body.items)) return undefined;
  return body.items.filter(guard);
}

function nextPageToken(body: unknown): string | undefined {
  return isRecord(body) ? asString(body.nextPageToken) : undefined;
}

function isSearchItem(value: unknown): value is YouTubeSearchItem {
  return isRecord(value);
}

function isVideoItem(value: unknown): value is YouTubeVideoItem {
  return isRecord(value);
}

function snippetFor(item: YouTubeVideoItem | undefined, fallback: YouTubeSearchItem["snippet"]): YouTubeVideoItem["snippet"] | undefined {
  return item?.snippet ?? fallback;
}

function normalizeVideo(item: YouTubeVideoItem, fallbackSnippet?: YouTubeSearchItem["snippet"]): Short | undefined {
  const videoId = asString(item.id);
  const snippet = snippetFor(item, fallbackSnippet);
  if (!videoId || !snippet) return undefined;

  const title = asString(snippet.title);
  const channel = asString(snippet.channelTitle);
  const publishedAt = asString(snippet.publishedAt);
  if (!title || !channel || !publishedAt) return undefined;

  const thumbnails = isRecord(snippet.thumbnails) ? snippet.thumbnails : undefined;
  const high = thumbnails && isRecord(thumbnails.high) ? asString(thumbnails.high.url) : undefined;
  const medium = thumbnails && isRecord(thumbnails.medium) ? asString(thumbnails.medium.url) : undefined;
  const fallback = thumbnails && isRecord(thumbnails.default) ? asString(thumbnails.default.url) : undefined;
  const details = item.contentDetails;
  const statistics = item.statistics;

  return {
    id: videoId,
    videoId,
    title,
    description: asString(snippet.description),
    channel,
    channelId: asString(snippet.channelId),
    categoryId: asString(snippet.categoryId),
    tags: asStringArray(snippet.tags),
    languageCode: asString(snippet.defaultLanguage) ?? asString(snippet.defaultAudioLanguage),
    captionAvailable: isRecord(details) ? asString(details.caption) === "true" : undefined,
    publishedAt,
    thumbnailUrl: high ?? medium ?? fallback ?? "",
    durationSeconds: isRecord(details) ? isoDurationToSeconds(asString(details.duration)) : undefined,
    views: asNumber(statistics && isRecord(statistics) ? statistics.viewCount : undefined),
    likes: asNumber(statistics && isRecord(statistics) ? statistics.likeCount : undefined),
    comments: asNumber(statistics && isRecord(statistics) ? statistics.commentCount : undefined),
    url: `https://www.youtube.com/shorts/${videoId}`,
    mode: "live",
  };
}

function timeRangeToDate(timeRange: string): string {
  const hours = timeRange === "Last 6h" ? 6 : timeRange === "Last 7d" ? 168 : 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function regionCodeFor(region: string): string {
  return regionCodes[region] ?? "IN";
}

function hasTargetedIntent(filters: ScanFilters): boolean {
  return Boolean(filters.query?.trim() || filters.subcategory?.trim() || filters.subNiche?.trim() || filters.niche?.trim());
}

function retrievalModeFor(filters: ScanFilters): RetrievalMode {
  return hasTargetedIntent(filters) ? "targeted" : "country-viral";
}

function uniqueQueries(filters: ScanFilters): readonly string[] {
  const queryParts = filters.query?.split(/[;,]/).map((value) => value.trim()).filter(Boolean) ?? [];
  const base = [filters.region, filters.category, filters.niche].filter(Boolean).join(" ").trim();
  const candidates = [...queryParts, base, [filters.region, filters.category].filter(Boolean).join(" "), [filters.region, filters.subcategory].filter(Boolean).join(" ")];
  return [...new Set(candidates.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))].slice(0, maxSearchQueries);
}

function outputText(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.output_text === "string" && value.output_text.trim()) return value.output_text;
  if (!Array.isArray(value.output)) return undefined;
  for (const item of value.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) if (isRecord(content) && typeof content.text === "string" && content.text.trim()) return content.text;
  }
  return undefined;
}

async function expandQueries(filters: ScanFilters, budget: RequestBudget): Promise<readonly string[]> {
  const fallback = uniqueQueries(filters);
  if (!filters.query?.trim() || !process.env.OPENAI_API_KEY) return fallback;
  const cacheKey = [filters.region, filters.category, filters.subcategory, filters.subNiche, filters.query].map((value) => (value ?? "").trim().toLowerCase()).join("::");
  const cached = queryExpansionCache.get(cacheKey);
  if (cached) return cached;

  budget.openaiRequests += 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: `Turn this creator discovery intent into at most three bounded YouTube search phrases. Return phrases only, no claims or metrics. Region: "${filters.region}". Category: "${filters.category}". Intent: "${filters.query}". Optional niche: "${filters.subNiche ?? filters.niche}".`,
        max_output_tokens: 180,
        text: { format: { type: "json_schema", name: "momentum_query_expansion", strict: true, schema: { type: "object", additionalProperties: false, required: ["queries"], properties: { queries: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } } } } } },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    const parsed: unknown = JSON.parse(outputText(await response.json()) ?? "{}");
    const aiQueries = isRecord(parsed) && Array.isArray(parsed.queries)
      ? parsed.queries.filter((item): item is string => typeof item === "string" && item.trim().length > 2).map((item) => item.replace(/\s+/g, " ").trim().slice(0, 80))
      : [];
    const queries = [...new Set([...aiQueries, ...fallback])].slice(0, maxSearchQueries);
    if (queries.length) queryExpansionCache.set(cacheKey, queries);
    return queries.length ? queries : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function titleTokens(short: Short): readonly string[] {
  return [...new Set(`${short.title} ${short.description ?? ""}`.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u0900-\u097f]+/gi, " ").split(" ").filter((token) => token.length > 3 && !stopWords.has(token)))].slice(0, 12);
}

interface ClusterBucket {
  tokens: Set<string>;
  shorts: Short[];
}

function overlapScore(left: readonly string[], right: Set<string>): number {
  return left.reduce((total, token) => total + (right.has(token) ? 1 : 0), 0);
}

function clusterShorts(shorts: readonly Short[]): readonly ClusterBucket[] {
  const buckets: ClusterBucket[] = [];
  for (const short of shorts) {
    const tokens = titleTokens(short);
    let best: ClusterBucket | undefined;
    let bestScore = 0;
    for (const bucket of buckets) {
      const score = overlapScore(tokens, bucket.tokens);
      if (score > bestScore) {
        best = bucket;
        bestScore = score;
      }
    }
    if (best && (bestScore >= 2 || buckets.length >= 8)) {
      best.shorts.push(short);
      tokens.forEach((token) => best?.tokens.add(token));
    } else if (buckets.length < 8) {
      buckets.push({ tokens: new Set(tokens), shorts: [short] });
    } else {
      const fallback = buckets.sort((left, right) => right.shorts.length - left.shorts.length)[0];
      fallback.shorts.push(short);
      tokens.forEach((token) => fallback.tokens.add(token));
    }
  }
  const meaningful = buckets.filter((bucket) => bucket.shorts.length > 1);
  if (meaningful.length > 0 && meaningful.length < buckets.length) {
    buckets.filter((bucket) => bucket.shorts.length === 1).forEach((singleton) => {
      const singletonTokens = [...singleton.tokens];
      const destination = meaningful.reduce((best, bucket) => overlapScore(singletonTokens, bucket.tokens) > overlapScore(singletonTokens, best.tokens) ? bucket : best, meaningful[0]);
      destination.shorts.push(singleton.shorts[0]);
      singleton.tokens.forEach((token) => destination.tokens.add(token));
    });
  }
  return (meaningful.length ? meaningful : buckets).filter((bucket) => bucket.shorts.length > 0).sort((left, right) => right.shorts.length - left.shorts.length);
}

function clusterLabel(bucket: ClusterBucket, filters: ScanFilters): string {
  const counts = new Map<string, number>();
  bucket.shorts.forEach((short) => titleTokens(short).forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1)));
  const topTerms = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).slice(0, 2).map(([token]) => token);
  return topTerms.length ? `${topTerms.join(" ")} pattern` : `${filters.category || "market"} pattern`;
}

function historicalMetrics(short: Short): HistoricalMetrics {
  const history = observationStore.get(short.videoId) ?? [];
  if (history.length < 1) return { observationCount: 0, direction: "unavailable" };
  const previous = history[history.length - 1];
  const currentViews = short.views;
  const previousViews = previous.views;
  const elapsedHours = Math.max(0.25, (Date.now() - new Date(previous.observedAt).getTime()) / 3600000);
  const viewsPerHour = currentViews !== undefined && previousViews !== undefined ? Math.max(0, (currentViews - previousViews) / elapsedHours) : undefined;
  const previousEngagement = previous.views && previous.views > 0 ? ((previous.likes ?? 0) + (previous.comments ?? 0)) / previous.views : undefined;
  const currentEngagement = currentViews && currentViews > 0 ? ((short.likes ?? 0) + (short.comments ?? 0)) / currentViews : undefined;
  const engagementVelocity = currentEngagement !== undefined && previousEngagement !== undefined ? (currentEngagement - previousEngagement) / elapsedHours : undefined;
  const prior = history.length > 1 ? history[history.length - 2] : undefined;
  const priorElapsedHours = prior ? Math.max(0.25, (new Date(previous.observedAt).getTime() - new Date(prior.observedAt).getTime()) / 3600000) : undefined;
  const priorViewsPerHour = prior && previousViews !== undefined && prior.views !== undefined && priorElapsedHours ? Math.max(0, (previousViews - prior.views) / priorElapsedHours) : undefined;
  const acceleration = viewsPerHour !== undefined && priorViewsPerHour !== undefined ? viewsPerHour - priorViewsPerHour : undefined;
  const direction = viewsPerHour === undefined ? "unavailable" : viewsPerHour > 1 && (acceleration === undefined || acceleration >= 0) ? "accelerating" : viewsPerHour < 0 || (acceleration !== undefined && acceleration < 0) ? "cooling" : "stable";
  return { observationCount: history.length, viewsPerHour, engagementVelocity, acceleration, direction };
}

function recordObservation(short: Short): void {
  const history = observationStore.get(short.videoId) ?? [];
  history.push({ videoId: short.videoId, observedAt: new Date().toISOString(), views: short.views, likes: short.likes, comments: short.comments });
  observationStore.set(short.videoId, history.slice(-8));
}

function scoreShort(short: Short, rank: number, total: number, historical: HistoricalMetrics): Pick<DerivedMetrics, "attention" | "viewsPerHour" | "engagementRate" | "commentsPerThousandViews" | "momentum" | "viralScore"> {
  const ageHours = hoursSince(short.publishedAt);
  const viewsPerHour = historical.viewsPerHour ?? (short.views !== undefined && ageHours !== undefined ? short.views / Math.max(1, ageHours) : undefined);
  const engagementRate = short.views && short.views > 0 ? ((short.likes ?? 0) + (short.comments ?? 0)) / short.views : undefined;
  const commentsPerThousandViews = short.views && short.views > 0 && short.comments !== undefined ? (short.comments / short.views) * 1000 : undefined;
  const rankScore = total > 1 ? ((total - rank) / (total - 1)) * 35 : 18;
  const attention = short.views !== undefined ? clamp(Math.log10(short.views + 1) * 7 + rankScore + (engagementRate ?? 0) * 450) : undefined;
  const velocityScore = viewsPerHour !== undefined ? Math.min(35, Math.log10(viewsPerHour + 1) * 7) : 0;
  const momentum = historical.observationCount > 0 && historical.direction !== "unavailable"
    ? clamp(50 + (historical.direction === "accelerating" ? 25 : historical.direction === "cooling" ? -20 : 0) + velocityScore)
    : attention;
  return { attention, viewsPerHour, engagementRate, commentsPerThousandViews, momentum, viralScore: attention };
}

function classifyState(attention: number | undefined, historical: HistoricalMetrics, density: number): TrendState {
  if (historical.observationCount > 0 && historical.direction === "accelerating") return "accelerating";
  if (historical.observationCount > 0 && historical.direction === "cooling") return "cooling";
  if (attention === undefined) return "unknown";
  if (attention >= 76) return "viral";
  if (density >= 0.08 || attention >= 58) return "emerging";
  return "established";
}

function buildTrend(bucket: ClusterBucket, index: number, allShorts: readonly Short[], filters: ScanFilters, scored: Map<string, DerivedMetrics>): Trend {
  const ranked = [...bucket.shorts].sort((left, right) => (scored.get(right.videoId)?.attention ?? -1) - (scored.get(left.videoId)?.attention ?? -1));
  const representative = ranked[0];
  const representativeMetrics = scored.get(representative.videoId) ?? { momentumBasis: "unavailable", freshness: "Freshness unavailable", saturation: "unknown", interpretationNote: "Insufficient observed fields for derived metrics." };
  const density = bucket.shorts.length / Math.max(1, allShorts.length);
  const clusterAttention = bucket.shorts.reduce((total, short) => total + (scored.get(short.videoId)?.attention ?? 0), 0) / Math.max(1, bucket.shorts.length);
  const historical = representativeMetrics.historical ?? { observationCount: 0, direction: "unavailable" as const };
  const state = classifyState(clusterAttention, historical, density);
  const saturationProxy = clamp(density * 500, 1, 99);
  const opportunityScore = clamp(clusterAttention + (saturationProxy < 30 ? 12 : saturationProxy < 60 ? 4 : -8));
  const saturation = saturationProxy >= 65 ? "crowded" : saturationProxy >= 35 ? "building" : "fresh";
  const opportunity = opportunityScore >= 82 ? "high" : opportunityScore >= 68 ? "promising" : "watch";
  const metrics: DerivedMetrics = {
    ...representativeMetrics,
    attention: clamp(clusterAttention),
    momentum: clamp(bucket.shorts.reduce((total, short) => total + (scored.get(short.videoId)?.momentum ?? 0), 0) / Math.max(1, bucket.shorts.length)),
    viralScore: clamp(clusterAttention),
    clusterSize: bucket.shorts.length,
    clusterDensity: density,
    saturationProxy,
    saturation,
    opportunity,
    opportunityScore,
    momentumBasis: historical.observationCount > 0 ? "historical" : "cross-sectional",
    interpretationNote: historical.observationCount > 0
      ? `Derived from ${bucket.shorts.length} Shorts and ${historical.observationCount} prior observation(s) for the representative. Historical movement is shown separately from current attention.`
      : `Derived from ${bucket.shorts.length} Shorts using current attention, freshness, engagement, result density, and views/hour proxy. Historical momentum is unavailable.`,
  };
  const relatedShorts = ranked.slice(1, maxRepresentativeResults);
  return {
    id: `youtube-cluster-${index + 1}-${representative.videoId}`,
    clusterId: `cluster-${index + 1}`,
    topic: clusterLabel(bucket, filters),
    category: filters.category || "All categories",
    representative,
    relatedShorts,
    metrics,
    analysis: {
      mode: "unavailable",
      state,
      confidence: "low",
      whyItWorks: "Cluster interpretation is available on request after the observed evidence is opened.",
      viralDna: {
        hook: "Open the signal to reveal an evidence-grounded hook pattern.",
        emotion: "Open the signal to reveal an evidence-grounded emotional driver.",
        format: "Open the signal to reveal the repeated format.",
        participation: "Open the signal to reveal participation patterns.",
        remixability: "Open the signal to reveal adaptation vectors.",
        culturalRelevance: "Open the signal to reveal supported context.",
      },
      evolution: {
        stage: state === "accelerating" ? "Accelerating" : state === "cooling" ? "Cooling" : state === "viral" ? "High current attention" : state === "emerging" ? "Emerging pattern" : "Established pattern",
        movement: historical.observationCount > 0 ? `Historical observation direction: ${historical.direction}.` : "Current movement is estimated cross-sectionally; historical observations are not yet available.",
        nextWatch: "Open the cluster for evidence and a grounded interpretation.",
      },
      evidenceRefs: [representative.id, ...relatedShorts.map((short) => short.id)],
    },
    opportunities: [],
  };
}

function scanDiagnostics(mode: RetrievalMode, budget: RequestBudget, candidatesRetrieved: number, candidatesRejected: number, shortsRetained: number, clustersGenerated: number, historicalObservations: number, representativeResults: number): ScanDiagnostics {
  return {
    retrievalMode: mode,
    queriesExecuted: budget.queriesExecuted,
    apiRequests: budget.apiRequests,
    quotaUnits: budget.quotaUnits,
    candidatesRetrieved,
    candidatesRejected,
    shortsRetained,
    clustersGenerated,
    openaiRequests: budget.openaiRequests,
    representativeResults,
    historicalObservations,
  };
}

function failureResponse(error: unknown, diagnostics?: ScanDiagnostics): ScanResponse {
  const base = diagnostics ? { diagnostics } : {};
  if (error instanceof YouTubeRequestError) {
    if (error.kind === "rate-limited") return { status: "rate-limited", mode: "live", message: "YouTube quota or rate limit reached. The bounded scan stopped before using more budget.", ...base };
    if (error.kind === "timeout") return { status: "error", mode: "live", message: "YouTube took too long to respond. Try the scan again.", ...base };
    if (error.kind === "malformed") return { status: "degraded", mode: "live", message: "YouTube returned a response MOMENTUM could not validate.", ...base };
  }
  return { status: "error", mode: "live", message: "YouTube could not be reached. Check the server configuration and try again.", ...base };
}

async function retrievePopular(filters: ScanFilters, budget: RequestBudget): Promise<{ videos: readonly YouTubeVideoItem[]; candidatesRetrieved: number }> {
  const videos = new Map<string, YouTubeVideoItem>();
  let pageToken: string | undefined;
  for (let page = 0; page < maxPopularPages && videos.size < maxCandidates; page += 1) {
    const params: Record<string, string> = {
      key: process.env.YOUTUBE_API_KEY ?? "",
      part: "snippet,contentDetails,statistics",
      chart: "mostPopular",
      maxResults: "50",
      regionCode: regionCodeFor(filters.region),
    };
    if (pageToken) params.pageToken = pageToken;
    if (filters.category && /^\d+$/.test(filters.category)) params.videoCategoryId = filters.category;
    budget.queriesExecuted.push(`${filters.region || "country"}:mostPopular`);
    const body = await fetchJson(buildUrl(videosEndpoint, params), budget, 1);
    const items = parseItems(body, isVideoItem);
    if (!items) throw new YouTubeRequestError("malformed");
    items.forEach((item) => {
      const id = asString(item.id);
      if (id && videos.size < maxCandidates) videos.set(id, item);
    });
    pageToken = nextPageToken(body);
    if (!pageToken || !items.length) break;
  }
  return { videos: [...videos.values()], candidatesRetrieved: videos.size };
}

async function retrieveTargeted(filters: ScanFilters, budget: RequestBudget): Promise<{ candidates: readonly { videoId: string; snippet?: YouTubeSearchItem["snippet"] }[]; candidatesRetrieved: number }> {
  const candidates = new Map<string, { videoId: string; snippet?: YouTubeSearchItem["snippet"] }>();
  const queries = await expandQueries(filters, budget);
  for (const query of queries) {
    let pageToken: string | undefined;
    for (let page = 0; page < maxPagesPerQuery && candidates.size < maxCandidates; page += 1) {
      const params: Record<string, string> = {
        key: process.env.YOUTUBE_API_KEY ?? "",
        part: "snippet",
        type: "video",
        videoDuration: "short",
        order: "viewCount",
        maxResults: "50",
        q: query,
        regionCode: regionCodeFor(filters.region),
        publishedAfter: timeRangeToDate(filters.timeRange),
      };
      if (filters.language) params.relevanceLanguage = filters.language;
      if (pageToken) params.pageToken = pageToken;
      budget.queriesExecuted.push(query);
      const body = await fetchJson(buildUrl(searchEndpoint, params), budget, 100);
      const items = parseItems(body, isSearchItem);
      if (!items) throw new YouTubeRequestError("malformed");
      items.forEach((item) => {
        const videoId = isRecord(item.id) ? asString(item.id.videoId) : undefined;
        if (videoId && candidates.size < maxCandidates) candidates.set(videoId, { videoId, snippet: item.snippet });
      });
      pageToken = nextPageToken(body);
      if (!pageToken || !items.length) break;
    }
    if (candidates.size >= maxCandidates) break;
  }
  return { candidates: [...candidates.values()], candidatesRetrieved: candidates.size };
}

async function enrichTargeted(candidates: readonly { videoId: string; snippet?: YouTubeSearchItem["snippet"] }[], budget: RequestBudget): Promise<readonly YouTubeVideoItem[]> {
  const enriched = new Map<string, YouTubeVideoItem>();
  for (let index = 0; index < candidates.length; index += 50) {
    const ids = candidates.slice(index, index + 50).map((candidate) => candidate.videoId);
    const body = await fetchJson(buildUrl(videosEndpoint, { key: process.env.YOUTUBE_API_KEY ?? "", part: "snippet,contentDetails,statistics", id: ids.join(",") }), budget, 1);
    const items = parseItems(body, isVideoItem);
    if (!items) throw new YouTubeRequestError("malformed");
    items.forEach((item) => {
      const id = asString(item.id);
      if (id) enriched.set(id, item);
    });
  }
  return candidates.map((candidate) => {
    const details = enriched.get(candidate.videoId);
    return details ? { ...details, id: candidate.videoId, snippet: details.snippet ?? candidate.snippet } : { id: candidate.videoId, snippet: candidate.snippet };
  });
}

export async function scanYouTubeShorts(filters: ScanFilters): Promise<ScanResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { status: "configuration", mode: "live", message: "Live YouTube scanning is not configured on this server." };

  const mode = retrievalModeFor(filters);
  const budget: RequestBudget = { apiRequests: 0, quotaUnits: 0, openaiRequests: 0, queriesExecuted: [] };
  try {
    let candidateVideos: readonly YouTubeVideoItem[];
    let candidatesRetrieved: number;
    if (mode === "country-viral") {
      const popular = await retrievePopular(filters, budget);
      candidateVideos = popular.videos;
      candidatesRetrieved = popular.candidatesRetrieved;
    } else {
      const targeted = await retrieveTargeted(filters, budget);
      candidateVideos = await enrichTargeted(targeted.candidates, budget);
      candidatesRetrieved = targeted.candidatesRetrieved;
    }

    const normalized = candidateVideos.map((item) => normalizeVideo(item)).filter((short): short is Short => Boolean(short));
    const qualified = normalized.filter((short) => short.durationSeconds !== undefined && short.durationSeconds > 0 && short.durationSeconds <= 60);
    const rejected = candidatesRetrieved - qualified.length;
    if (!qualified.length) {
      const diagnostics = scanDiagnostics(mode, budget, candidatesRetrieved, rejected, 0, 0, 0, 0);
      return { status: "empty", mode: "live", diagnostics, message: "No results could be verified as YouTube Shorts under 60 seconds." };
    }

    const historicalById = new Map(qualified.map((short) => [short.videoId, historicalMetrics(short)] as const));
    const ranked = [...qualified].sort((left, right) => (right.views ?? -1) - (left.views ?? -1));
    const scored = new Map<string, DerivedMetrics>();
    ranked.forEach((short, index) => {
      const historical = historicalById.get(short.videoId) ?? { observationCount: 0, direction: "unavailable" as const };
      const base = scoreShort(short, index, ranked.length, historical);
      scored.set(short.videoId, {
        ...base,
        ageHours: hoursSince(short.publishedAt),
        historical,
        momentumBasis: historical.observationCount > 0 ? "historical" : "cross-sectional",
        freshness: freshnessLabel(short.publishedAt),
        saturation: "unknown",
        interpretationNote: "Candidate-level metrics are combined into a cluster before a trend is surfaced.",
      });
    });

    const clusters = clusterShorts(qualified);
    const trends = clusters
      .map((cluster, index) => buildTrend(cluster, index, qualified, filters, scored))
      .sort((left, right) => (right.metrics.opportunityScore ?? -1) - (left.metrics.opportunityScore ?? -1))
      .slice(0, maxRepresentativeResults);
    qualified.forEach(recordObservation);
    const historicalObservations = [...historicalById.values()].filter((metrics) => metrics.observationCount > 0).length;
    const diagnostics = scanDiagnostics(mode, budget, candidatesRetrieved, rejected, qualified.length, clusters.length, historicalObservations, trends.length);
    const snapshot: DashboardSnapshot = { mode: "live", generatedAt: new Date().toISOString(), filters, trends, diagnostics };
    return {
      status: "success",
      mode: "live",
      snapshot,
      diagnostics,
      message: `${qualified.length} Shorts analyzed across ${clusters.length} detected patterns. Showing ${trends.length} worth your attention.`,
    };
  } catch (error) {
    return failureResponse(error, scanDiagnostics(mode, budget, 0, 0, 0, 0, 0, 0));
  }
}

import type {
  DashboardSnapshot,
  ScanFilters,
  ScanResponse,
  Short,
  Trend,
  YouTubeSearchItem,
  YouTubeVideoItem,
} from "@/lib/shorts/types";

const searchEndpoint = "https://www.googleapis.com/youtube/v3/search";
const videosEndpoint = "https://www.googleapis.com/youtube/v3/videos";
const requestTimeoutMs = 8000;

const regionCodes: Record<string, string> = {
  India: "IN",
  "United States": "US",
  "United Kingdom": "GB",
  Australia: "AU",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isoDurationToSeconds(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function timeRangeToDate(timeRange: string): string {
  const hours = timeRange === "Last 6h" ? 6 : timeRange === "Last 7d" ? 168 : 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildUrl(endpoint: string, params: Record<string, string>): string {
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function isSearchItem(value: unknown): value is YouTubeSearchItem {
  return isRecord(value);
}

function isVideoItem(value: unknown): value is YouTubeVideoItem {
  return isRecord(value);
}

function parseListResponse<T>(body: unknown, isItem: (value: unknown) => value is T): readonly T[] | undefined {
  if (!isRecord(body) || !Array.isArray(body.items)) return undefined;
  return body.items.filter(isItem);
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

async function fetchJson(url: string): Promise<unknown> {
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

function normalizeShort(searchItem: YouTubeSearchItem, videoItem: YouTubeVideoItem | undefined): Short | undefined {
  const videoId = isRecord(searchItem.id) ? asString(searchItem.id.videoId) : undefined;
  const snippet = isRecord(searchItem.snippet) ? searchItem.snippet : undefined;
  if (!videoId || !snippet) return undefined;

  const title = asString(snippet.title);
  const channel = asString(snippet.channelTitle);
  const publishedAt = asString(snippet.publishedAt);
  if (!title || !channel || !publishedAt) return undefined;

  const thumbnails = isRecord(snippet.thumbnails) ? snippet.thumbnails : undefined;
  const high = thumbnails && isRecord(thumbnails.high) ? asString(thumbnails.high.url) : undefined;
  const medium = thumbnails && isRecord(thumbnails.medium) ? asString(thumbnails.medium.url) : undefined;
  const fallback = thumbnails && isRecord(thumbnails.default) ? asString(thumbnails.default.url) : undefined;
  const details = videoItem?.contentDetails;
  const statistics = videoItem?.statistics;

  return {
    id: videoId,
    videoId,
    title,
    description: asString(snippet.description),
    channel,
    channelId: asString(snippet.channelId),
    publishedAt,
    thumbnailUrl: high ?? medium ?? fallback ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    durationSeconds: isRecord(details) ? isoDurationToSeconds(asString(details.duration)) : undefined,
    views: asNumber(statistics && isRecord(statistics) ? statistics.viewCount : undefined),
    likes: asNumber(statistics && isRecord(statistics) ? statistics.likeCount : undefined),
    comments: asNumber(statistics && isRecord(statistics) ? statistics.commentCount : undefined),
    url: `https://www.youtube.com/shorts/${videoId}`,
    mode: "live",
  };
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

function toTrend(short: Short, rank: number, total: number, filters: ScanFilters): Trend {
  const hours = hoursSince(short.publishedAt);
  const views = short.views;
  const rankScore = total > 1 ? Math.round(((total - rank) / (total - 1)) * 24) : 12;
  const freshnessScore = hours === undefined ? 0 : Math.max(0, Math.round(24 - Math.min(hours, 24)));
  const scaleScore = views && views > 0 ? Math.min(18, Math.round(Math.log10(views + 1) * 2)) : 0;
  const engagementRate = views && views > 0 && (short.likes !== undefined || short.comments !== undefined)
    ? ((short.likes ?? 0) + (short.comments ?? 0)) / views
    : undefined;
  const engagementScore = engagementRate === undefined ? 0 : Math.min(18, Math.round(engagementRate * 1000));
  const viralScore = views === undefined ? undefined : Math.min(99, Math.max(1, 40 + rankScore + freshnessScore + scaleScore + engagementScore));
  const momentum = views === undefined || hours === undefined
    ? undefined
    : Math.min(99, Math.max(1, 38 + rankScore + Math.max(0, 24 - Math.round(Math.min(hours, 24))) + engagementScore));
  const saturation = momentum === undefined ? "unknown" : momentum >= 78 ? "fresh" : momentum >= 60 ? "building" : "crowded";
  const opportunityScore = momentum === undefined ? undefined : Math.min(99, Math.max(1, momentum + (saturation === "fresh" ? 8 : saturation === "building" ? 4 : -4)));
  const opportunity = opportunityScore === undefined ? undefined : opportunityScore >= 82 ? "high" : opportunityScore >= 68 ? "promising" : "watch";
  const metricInputs = [
    views === undefined ? "views unavailable" : "views",
    short.likes === undefined ? "likes unavailable" : "likes",
    short.comments === undefined ? "comments unavailable" : "comments",
    "publish freshness",
    "result rank",
  ];

  return {
    id: `youtube-${short.videoId}`,
    topic: short.title,
    category: filters.category,
    representative: short,
    relatedShorts: [],
    metrics: {
      viralScore,
      momentum,
      momentumBasis: momentum === undefined ? "unavailable" : "cross-sectional",
      freshness: freshnessLabel(short.publishedAt),
      saturation,
      opportunity,
      opportunityScore,
      interpretationNote: `Derived from ${metricInputs.join(", ")}. Historical growth is not available in this MVP, so Momentum is a cross-sectional proxy, not velocity over time.`,
    },
    analysis: {
      mode: "unavailable",
      whyItWorks: "Interpretation is unavailable until the server-side analysis provider is configured. The observed Short remains available below.",
      viralDna: {
        hook: "Unavailable without grounded analysis.",
        emotion: "Unavailable without grounded analysis.",
        format: "Unavailable without grounded analysis.",
        participation: "Unavailable without grounded analysis.",
        remixability: "Unavailable without grounded analysis.",
        culturalRelevance: "Unavailable without grounded analysis.",
      },
      evolution: {
        stage: "Observed item",
        movement: "Trend evolution requires interpretation across supplied evidence.",
        nextWatch: "Run analysis after configuring the server-side OpenAI key.",
      },
      evidenceRefs: [short.id],
    },
    opportunities: [],
  };
}

function failureResponse(error: unknown): ScanResponse {
  if (error instanceof YouTubeRequestError) {
    if (error.kind === "rate-limited") return { status: "rate-limited", mode: "live", message: "YouTube quota or rate limit reached. Wait before scanning again." };
    if (error.kind === "timeout") return { status: "error", mode: "live", message: "YouTube took too long to respond. Try the scan again." };
    if (error.kind === "malformed") return { status: "degraded", mode: "live", message: "YouTube returned a response MOMENTUM could not validate." };
  }
  return { status: "error", mode: "live", message: "YouTube could not be reached. Check the server configuration and try again." };
}

export async function scanYouTubeShorts(filters: ScanFilters): Promise<ScanResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { status: "configuration", mode: "live", message: "Live YouTube scanning is not configured on this server." };

  try {
    const query = [filters.category, filters.niche].filter(Boolean).join(" ");
    const searchUrl = buildUrl(searchEndpoint, {
      key: apiKey,
      part: "snippet",
      type: "video",
      videoDuration: "short",
      order: "viewCount",
      maxResults: "25",
      q: query || "YouTube Shorts",
      regionCode: regionCodes[filters.region] ?? "IN",
      publishedAfter: timeRangeToDate(filters.timeRange),
    });
    const searchBody = await fetchJson(searchUrl);
    const searchItems = parseListResponse(searchBody, isSearchItem);
    if (!searchItems) return { status: "degraded", mode: "live", message: "YouTube returned a malformed search response." };
    const videoIds = searchItems.map((item) => (isRecord(item.id) ? asString(item.id.videoId) : undefined)).filter((id): id is string => Boolean(id));
    if (!videoIds.length) return { status: "empty", mode: "live", message: "No YouTube Shorts matched these filters." };

    let videoItems: readonly YouTubeVideoItem[] = [];
    let detailFailure: unknown;
    try {
      const detailsUrl = buildUrl(videosEndpoint, { key: apiKey, part: "contentDetails,statistics", id: videoIds.join(",") });
      const detailsBody = await fetchJson(detailsUrl);
      videoItems = parseListResponse(detailsBody, isVideoItem) ?? [];
      if (!videoItems.length) detailFailure = new YouTubeRequestError("malformed");
    } catch (error) {
      detailFailure = error;
    }

    const details = new Map(videoItems.map((item) => [asString(item.id), item] as const).filter(([id]) => Boolean(id)));
    const shorts = searchItems
      .map((item) => {
        const id = isRecord(item.id) ? asString(item.id.videoId) : undefined;
        return normalizeShort(item, id ? details.get(id) : undefined);
      })
      .filter((short): short is Short => Boolean(short))
      .filter((short) => short.durationSeconds !== undefined && short.durationSeconds <= 60);

    if (!shorts.length) {
      if (detailFailure) return failureResponse(detailFailure);
      return { status: "empty", mode: "live", message: "No results could be verified as YouTube Shorts under 60 seconds." };
    }

    const trends = shorts.map((short, index) => toTrend(short, index, shorts.length, filters));
    const snapshot: DashboardSnapshot = { mode: "live", generatedAt: new Date().toISOString(), filters, trends };
    return {
      status: detailFailure ? "degraded" : "success",
      mode: "live",
      snapshot,
      message: detailFailure ? "Some YouTube metadata could not be loaded. Showing only Shorts with validated duration." : "Live YouTube Shorts normalized successfully.",
    };
  } catch (error) {
    return failureResponse(error);
  }
}

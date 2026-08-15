export const discoveryModes = ["viral-now", "emerging", "fastest-rising"] as const;
export const platformOptions = ["youtube-shorts", "instagram-reels", "tiktok"] as const;
export const creatorProfileTypes = [
  "food-creator",
  "travel-creator",
  "fitness-creator",
  "student",
  "business",
  "brand",
  "influencer",
  "agency",
  "just-exploring",
] as const;
export const hookVariantTypes = ["curiosity", "challenge", "contrarian", "story", "surprise"] as const;
export const contentDurations = [15, 30, 45, 60] as const;

export type DataMode = "sample" | "live";
export type DiscoveryMode = (typeof discoveryModes)[number];
export type Platform = (typeof platformOptions)[number];
export type CreatorProfileType = (typeof creatorProfileTypes)[number];
export type HookVariantType = (typeof hookVariantTypes)[number];
export type ContentDuration = (typeof contentDurations)[number];
export type OpportunityLevel = "high" | "promising" | "watch";
export type AnalysisMode = "sample" | "openai" | "unavailable";
export type TrendState = "viral" | "emerging" | "established" | "fading" | "unknown";
export type Confidence = "high" | "medium" | "low" | "unavailable";
export type ScanStatus =
  | "success"
  | "configuration"
  | "empty"
  | "error"
  | "rate-limited"
  | "degraded";

export interface ScanFilters {
  region: string;
  category: string;
  subcategory?: string;
  subNiche?: string;
  niche: string;
  platform: Platform;
  timeRange: string;
}

export interface Short {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  channel: string;
  channelId?: string;
  publishedAt: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  views?: number;
  likes?: number;
  comments?: number;
  url: string;
  mode: DataMode;
}

export interface HistoricalObservation {
  videoId: string;
  observedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
}

export interface DerivedMetrics {
  viralScore?: number;
  momentum?: number;
  momentumBasis: "historical" | "cross-sectional" | "unavailable";
  freshness: string;
  saturation: "fresh" | "building" | "crowded" | "unknown";
  opportunity?: OpportunityLevel;
  opportunityScore?: number;
  interpretationNote: string;
}

export interface ViralDna {
  hook: string;
  emotion: string;
  format: string;
  participation: string;
  remixability: string;
  culturalRelevance: string;
}

export interface TrendEvolution {
  stage: string;
  movement: string;
  nextWatch: string;
}

export interface VideoStructure {
  hook: string;
  setup: string;
  escalation: string;
  payoff: string;
  cta: string;
  evidenceLimit: string;
}

export interface TrendDna {
  coreFormat: string;
  emotionalDriver: string;
  viewerPromise: string;
  visualLanguage: string;
  participationMechanism: string;
  remixVectors: readonly string[];
}

export interface HookVariant {
  id: string;
  type: HookVariantType;
  label: string;
  text: string;
  rationale: string;
}

export interface ContentPlan {
  concept: string;
  hook: string;
  firstThreeSeconds: string;
  structure: string;
  suggestedDuration: ContentDuration;
  shotList: readonly string[];
  onScreenText: readonly string[];
  voiceover: string;
  cta: string;
  title: string;
  description: string;
  hashtags: {
    primary: readonly string[];
    topic: readonly string[];
    format: readonly string[];
    discovery: readonly string[];
  };
  keywords: readonly string[];
  evidenceNote: string;
}

export interface DistributionPlan {
  uploadWindow: string;
  confidence: Confidence;
  basis: string;
  hashtags: ContentPlan["hashtags"];
  title: string;
  keywords: readonly string[];
}

export interface TrendAnalysis {
  mode: AnalysisMode;
  whyItWorks: string;
  viralDna: ViralDna;
  evolution: TrendEvolution;
  evidenceRefs: readonly string[];
  state?: TrendState;
  hookAnalysis?: string;
  contentStructure?: VideoStructure;
  presentationStyle?: string;
  emotionalMechanics?: string;
  participationMechanics?: string;
  trendDna?: TrendDna;
  confidence?: Confidence;
  evidenceNotes?: readonly string[];
  hooks?: readonly HookVariant[];
  contentPlan?: ContentPlan;
  distribution?: DistributionPlan;
}

export interface CreatorProfile {
  type: CreatorProfileType;
  label: string;
}

export interface PersonalizedOpportunity {
  id: string;
  title: string;
  rationale: string;
  level: number;
  levelLabel: string;
  profile: CreatorProfileType;
  trendConnection: string;
  drivers: readonly string[];
  profileConnection?: string;
}

export interface Trend {
  id: string;
  topic: string;
  category: string;
  representative: Short;
  relatedShorts: readonly Short[];
  metrics: DerivedMetrics;
  analysis: TrendAnalysis;
  opportunities: readonly PersonalizedOpportunity[];
}

export interface DashboardSnapshot {
  mode: DataMode;
  generatedAt: string;
  filters: ScanFilters;
  trends: readonly Trend[];
}

export interface ScanResponse {
  status: ScanStatus;
  mode: DataMode;
  snapshot?: DashboardSnapshot;
  message?: string;
}

export interface AnalysisRequest {
  trend: Trend;
  profile: CreatorProfile;
  selectedOpportunity?: PersonalizedOpportunity;
  durationSeconds?: ContentDuration;
  hookVariantType?: HookVariantType;
}

export interface AnalysisResponse {
  status: "success" | "unavailable" | "error";
  mode: AnalysisMode;
  analysis?: TrendAnalysis;
  opportunities?: readonly PersonalizedOpportunity[];
  contentPlan?: ContentPlan;
  hooks?: readonly HookVariant[];
  distribution?: DistributionPlan;
  message?: string;
}

export interface HookRequest {
  trend: Trend;
  profile: CreatorProfile;
  opportunity?: PersonalizedOpportunity;
}

export interface HookResponse {
  status: "success" | "unavailable" | "error";
  mode: AnalysisMode;
  hooks?: readonly HookVariant[];
  message?: string;
}

export interface ComparisonResult {
  commonPatterns: readonly string[];
  differences: readonly string[];
  strongestHook: string;
  strongestFormat: string;
  strongestPayoff: string;
  mostRemixableStructure: string;
  emergingVariation: string;
  evidenceRefs: readonly string[];
}

export interface CompareResponse {
  status: "success" | "unavailable" | "error";
  mode: AnalysisMode;
  comparison?: ComparisonResult;
  message?: string;
}

export interface TaxonomyResponse {
  status: "success" | "unavailable" | "error";
  mode: "openai" | "unavailable";
  subniches?: readonly string[];
  message?: string;
}

export interface YouTubeSearchItem {
  id?: { videoId?: unknown };
  snippet?: {
    title?: unknown;
    description?: unknown;
    channelTitle?: unknown;
    channelId?: unknown;
    publishedAt?: unknown;
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
      default?: { url?: unknown };
    };
  };
}

export interface YouTubeVideoItem {
  id?: unknown;
  contentDetails?: { duration?: unknown };
  statistics?: {
    viewCount?: unknown;
    likeCount?: unknown;
    commentCount?: unknown;
  };
}

export interface YouTubeListResponse<TItem> {
  items?: readonly TItem[];
  error?: { errors?: readonly { reason?: unknown }[] };
}

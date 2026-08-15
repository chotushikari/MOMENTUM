import type {
  DashboardSnapshot,
  PersonalizedOpportunity,
  ScanFilters,
  Trend,
} from "@/lib/shorts/types";

const sampleThumbnails = [
  "/demo-food.svg",
  "/demo-fitness.svg",
  "/demo-travel.svg",
  "/demo-home.svg",
] as const;

const baseOpportunities = (
  trendId: string,
  ideas: readonly [string, string, string],
): readonly PersonalizedOpportunity[] =>
  ideas.map((title, index) => ({
    id: `${trendId}-opportunity-${index + 1}`,
    title,
    rationale:
      "This angle keeps the observed format, adds a clear creator point of view, and leaves room for a practical variation.",
    level: 88 - index * 5,
    levelLabel: index === 0 ? "High Opportunity" : "Promising Opportunity",
    profile: "just-exploring",
    trendConnection: "Built from the sample trend's hook, pace, and visible participation pattern.",
    drivers: ["strong format match", "fresh angle", "easy to adapt"],
  }));

const makeShort = (input: {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnailUrl: string;
  views: number;
  likes: number;
  comments: number;
}): Trend["representative"] => ({
  ...input,
  videoId: input.id,
  url: `https://www.youtube.com/shorts/${input.id}`,
  mode: "sample",
});

const trendStreetFood: Trend = {
  id: "sample-street-food",
  topic: "₹100 street food challenge",
  category: "Food",
  representative: makeShort({
    id: "M7lc1UVf-VE",
    title: "The ₹100 Old Delhi food challenge",
    channel: "Sample creator channel",
    publishedAt: "Sample preview · 3h ago",
    thumbnailUrl: sampleThumbnails[0],
    views: 1840000,
    likes: 142000,
    comments: 3800,
  }),
  relatedShorts: [
    makeShort({
      id: "aqz-KE-bpKQ",
      title: "Can a tourist eat Delhi for ₹100?",
      channel: "Sample creator channel",
      publishedAt: "Sample preview · 7h ago",
      thumbnailUrl: sampleThumbnails[1],
      views: 920000,
      likes: 69000,
      comments: 1800,
    }),
  ],
  metrics: {
    viralScore: 91,
    momentum: 84,
    momentumBasis: "cross-sectional",
    freshness: "3h old",
    saturation: "building",
    opportunity: "high",
    interpretationNote: "Sample heuristic from views, freshness, and visible repeatability.",
  },
  analysis: {
    mode: "sample",
    whyItWorks:
      "The constraint is instantly legible, the price creates a reason to watch through, and the local context makes the format easy to debate or remake.",
    viralDna: {
      hook: "A hard ₹100 constraint gives the first second a clear promise.",
      emotion: "Curiosity and playful disbelief around what the budget can buy.",
      format: "Fast comparison with a visible running total and a final verdict.",
      participation: "Viewers can argue for their own stall, route, or budget.",
      remixability: "The budget and location can be swapped without changing the format.",
      culturalRelevance: "Local food discovery turns an everyday choice into a shared challenge.",
    },
    evolution: {
      stage: "Format is building",
      movement: "The constraint is repeating across locations while the local details keep changing.",
      nextWatch: "Watch whether creators add stronger proof, maps, or audience-submitted routes.",
    },
    evidenceRefs: ["M7lc1UVf-VE", "aqz-KE-bpKQ"],
  },
  opportunities: baseOpportunities("sample-street-food", [
    "Best street food in Old Delhi under ₹100",
    "Can a tourist eat Delhi for ₹100?",
    "₹100 vs ₹1,000 Delhi food challenge",
  ]),
};

const trendProteinSnack: Trend = {
  id: "sample-protein-snacks",
  topic: "high-protein snack swaps",
  category: "Food",
  representative: makeShort({
    id: "ScMzIvxBSi4",
    title: "Three high-protein snacks hiding in a regular kitchen",
    channel: "Sample nutrition creator",
    publishedAt: "Sample preview · 5h ago",
    thumbnailUrl: sampleThumbnails[2],
    views: 740000,
    likes: 51000,
    comments: 1200,
  }),
  relatedShorts: [],
  metrics: {
    viralScore: 76,
    momentum: 79,
    momentumBasis: "cross-sectional",
    freshness: "5h old",
    saturation: "fresh",
    opportunity: "high",
    interpretationNote: "Sample heuristic from freshness, repeatable format, and category fit.",
  },
  analysis: {
    mode: "sample",
    whyItWorks:
      "The promise is practical, the ingredients are familiar, and the short list format makes the idea easy to save and adapt.",
    viralDna: {
      hook: "A familiar pantry item reframed as a useful surprise.",
      emotion: "Recognition followed by a small, actionable discovery.",
      format: "Three-item countdown with close-up preparation shots.",
      participation: "People can contribute their own swap or disagree with the ranking.",
      remixability: "The same structure works for different budgets, diets, and kitchens.",
      culturalRelevance: "Affordable everyday food makes the advice feel immediately usable.",
    },
    evolution: {
      stage: "Early format cluster",
      movement: "The snack list is spreading through repeatable substitutions rather than one hero recipe.",
      nextWatch: "Watch for regional ingredients and stronger proof of nutrition claims.",
    },
    evidenceRefs: ["ScMzIvxBSi4"],
  },
  opportunities: baseOpportunities("sample-protein-snacks", [
    "The ₹50 high-protein snack test",
    "I replaced my usual snack for 7 days",
    "Three Indian protein swaps nobody tells you about",
  ]),
};

const trendOnePan: Trend = {
  id: "sample-one-pan",
  topic: "one-pan speed recipes",
  category: "Food",
  representative: makeShort({
    id: "dQw4w9WgXcQ",
    title: "The 10-minute one-pan dinner with one unexpected step",
    channel: "Sample home cooking channel",
    publishedAt: "Sample preview · 11h ago",
    thumbnailUrl: sampleThumbnails[3],
    views: 510000,
    likes: 33000,
    comments: 740,
  }),
  relatedShorts: [],
  metrics: {
    viralScore: 68,
    momentum: 61,
    momentumBasis: "cross-sectional",
    freshness: "11h old",
    saturation: "crowded",
    opportunity: "watch",
    interpretationNote: "Sample heuristic; high attention but a more crowded format.",
  },
  analysis: {
    mode: "sample",
    whyItWorks:
      "The time limit creates urgency and the one unexpected step gives viewers a reason to stay until the payoff.",
    viralDna: {
      hook: "A specific promise: dinner, one pan, ten minutes.",
      emotion: "Relief and anticipation around reducing everyday friction.",
      format: "Compressed process with a reveal at the final cut.",
      participation: "Viewers can test the time claim in their own kitchens.",
      remixability: "Ingredient, cuisine, and time limit are all easy to vary.",
      culturalRelevance: "Fast home cooking meets a universal need for simpler routines.",
    },
    evolution: {
      stage: "Established format",
      movement: "The format is familiar, so novelty now comes from constraints or credible proof.",
      nextWatch: "Look for creators adding cost, nutrition, or regional specificity.",
    },
    evidenceRefs: ["dQw4w9WgXcQ"],
  },
  opportunities: baseOpportunities("sample-one-pan", [
    "The one-pan dinner that survives a student kitchen",
    "I tested three 10-minute recipes with a real timer",
    "One-pan dinner: what the viral version leaves out",
  ]),
};

export const sampleTrends: readonly Trend[] = [trendStreetFood, trendProteinSnack, trendOnePan];

const demoThemes: Record<string, {
  topics: readonly [string, string, string];
  titles: readonly [string, string, string];
  format: string;
  hook: string;
  opportunity: readonly [string, string, string];
}> = {
  Travel: {
    topics: ["budget travel challenges", "tourist versus local formats", "weekend itinerary tests"],
    titles: ["Can you travel Delhi on ₹1,000?", "Tourist route versus local route", "The weekend trip with one bag"],
    format: "Visible constraint with a route, test, and final verdict.",
    hook: "Can you actually experience this place on a real budget?",
    opportunity: ["Turn a budget challenge into a local travel series", "Tourist versus local: the route nobody shows", "One-bag weekend trips from your city"],
  },
  Fitness: {
    topics: ["beginner strength tests", "small-space training", "simple nutrition swaps"],
    titles: ["The beginner gym plan I could repeat", "Can this workout fit in one room?", "Three protein swaps from a normal kitchen"],
    format: "A repeatable test with visible progress and a practical payoff.",
    hook: "Can a beginner actually stick with this for one week?",
    opportunity: ["Build a beginner-friendly strength series", "Test a workout in a real small space", "Simple swaps for a stronger daily routine"],
  },
  Business: {
    topics: ["creator workflow experiments", "small product launches", "audience research formats"],
    titles: ["I rebuilt my creator workflow in one afternoon", "The tiny product launch test", "Three audience questions that changed the idea"],
    format: "A constrained experiment that makes an invisible process visible.",
    hook: "What changes when you remove the part everyone assumes is necessary?",
    opportunity: ["Turn a workflow experiment into a weekly teardown", "Document a small product launch in public", "Make audience research a repeatable format"],
  },
  Entertainment: {
    topics: ["internet culture remixes", "short storytelling formats", "fast opinion formats"],
    titles: ["The internet remixed this in three different ways", "The reveal is hidden in the first line", "My honest ranking in 30 seconds"],
    format: "A familiar cultural cue with a fast reveal and a clear point of view.",
    hook: "Why does this version keep people watching to the end?",
    opportunity: ["Remix the format with a local point of view", "Build a short story around one sharp reveal", "Turn a fast opinion into a repeatable series"],
  },
};

function customizeDemoTrend(trend: Trend, index: number, category: string): Trend {
  const theme = demoThemes[category];
  if (!theme) return trend;
  const title = theme.titles[index] ?? theme.titles[0];
  return {
    ...trend,
    topic: theme.topics[index] ?? theme.topics[0],
    category,
    representative: { ...trend.representative, title, channel: `Sample ${category.toLowerCase()} creator` },
    analysis: {
      ...trend.analysis,
      whyItWorks: `The idea is easy to understand, gives the viewer a visible question, and leaves room for another creator to adapt the format.`,
      viralDna: { ...trend.analysis.viralDna, hook: theme.hook, format: theme.format, culturalRelevance: `The format connects to a familiar ${category.toLowerCase()} creator behavior without requiring a large production setup.` },
      evolution: { ...trend.analysis.evolution, movement: `The ${category.toLowerCase()} format is spreading through repeatable variations while the creator point of view changes.`, nextWatch: "Watch for sharper proof, stronger local detail, and audience-led variations." },
    },
    opportunities: baseOpportunities(`${trend.id}-${category.toLowerCase()}`, theme.opportunity),
  };
}

export const defaultFilters: ScanFilters = {
  region: "Delhi NCR",
  category: "Food",
  subcategory: "Street Food",
  subNiche: "Old Delhi food challenges",
  niche: "Street Food",
  platform: "youtube-shorts",
  timeRange: "Last 24h",
};

export function getSampleSnapshot(filters: ScanFilters = defaultFilters): DashboardSnapshot {
  return {
    mode: "sample",
    generatedAt: "Sample preview · not live YouTube data",
    filters,
    trends: sampleTrends.map((trend, index) => customizeDemoTrend(trend, index, filters.category)),
  };
}

import type {
  CreatorProfile,
  PersonalizedOpportunity,
  Trend,
} from "@/lib/shorts/types";

const scoreAdjustments: Record<CreatorProfile["type"], number> = {
  "food-creator": 5,
  "travel-creator": 4,
  "fitness-creator": 2,
  student: 1,
  business: -1,
  brand: 0,
  influencer: 3,
  agency: -2,
  "just-exploring": 0,
};

const titlePrefixes: Record<CreatorProfile["type"], string> = {
  "food-creator": "Creator angle",
  "travel-creator": "Travel angle",
  "fitness-creator": "Fitness angle",
  student: "Student angle",
  business: "Business angle",
  brand: "Brand angle",
  influencer: "Creator angle",
  agency: "Client angle",
  "just-exploring": "Explore angle",
};

export function personalizeOpportunities(
  trend: Trend,
  profile: CreatorProfile,
): readonly PersonalizedOpportunity[] {
  return trend.opportunities.map((opportunity) => {
    const level = Math.min(99, Math.max(1, opportunity.level + scoreAdjustments[profile.type]));
    return {
      ...opportunity,
      title:
        profile.type === "just-exploring"
          ? opportunity.title
          : `${titlePrefixes[profile.type]}: ${opportunity.title}`,
      level,
      levelLabel: level >= 85 ? "High Opportunity" : level >= 70 ? "Promising Opportunity" : "Worth Watching",
      profile: profile.type,
      rationale: `${opportunity.rationale} For a ${profile.label.toLowerCase()}, the strongest fit is the clear connection between the observed format and a specific point of view.`,
      trendConnection: `${opportunity.trendConnection} Profile context: ${profile.label}.`,
    };
  });
}

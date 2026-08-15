export interface TaxonomyBranch {
  subcategories: Record<string, readonly string[]>;
}

export const taxonomy: Record<string, TaxonomyBranch> = {
  Food: {
    subcategories: {
      "Street Food": ["Old Delhi food challenges", "Mumbai street food", "Regional food trails"],
      "Home Cooking": ["One-pan dinners", "Budget meal prep", "High-protein swaps"],
      "Food Business": ["Cafe concepts", "Food pop-ups", "Creator-led products"],
    },
  },
  Travel: {
    subcategories: {
      "Budget Travel": ["Weekend itineraries", "Local transport", "Affordable stays"],
      "City Guides": ["Hidden neighborhoods", "First-day routes", "Local food maps"],
      "Travel Gear": ["Carry-on systems", "Creator setups", "Useful travel tech"],
    },
  },
  Fitness: {
    subcategories: {
      "Home Workouts": ["No-equipment routines", "Small-space training", "Beginner strength"],
      "Nutrition": ["Protein habits", "Simple meal systems", "Grocery strategies"],
      "Training Stories": ["Progress experiments", "Form fixes", "Challenge formats"],
    },
  },
  Business: {
    subcategories: {
      "Creator Tools": ["AI workflows", "Editing systems", "Audience research"],
      "Startups": ["Product experiments", "Founder lessons", "Go-to-market"],
      "Career": ["Skill stacks", "Work systems", "Interview prep"],
    },
  },
  Entertainment: {
    subcategories: {
      "Internet Culture": ["Format remixes", "Meme mechanics", "Community moments"],
      "Storytelling": ["Short narratives", "Character hooks", "Unexpected reveals"],
      "Reviews": ["Fast opinions", "Rankings", "Explainers"],
    },
  },
};

export const taxonomyCategories = Object.keys(taxonomy);

export function getSubcategories(category: string): readonly string[] {
  return Object.keys(taxonomy[category]?.subcategories ?? {});
}

export function getSubniches(category: string, subcategory: string): readonly string[] {
  return taxonomy[category]?.subcategories[subcategory] ?? [];
}

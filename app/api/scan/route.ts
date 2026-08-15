import { NextResponse } from "next/server";

import { scanYouTubeShorts } from "@/lib/youtube/adapter";
import type { ScanFilters, Platform } from "@/lib/shorts/types";

const validPlatforms: readonly Platform[] = ["youtube-shorts", "instagram-reels", "tiktok"];

function textParam(value: string | null, fallback: string): string {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, 80) : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = textParam(url.searchParams.get("platform"), "youtube-shorts") as Platform;
  const filters: ScanFilters = {
    region: textParam(url.searchParams.get("region"), "Delhi NCR"),
    category: textParam(url.searchParams.get("category"), "Food"),
    query: textParam(url.searchParams.get("query"), ""),
    language: textParam(url.searchParams.get("language"), ""),
    subcategory: textParam(url.searchParams.get("subcategory"), ""),
    subNiche: textParam(url.searchParams.get("subNiche"), ""),
    niche: textParam(url.searchParams.get("niche"), ""),
    platform: validPlatforms.includes(platform) ? platform : "youtube-shorts",
    timeRange: textParam(url.searchParams.get("timeRange"), "Last 24h"),
  };

  if (filters.platform !== "youtube-shorts") {
    return NextResponse.json({
      status: "configuration",
      mode: "live",
      message: `${filters.platform === "instagram-reels" ? "Instagram Reels" : "TikTok"} is coming soon. YouTube Shorts is the active MVP source.`,
    });
  }

  const response = await scanYouTubeShorts(filters);
  return NextResponse.json(response);
}

# MOMENTUM

MOMENTUM is the intelligence layer for the short-form video internet. The MVP
answers one question for creators: **what is moving right now, and what should
I do next?**

The current product is intentionally focused on YouTube Shorts. A scan turns
observed videos into a single discovery surface with three lenses:

- Viral now: what is already winning?
- Emerging: what has room before saturation?
- Fastest rising: what is accelerating within the current result set?

Opening a signal keeps the evidence visible, explains derived metrics, and
offers grounded creator opportunities. Instagram Reels and TikTok are shown as
future platforms only; they are not connected.

## Product principles

- Observed source data and interpretation are visually distinct.
- Live scans never silently fall back to sample content.
- Metrics without historical observations are labeled as cross-sectional
  proxies, not growth probabilities.
- External provider failures are shown as explicit configuration, quota, empty,
  degraded, or unavailable states.
- API keys stay on the server and are never exposed through `NEXT_PUBLIC_*`
  variables.

## Stack

- Next.js App Router
- TypeScript with strict checking
- Tailwind CSS
- `lucide-react` for interface icons
- YouTube Data API v3 through a server-side adapter
- OpenAI Responses API for optional grounded interpretation

## Local development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Create `.env.local` for live provider access:

```bash
YOUTUBE_API_KEY=your_youtube_key
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
```

The UI starts with a clearly labeled sample preview. Press **Scan** to request
live YouTube data. Open a live trend to inspect its evidence and optionally run
grounded interpretation.

## Architecture

The browser talks only to server routes:

```text
browser -> /api/scan -> YouTube adapter -> validation -> normalization -> metrics
browser -> /api/analyze -> evidence whitelist -> OpenAI schema -> validated interpretation
```

Shared domain types live in `lib/shorts/types.ts`. The YouTube adapter produces
normalized `Short` and `Trend` structures so future providers can plug into the
same product contract without changing the UI model.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

There are no automated tests yet. Browser verification covers the desktop
shell, the 390x844 mobile layout, responsive filters, sample and live scans,
trend intelligence, source links, and provider failure states.

## Current limits

- Momentum is cross-sectional until historical observations are persisted.
- OpenAI interpretation is optional and unavailable when its credential or
  provider is unavailable.
- No authentication, database, background jobs, publishing, or social APIs are
  included in this MVP.

# MOMENTUM

**The intelligence layer for the short-form video internet.**

MOMENTUM helps creators answer three questions quickly:

1. What is gaining attention?
2. Why is it working?
3. What should I do with it?

It turns public YouTube Shorts signals into a focused creator workflow:

```text
Select a market -> Scan -> See what is moving -> Understand the signal -> Find your angle -> Create
```

## Live Demo

[Open MOMENTUM](https://momentum-swart-iota.vercel.app)

The product opens in a clearly labeled sample preview. Use **Scan** to request
live YouTube Shorts data when the deployment has provider credentials configured.

## Why MOMENTUM

MOMENTUM is designed for creators, not analysts. The first screen is intentionally
quiet and editorial: a concise snapshot of the few signals worth attention,
followed by deeper intelligence only when requested.

The core product idea is:

```text
One signal -> many useful actions
```

A signal can lead to learning, a creator-specific opportunity, a new Short,
better hooks, a comparison, or a distribution plan. Those actions live inside
the signal experience rather than competing as separate dashboard destinations.

## Intelligence Engine

MOMENTUM separates the dataset it analyzes from the small set of conclusions it
shows. A scan may retrieve and qualify dozens or hundreds of candidate Shorts,
then surface only the strongest representative patterns.

### Retrieval modes

- **Country viral**: broad discovery uses YouTube `videos.list` with
  `chart=mostPopular` and the selected country code. This answers what is
  already popular in the market.
- **Targeted discovery**: a natural-language query such as `Delhi street food`
  uses bounded `search.list` queries with pagination, region, time window, and
  language context where available.

Targeted query expansion is server-side, cached by normalized intent, and capped
to three search phrases. The model never receives permission to execute
arbitrary API requests.

### Candidate pipeline

```text
Retrieve -> deduplicate -> enrich -> qualify Shorts -> derive metrics -> cluster -> rank -> explain on demand
```

For each candidate, MOMENTUM validates available metadata and keeps observed
fields separate from derived fields. It enriches videos with snippet,
statistics, and content details, rejects items that cannot be verified as
Shorts under 60 seconds, and preserves missing fields as unavailable rather
than fabricating them.

The current bounded target is up to 200 unique candidates per scan, subject to
the provider response and the local 10,000-unit quota budget. Search requests
are expensive, so broad discovery prefers `videos.list`, targeted discovery
uses at most three cached/bounded query phrases, and enrichment is batched.

### Derived signals and clusters

MOMENTUM derives current attention, freshness, engagement rate, comments per
1,000 views, views-per-hour proxy, cluster density, and saturation proxy. A
views-per-hour value is explicitly a current proxy; it is never presented as
growth without repeated observations.

Candidates are grouped into content patterns before they become visible trends.
Each surfaced trend includes cluster size, representative Shorts, related
evidence, state, opportunity score, and the basis for its momentum estimate.

The scan response exposes a transparent **Momentum Brief**:

- Shorts analyzed
- Patterns detected
- Representative findings shown
- API requests and estimated quota units
- Candidates retrieved and rejected
- Historical observations available

### Historical movement

Repeated observations in the running server process can produce view velocity,
engagement velocity, acceleration, and movement direction. The UI only uses
`accelerating` or `cooling` when repeated observations support them. First-pass
scans remain explicitly cross-sectional.

The current MVP uses lightweight process-local observation storage. Durable
historical tracking is a future persistence milestone, not a hidden claim.

## Product Experience

### 1. Scan a market

Choose a region, category, platform, and time range. The primary flow is
city-first and deliberately simple:

- India
- Delhi NCR
- Mumbai
- Bengaluru
- Pune
- Hyderabad
- United States
- United Kingdom
- Australia

Categories are selected before optional refinement. Subcategories and sub-niches
are available when a creator wants more precision, but they are not required to
start a scan.

The current active source is **YouTube Shorts**. Instagram Reels and TikTok are
represented as future platform options and are not connected in this MVP.

### 2. Read the Momentum Snapshot

After a scan, MOMENTUM surfaces a concise executive view:

- **Viral Now**: the signal already winning attention.
- **Fastest Rising**: the strongest current momentum estimate in the result set.
- **Emerging**: a promising signal with room before the format becomes crowded.
- **Top Format**: the observable structure behind the leading signal.
- **Top Hook Pattern**: the opening promise or framing pattern worth studying.
- **Biggest Opportunity**: the most actionable creator direction surfaced from the evidence.

The **Trend of the Moment** adds one editorial sentence explaining what changed
across the result set. It is a starting point, not a wall of analysis.

### 3. Explore high-momentum Shorts

The home experience shows the highest-momentum Shorts relevant to the selected
market and category. Each card keeps the important context visible:

- Sample or observed status
- Category and freshness
- Title and channel
- Views, likes, and comments
- Viral score and momentum estimate
- Opportunity and saturation signal
- Working YouTube source link when available

The product distinguishes observed source information from interpretation at the
point of use.

### 4. Open a signal

Selecting a Short opens a focused intelligence view with:

- Thumbnail, title, creator, freshness, and observed metrics
- A clear **Why This Matters** summary
- Source evidence and working links
- Viral DNA: hook, emotion, format, participation, remixability, and cultural relevance
- Trend evolution: stage, movement, and what to watch next
- A transparent momentum basis

Live source evidence is shown separately from AI interpretation. MOMENTUM does
not present generated analysis as observed fact.

### 5. Turn intelligence into action

The signal action bar lets a creator choose exactly what they need:

- **Understand it**: read the core explanation.
- **Show Viral DNA**: inspect the mechanics of the format.
- **Show Trend Evolution**: see the current movement and next watch.
- **Find My Angle**: personalize opportunities to a creator profile.
- **Build a Short**: generate a focused content plan from the selected opportunity.
- **Generate Hooks**: create compact hook variants by style.
- **Compare Shorts**: compare selected signals side by side.
- **Distribution**: package the idea with title, hashtags, keywords, and upload guidance.
- **Evidence**: inspect the source items used for the signal.

### 6. Personalize opportunities

Creators can choose a profile such as:

- Food creator
- Travel creator
- Fitness creator
- Student
- Business
- Brand
- Influencer
- Agency
- Just exploring

MOMENTUM initially shows three strong opportunities, each with a concise
rationale and the main drivers behind the recommendation. Profile selection and
recent filters are kept locally for the MVP; authentication is not required.

### 7. Build content without a content dump

The build experience starts with one idea and progressively reveals the full
blueprint:

- Hook
- Concept
- Structure
- Script or voiceover direction
- Shot list
- On-screen text
- Call to action
- Title
- Description
- Hashtags

The plan is designed to be edited in place rather than regenerated as one large,
opaque response. Live plans require grounded analysis; sample plans are labeled.

## Intelligence and Data Model

The application is built around shared domain concepts instead of UI sections:

```text
ScanFilters
  -> SourceShort
  -> SourceEvidence
  -> Trend
  -> TrendAnalysis
  -> PersonalizedOpportunity
  -> ContentPlan / HookVariant / DistributionPlan
```

The core shared contracts live in `lib/shorts/types.ts`. External source data is
normalized before it enters the product model. This keeps future adapters from
leaking provider-specific response shapes into the interface.

### Source adapter

YouTube ingestion is isolated in `lib/youtube/adapter.ts`:

```text
YouTube API -> defensive validation -> normalized Shorts -> ranked trends -> UI
```

The adapter supports region-aware query strategy, including major Indian city
regions. Future sources can eventually normalize into the same contract without
redesigning the product surface.

### Dynamic taxonomy

The high-level category list is deterministic. OpenAI is used only when a creator
requests more specific taxonomy suggestions. Requests are keyed by normalized:

```text
region + category + subcategory + query
```

This avoids repeated identical calls. AI taxonomy options are suggestions, not
authoritative truth, and the curated taxonomy remains available if the AI request
fails.

### Grounded AI

OpenAI interpretation receives supplied source evidence and returns validated
structured output. It is used for analysis, opportunities, hooks, content plans,
comparison, and distribution guidance.

MOMENTUM follows these trust rules:

- No fabricated live metrics, source items, creators, or trends.
- No silent fallback from failed live data to sample data.
- AI claims must be grounded in supplied evidence.
- Cross-sectional momentum is labeled as an estimate until historical data exists.
- Missing or insufficient evidence is stated plainly.

## Technology

- Next.js App Router
- React
- TypeScript with strict checking
- Tailwind CSS
- `lucide-react` for interface icons
- YouTube Data API v3 through server-side routes
- OpenAI Responses API for optional grounded intelligence
- Local browser persistence for lightweight creator context

The YouTube adapter is isolated in `lib/youtube/adapter.ts`, while shared
contracts for Shorts, trends, diagnostics, historical observations, and AI
outputs live in `lib/shorts/types.ts`.

There is intentionally no authentication, database, queue, Redis, vector
database, microservice layer, browser extension, autonomous posting, or social
publishing integration in this MVP.

## Application Routes

The current product is a focused single-page creator workspace with server-side
API routes:

| Route | Purpose |
| --- | --- |
| `/` | Creator radar, scan controls, snapshot, high-momentum feed, and signal detail experience |
| `/api/scan` | Region-aware YouTube Shorts scan and normalization |
| `/api/analyze` | Grounded signal interpretation and creator opportunities |
| `/api/hooks` | Hook generation from supplied signal context |
| `/api/compare` | Evidence-aware comparison of selected Shorts |
| `/api/taxonomy` | Cached dynamic taxonomy suggestions |

## Local Development

### Requirements

- Node.js 20 or newer
- npm
- A YouTube Data API key for live scans
- An OpenAI API key for AI interpretation and taxonomy suggestions

### Install

```bash
npm install
```

### Configure environment variables

Create `.env.local` in the project root:

```bash
YOUTUBE_API_KEY=your_youtube_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Never prefix provider credentials with `NEXT_PUBLIC_`. Never commit `.env.local`.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app starts with sample data so the product can be explored without live
credentials. Sample content is clearly marked. Press **Scan** to use the live
provider path.

## Quality Checks

Run the same checks used before deployment:

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

The current repository does not include an automated test suite. Browser
verification covers the desktop layout, 390x844 mobile layout, city-first scan
controls, sample and live scan states, signal detail actions, source links,
responsive behavior, and provider failure states.

## Deployment

MOMENTUM is deployed on Vercel as a Next.js application. The production build
uses the standard Next.js output and does not require a custom static output
directory.

For a new Vercel project:

1. Import the repository.
2. Keep the framework preset set to **Next.js**.
3. Add `YOUTUBE_API_KEY`, `OPENAI_API_KEY`, and optionally `OPENAI_MODEL` as server-side environment variables.
4. Deploy without exposing credentials to the browser.
5. Verify `/`, `/api/scan`, and the live provider failure states after deployment.

## Current Boundaries

The MVP is intentionally small and honest about what it does not yet provide:

- Momentum is cross-sectional until historical observations are persisted.
- There is no account system or synchronized saved workspace.
- There is no production-grade subscription or billing enforcement.
- Historical tracking and competitor monitoring are future product capabilities.
- Instagram Reels, TikTok, Reddit, RSS, and YouTube ingestion beyond the current adapter are not active integrations.
- Live provider availability depends on valid credentials, API quotas, and network access.

## Engineering Contract

The permanent project rules are documented in [`AGENTS.md`](./AGENTS.md). They
cover product scope, source attribution, AI safety, server-side secrets,
accessibility, visual quality, verification, and Git discipline.

## License

This repository is currently a private product codebase. Add a license here when
the distribution model is finalized.

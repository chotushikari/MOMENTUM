# MOMENTUM Engineering Contract

## Product Intent

MOMENTUM is a premium short-form intelligence product for YouTube Shorts,
with Instagram Reels and TikTok represented only as future platform options.
The MVP turns observed YouTube evidence into trend intelligence, transparent
derived metrics, and personalized creator opportunities.

Favor scan speed, source provenance, useful interpretation, and clear creator
action over dashboard volume, decoration, or generic AI conversation.

## Product Scope

The MVP source is YouTube Shorts through a server-side YouTube API adapter.
Instagram Reels and TikTok may appear as disabled or Coming Soon UI options,
but must not have backend integrations in this milestone.

The MVP must not add authentication, database complexity, microservices,
Redis, queues, vector databases, browser extensions, autonomous social
posting, multi-agent orchestration, unnecessary backend infrastructure, or
X/Twitter integration.

Keep the architecture deliberately small: a single-page Next.js application
with server-side YouTube and analysis routes, typed data contracts, and local
save state only where it is clearly useful.

## Technology Decisions

- Use Next.js App Router, TypeScript, and Tailwind CSS.
- Use shadcn/ui selectively when it improves a familiar interaction without
  making the interface feel like a component catalog.
- Keep all API keys and secrets server-side. Never expose credentials through
  client components, public environment variables, or API responses.
- Use the YouTube API and OpenAI API only from trusted server-side code.
- Validate data received from external APIs before it enters application logic.
- Set sensible timeouts, handle rate limits, and provide graceful failure states.
- Prefer platform and framework capabilities over new dependencies. Add a
  dependency only when it materially reduces complexity or risk.

## Data, AI, and Trust

Observed source information and AI interpretation are different kinds of
content and must remain visibly distinguishable in the UI.

- Never fabricate live data, source activity, metrics, links, users, or trends.
- Keep live source data and demo fallback data in separate, explicit code paths.
- Demo data must be labeled as demo or sample data; it must never imply it is
  current live activity.
- Attribute every source-backed insight with YouTube title, channel, timestamp,
  observed metrics, and a working source URL when one exists.
- Pass only relevant observed source material to the model when asking for an
  interpretation.
- AI output may synthesize, rank, and explain supplied evidence, but must not
  introduce unsupported factual claims.
- When source data is unavailable or insufficient, say so plainly rather than
  infer certainty.
- Treat generated recommendations as interpretation, not observed fact.

## Interface Standard

MOMENTUM should feel editorial, precise, and premium: Linear-level interaction
quality with Perplexity-level information presentation.

- Design for high information density, scanning, comparison, and repeated use.
- Use excellent typography, a restrained neutral palette, and one deliberate
  accent color.
- Favor clear hierarchy, compact controls, meaningful whitespace, and subtle
  motion that improves feedback or orientation.
- Build responsive, keyboard-accessible interfaces with semantic HTML, visible
  focus states, and accessible labels for icon controls.
- Use source attribution and observed-versus-interpreted labels as part of the
  product interface, not as hidden implementation detail.
- Implement polished empty, loading, error, and degraded-data states. Do not
  leave unfinished-looking placeholders in production-facing UI.

Avoid generic AI gradients, chatbot-first layouts, giant hero sections,
excessive rounded cards, glassmorphism, visual noise, decorative elements
without meaning, fake metrics, and fake live activity.

## Implementation Standards

- Write production-quality, strict TypeScript. Do not weaken type safety with
  broad `any`, unchecked casts, or ignored errors without a documented reason.
- Keep components small and focused. Share types for data contracts rather than
  duplicating shapes across routes and UI.
- Prefer straightforward data flow and local clarity to premature abstractions.
- Keep server data acquisition, normalization, AI interpretation, and
  presentation clearly separated.
- Make API boundaries explicit and defensive, including malformed responses and
  partial source failures.
- Preserve fast perceived performance: render useful structure promptly and do
  not block the experience on nonessential work.
- Do not modify unrelated files or refactor beyond the active milestone unless
  it is necessary for correctness or safety.

## Milestone Workflow

For each milestone:

1. Inspect the current repository and existing work before editing.
2. Write a concise implementation plan before substantial changes.
3. Implement only the requested milestone.
4. Run lint, typecheck, applicable tests, and the production build.
5. Start the application and verify the real browser experience, including
   responsive behavior and key loading, error, and data states.
6. Fix issues found during verification.
7. Review changed code for unnecessary complexity, weak typing, and accidental
   scope expansion.
8. Commit only verified work, using a clear conventional commit message.
9. Push only verified work.

If no test, lint, typecheck, or application command exists yet, state that
explicitly in the milestone handoff. Do not invent passing verification.

## Git Discipline

- `main` is production and must remain releasable.
- Use a `codex/` feature branch for substantial milestones unless the user
  directs otherwise.
- Never knowingly commit a broken build.
- Never force-push unless the user explicitly instructs it.
- Treat existing uncommitted changes as user work. Preserve them and do not
  revert or overwrite them without explicit authorization.
- Do not commit or push unless the user asks for it as part of the milestone.

## Definition of Done

A feature is complete only when it is in scope, source-attributed where needed,
honest about live versus demo data, accessible, responsive, failure-tolerant,
and verified through the available automated checks and a real browser pass.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

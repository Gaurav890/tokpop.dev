# Launch readiness and growth plan

## The market position

AI Native Profile should not compete as another local token or cost dashboard. Mature tools already provide fast, broad usage reports. The product's wedge is different:

> A portable, provenance-labelled record of how a developer works with coding agents and what they ship.

The primary early audience is public-building developers: open-source contributors, indie hackers, developer-tool creators, job seekers, and technical creators who already maintain a GitHub profile or portfolio. Team analytics and recruiting are later markets, not launch positioning.

## The activation event

A signup is not activation. A connected GitHub account is not activation either.

The launch activation event is:

> A developer connects at least one coding-activity source, publishes a coverage-labelled profile, and copies or opens a share asset.

The product should measure the time and conversion between:

1. Landing-page visit
2. GitHub sign-in
3. First evidence sync
4. First coding source
5. Public profile enabled
6. README card or profile link copied
7. A second person visits that shared profile and starts onboarding

The north-star metric for the first launch is **weekly verified profiles shared**, supported by activation rate, median time to first evidence, card-copy rate, shared-profile visitor conversion, seven-day sync retention, and adapter failure rate.

## Failure risks, in order

### P0 — The advertised collector is not installable

The product currently promises `npx ai-native-profile connect`. Until the package is publicly available, the strongest evidence path is a dead end. Prepare a repeatable release workflow, publish the first package manually with two-factor authentication, and then bind later releases to npm trusted publishing with provenance.

Launch gate: a clean machine can run `npx ai-native-profile@latest sources` and reach device pairing without cloning the repository.

### P0 — Onboarding ends before the viral action

The current flow sends a user to a private dashboard. Publishing and README sharing are buried later. Add a dedicated activation screen to onboarding that previews readiness, makes public visibility explicit, and puts the README card and profile link one click away.

Launch gate: an activated user can publish and copy a linked README card without navigating through settings.

### P0 — Public surfaces must never look fabricated

An empty leaderboard currently falls back to sample-like data, while real rows can render incomplete values. Empty public surfaces should be honest, and ranked rows must use the same score calculation as profiles.

Launch gate: the leaderboard contains only opted-in, score-eligible profiles calculated from real evidence, or a clear empty state.

### P1 — Collection breadth is not the moat

Unified local usage tools already support many providers and optimize for instant terminal output. Maintain first-party adapters where provenance is strongest, but add a documented adapter/import path for established local aggregators instead of rebuilding every parser. The profile, trust model, GitHub delivery correlation, and sharing network are the differentiated layer.

### P1 — “Verified” must be narrowly scoped

GitHub identity can be verified. Official account data can be labelled official. A signed batch from a user-controlled machine proves continuity in transit, not that the underlying activity is tamper-proof. Cards and marketing copy must use precise labels such as “GitHub verified,” “official account source,” or “coverage-labelled evidence.”

### P1 — Sharing needs recurring reasons

A permanent profile is useful once; a recurring achievement creates distribution. After the core activation loop is reliable, add weekly recap cards, streak milestones, provider-breadth milestones, and delivery milestones. Every asset should link back to the public profile and explain its evidence coverage.

### P1 — There is no learning system yet

Add privacy-safe product events for funnel steps and failures without recording prompts, code, repository names, file paths, or provider credentials. Until these events exist, launch decisions will be based on anecdotes.

## Delivery sequence

### Phase 1 — Truthful activation

- Publish the collector and test it from a clean environment.
- Put publish-and-share inside onboarding.
- Replace placeholder leaderboard behavior with real eligible scores and an honest empty state.
- Tighten trust language on share cards.
- Add funnel and adapter-health telemetry.

### Phase 2 — The sharing loop

- Add linked README cards and copyable launch-post text.
- Generate weekly recap and milestone cards from existing aggregates.
- Attribute inbound profile visits without invasive tracking.
- Let profile owners invite another developer and compare only after both opt in.

### Phase 3 — The community flywheel

- Publish an adapter compatibility suite and contribution leaderboard.
- Open provider requests as evidence-backed GitHub issues.
- Run a time-boxed “show your workflow” launch challenge with transparent rules.
- Feature excellent public profiles based on evidence quality and storytelling, not token volume.
- Partner with coding-tool communities on adapters rather than presenting the product as a replacement for their analytics.

## Launch channels

1. GitHub is the primary acquisition surface: profile READMEs, repository README, release notes, Discussions, and adapter contributions.
2. Developer communities receive build notes and methodology, not generic promotion: Hacker News, relevant subreddits, DEV, Hashnode, and provider communities.
3. Technical creators receive a concrete artifact: a public profile plus a card they can embed before sharing a review.
4. Launch posts should lead with the uncomfortable truth—provider dashboards are fragmented and screenshots are not portable proof—then demonstrate the open schema and provenance model.

## Non-goals for launch

- Do not claim that activity proves skill, productivity, code quality, or AI authorship.
- Do not rank token volume, imported archives, conversation history, MCP observations, estimates, or manual entries.
- Do not promise complete provider histories where no supported source exists.
- Do not expand into team surveillance before the individual product has repeatable activation and sharing.

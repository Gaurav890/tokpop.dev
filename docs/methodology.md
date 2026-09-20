# AI Workflow Index methodology

The competitive score is deterministic, ranges from 0 to 100, and uses only eligible coding-tool activity plus GitHub delivery. A profile needs GitHub evidence and at least 30 covered coding days to be ranked.

| Component | Points | Formula |
|---|---:|---|
| Consistency | 30 | `20 × min(activeCodingDays90 / 45, 1) + 10 × min(longestStreak90 / 14, 1)` |
| Workflow depth | 25 | Tool-using session rate (10, cap 80%), average tool calls per recorded session (8, cap 12), advanced-workflow session rate (7, cap 30%) |
| Provider breadth | 15 | 3 points per active supported coding provider, maximum five |
| Delivery | 30 | `30 × ln(1 + deliveryPoints) / ln(201)`, capped at 30 |

`deliveryPoints = commits + 3×mergedPullRequests + 2×reviews + 5×releases`

ChatGPT Web, Claude Web, MCP observations, official export imports, manual records, estimated values, and raw token volume never affect the score or ranking. The reference implementation is in `packages/scoring` and is covered by tests.

The index demonstrates attributable workflow adoption and delivery cadence. It is not a claim of competence, code quality, authorship, or business impact.

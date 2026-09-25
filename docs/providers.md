# Provider capability matrix

| Surface | Source | Provenance | Competitive | Notes |
|---|---|---|:---:|---|
| Codex | App Server `account/usage/read` | Official account | Yes | Official totals win over overlapping local token totals; local logs add session/tool detail |
| Claude Code | Deduplicated local session usage plus non-overlapping stats-cache history | Local exact for retained records; estimated daily allocation for cache-inclusive stats-cache totals | Exact retained rows only | Counts input, output, cache-write, and cache-read tokens separately. Stats-cache covered-period totals are preserved, while their daily cache split is estimated and excluded from rankings. Lifetime completeness remains partial because local retention can have gaps. |
| Cursor | Supported local session database | Locally derived | Yes, except estimates | Schema-dependent; derived fields are labelled |
| Gemini CLI | Local telemetry | Locally derived | Yes | Prompt logging must remain disabled |
| GitHub Copilot CLI | Local CLI activity logs | Locally derived | Yes | No claim of personal IDE autocomplete coverage |
| GitHub | OAuth contribution graph | Official account | Yes | Exact 90-day account totals; repository names are not stored; private contribution coverage is shown but not scored twice |
| ChatGPT Web | Browser-local official export / explicit MCP calls | Official export / MCP observed | No | An account sign-in does not expose history; custom MCP availability depends on plan and workspace policy |
| Claude Web | Browser-local official export / explicit MCP calls | Official export / MCP observed | No | An account sign-in does not expose history; custom connectors require a supported plan |

Provider names are compatibility labels only. A stale or broken adapter must lower completeness and surface a warning rather than silently fabricating continuity.

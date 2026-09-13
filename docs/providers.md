# Provider capability matrix

| Surface | Source | Provenance | Competitive | Notes |
|---|---|---|:---:|---|
| Codex | App Server `account/usage/read` | Official account | Yes | Official totals win over overlapping local token totals; local logs add session/tool detail |
| Claude Code | Local stats cache/session logs | Local exact | Yes | Optional consented SessionEnd hook can reduce sync latency |
| Cursor | Supported local session database | Locally derived | Yes, except estimates | Schema-dependent; derived fields are labelled |
| Gemini CLI | Local telemetry | Locally derived | Yes | Prompt logging must remain disabled |
| GitHub Copilot CLI | Local CLI activity logs | Locally derived | Yes | No claim of personal IDE autocomplete coverage |
| GitHub | OAuth public events | Official account | Yes | Repository names are not stored; private aggregates require optional GitHub App |
| ChatGPT Web | Browser-local official export / explicit MCP calls | Official export / MCP observed | No | An account sign-in does not expose history; custom MCP availability depends on plan and workspace policy |
| Claude Web | Browser-local official export / explicit MCP calls | Official export / MCP observed | No | An account sign-in does not expose history; custom connectors require a supported plan |

Provider names are compatibility labels only. A stale or broken adapter must lower completeness and surface a warning rather than silently fabricating continuity.

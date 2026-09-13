# AI Native Profile

**The open proof layer for AI-native developers.**

AI Native Profile turns attributable activity from AI coding tools and GitHub into a private cloud dashboard, an opt-in public profile, and dynamic README cards. Every metric carries coverage and provenance. The platform never pretends to see activity a provider does not expose.

## Three-minute quickstart

```bash
git clone https://github.com/Gaurav890/ai-native-profile.git
cd ai-native-profile
pnpm install
cp .env.example .env.local
pnpm dev
```

Configure a GitHub OAuth App with callback URL `http://localhost:3000/api/auth/github/callback`, then add its client ID and secret to `.env.local`. Open `http://localhost:3000`, sign in with GitHub, open **Connections**, and pair the collector:

```bash
ANP_API_URL=http://localhost:3000 pnpm cli connect
```

The collector shows detected tools and the exact aggregate payload. Automatic background synchronization does not start until the user runs `anp watch`.

GitHub is the product account identity. Coding providers appear inside the Connections screen and use the strongest supported evidence source—official account data where available, otherwise a consented local collector. ChatGPT and Claude Web are optional conversation sources connected through explicit MCP tools or locally parsed official exports; they are never presented as silent account access.

## What is implemented

- Private cloud dashboard and source coverage UI
- GitHub-verified public profiles at `/u/{github_username}`
- Dynamic light/dark SVG README cards
- Open `anp.activity.v1` TypeScript and JSON schemas
- Transparent 0–100 AI Workflow Index implementation
- Signed, idempotent device batches with replay protection
- Codex account-usage client plus local collectors for Claude Code, Cursor, Gemini CLI, and GitHub Copilot CLI
- GitHub public delivery aggregation without repository names
- OAuth 2.1/PKCE remote MCP endpoints for ChatGPT and Claude
- Browser-only ChatGPT/Claude export parsing with aggregate-only commit
- Device revocation, data export, visibility controls, and deletion
- PostgreSQL structured storage with encrypted, one-time device-token delivery

## Repository map

```text
app                   Next.js cloud surface and API routes
packages/cli          Pairing, discovery, filtering, sync, diagnostics
packages/adapters     Provider collectors and export aggregation
packages/schema       Versioned activity contract and JSON Schema
packages/scoring      Public scoring implementation
packages/renderers    README/social asset renderers
db                    PostgreSQL schema, compatibility client, and migrations
docs                  Methodology, privacy, providers, threat model, self-hosting
```

The production topology uses Vercel for the public web surface, Railway for the API origin, and Railway Postgres for canonical structured data. The root app is deployable to both services: Vercel proxies API, MCP, and OAuth routes and fetches server-rendered data through the Railway API, while Railway is the only application service with database access. See the [deployment guide](docs/deployment.md).

## Trust statement

Normal sync accepts counts and identifiers—not prompts, responses, source code, tool arguments or outputs, shell commands, repository names, file paths, conversation titles, email addresses, cookies, credentials, or environment variables. Device signatures prove continuity and integrity in transit; they do not make a user-controlled machine tamper-proof.

Read [the privacy boundary](docs/privacy.md), [threat model](docs/threat-model.md), [provider matrix](docs/providers.md), and [scoring methodology](docs/methodology.md) before deploying.

## Development

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm db:generate
pnpm db:migrate
```

Provider fixtures must be redacted and conform to [`docs/fixtures.md`](docs/fixtures.md). New collectors should follow the [adapter guide](docs/adapter-guide.md).

## License

MIT. Provider names are compatibility labels; AI Native Profile is provider-neutral and is not endorsed by those providers.

# Self-hosting

AI Native Profile is a standard Next.js application backed by PostgreSQL. It can run on one Node.js host, or as a split Vercel and Railway deployment.

## Single-host setup

1. Provision PostgreSQL.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`, `PUBLIC_APP_URL`, `SESSION_SECRET`, and the GitHub OAuth credentials.
3. Configure the GitHub OAuth callback as `{PUBLIC_APP_URL}/api/auth/github/callback`.
4. Run `pnpm install`, `pnpm db:migrate`, `pnpm build`, and `pnpm start`.
5. Leave `BACKEND_URL` unset so the host serves both UI and API routes.

## Split deployment

Use the instructions in [deployment.md](deployment.md). The browser sees one Vercel origin; rewrites forward API, MCP, and OAuth mutations to Railway. This avoids cross-origin browser credentials and keeps CLI pairing URLs stable.

## Required secrets

- `DATABASE_URL`
- `SESSION_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `PUBLIC_APP_URL`

Use a dedicated database role, rotate secrets deliberately, and keep the same `SESSION_SECRET` on the web and API services so signed sessions remain valid across the proxy boundary.

## Operational checks

- `GET /api/health` validates that the service can initialize its schema.
- The Railway start command runs `pnpm db:migrate` before the web process.
- Account deletion cascades through aggregate, device, OAuth, and story records.
- GitHub-backed storage requires the separately requested `repo` scope.
- Selected session publishing remains subject to the server-side secret scan.

The current schema stores dates and timestamps as ISO text for compatibility with the open activity contract. Treat the `drizzle` directory as generated migration history and commit every migration.

# Vercel + Railway deployment

The recommended production layout is:

```text
Browser and CLI
      |
      v
Vercel public origin
  | static pages and UI
  | API/MCP/OAuth rewrites
      v
Railway application service
      |
      v
Railway Postgres
```

The same repository is deployed to both application services. `BACKEND_URL` is the switch: set it on Vercel to enable the Railway rewrites; leave it unset on Railway so requests terminate there.

## 1. Create Railway

1. Install Railway CLI 5.42.1 or newer and sign in.
2. Run `railway init`, then `railway config plan` and review the proposed `api` and `database` resources from `.railway/railway.ts`.
3. Run `railway config apply` to create or update the infrastructure.
4. Add `SESSION_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `PUBLIC_APP_URL` to the `api` service.
5. Generate a public Railway domain for the `api` service.

The Railway service builds with `pnpm build`, runs migrations before starting, and checks `/api/health` before marking a deployment healthy. The PostgreSQL connection uses Railway private networking.

Do not set `BACKEND_URL` on Railway.

## 2. Create Vercel

1. Import the same GitHub repository into Vercel with the repository root as the project root.
2. Set `BACKEND_URL` to the Railway application domain, including `https://` and without a trailing slash.
3. Set `PUBLIC_APP_URL` to the final Vercel production origin.
4. Set the same `SESSION_SECRET` used on Railway.
5. Do not configure `DATABASE_URL` on Vercel. Server-rendered pages read through the Railway API.

Vercel holds only the public origin, backend origin, and shared session-signing secret. Browser API requests, CLI batches, MCP calls, OAuth operations, and server-rendered data reads terminate at Railway. PostgreSQL remains on Railway's private network.

## 3. Finish OAuth

Set the GitHub OAuth callback to:

```text
https://YOUR_VERCEL_DOMAIN/api/auth/github/callback
```

Then make sure `PUBLIC_APP_URL` on both platforms exactly matches `https://YOUR_VERCEL_DOMAIN`. GitHub credentials are required on Railway, where the proxied OAuth routes execute.

## 4. Connect Git deployments

Enable GitHub integration on both services. Vercel will create preview deployments and promote `main` to production. Railway should deploy `main` and use **Wait for CI** so `.github/workflows/ci.yml` completes before a new deployment begins.

## 5. Verify before cutover

1. Open `/api/health` on both the Railway domain and Vercel domain.
2. Sign in with GitHub through the Vercel domain.
3. Pair a test collector and submit a signed batch.
4. Confirm dashboard coverage, public-profile privacy, and card rendering.
5. Test ChatGPT and Claude MCP discovery on the Vercel origin.
6. Keep the previous deployment available until these checks pass.

Never commit platform tokens or database URLs. Put all credentials in each platform's encrypted environment-variable store.

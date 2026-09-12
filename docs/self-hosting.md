# Self-hosting

AI Native Profile targets a Cloudflare-compatible runtime through Sites/Vinext, D1-compatible SQLite storage, and R2-compatible object storage.

1. Install Node 22.13+ and pnpm 9.
2. Run `pnpm install` and `pnpm db:generate`.
3. Create a GitHub OAuth App. Set its callback to `{PUBLIC_APP_URL}/api/auth/github/callback`.
4. Configure `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, a high-entropy `SESSION_SECRET`, and `PUBLIC_APP_URL`.
5. Bind D1 as `DB` and R2 as `FILES` (see `.openai/hosting.json`).
6. Run `pnpm build`, deploy, then verify GitHub login, device pairing, one signed sync, a public card, OAuth metadata, and both MCP endpoints.

Rotate `SESSION_SECRET` deliberately: it invalidates sessions and makes previously encrypted GitHub tokens unreadable. Never log request bodies on metric, export-import, OAuth, or MCP routes.

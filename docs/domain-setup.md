# Launch tokpop.dev on tokpop.dev

The domain is registered at Namecheap. Keep the existing Vercel project, Railway service, database, GitHub repository, npm package, and device credentials. This is a branding/domain migration, not a new installation.

## 1. Add the domain to the existing Vercel project

Open Vercel → the **ai-native-profile** project → **Settings → Domains**.

- Add `tokpop.dev` to Production.
- Add `www.tokpop.dev` and configure it to redirect to `https://tokpop.dev`.
- Keep `ai-native-profile.vercel.app` attached and serving the app. Do not redirect the entire old domain: installed collectors send bearer-authenticated POST requests there, and old README cards still use it.
- Copy the exact DNS values Vercel displays. Do not copy an IP or CNAME from an unrelated tutorial.

## 2. Set DNS in Namecheap

Open **Domain List → tokpop.dev → Manage → Advanced DNS → Host Records**. These controls apply when the domain uses Namecheap BasicDNS, PremiumDNS, or FreeDNS; if the nameservers point elsewhere, edit records at that DNS provider instead.

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | `@` | Exact IPv4 address shown by Vercel for tokpop.dev | Automatic |
| CNAME | `www` | Exact CNAME target shown by Vercel | Automatic |
| TXT, only if requested | Vercel's specified host | Exact ownership-verification value | Automatic |

Replace only conflicting parking/redirect/A/AAAA/CNAME records for `@` and `www`. Preserve unrelated TXT records, MX records, and mail subdomains. Do not use Namecheap URL forwarding or buy a hosting/SSL package for this setup.

Wait for Vercel to show **Valid Configuration** and an issued HTTPS certificate for both hosts. DNS propagation is not instantaneous. Test `https://tokpop.dev` before changing authentication settings.

## 3. Coordinate the app origin and GitHub sign-in cutover

After DNS/HTTPS works, schedule a short cutover window; existing sign-in attempts may need restarting while the callback and deployments switch.

Set this **Production** environment variable in Vercel and in the existing Railway application service (not the database service):

```text
PUBLIC_APP_URL=https://tokpop.dev
```

Keep `BACKEND_URL` on Vercel pointing to the existing Railway service. Leave it unset on Railway. Do not change `DATABASE_URL`, `SESSION_SECRET`, or GitHub client credentials; replacing the secret would invalidate sessions and encrypted stored credentials.

Open GitHub → **Settings → Developer settings → OAuth Apps** → the app matching the deployed `GITHUB_CLIENT_ID`:

| Setting | Value |
| --- | --- |
| Application name | tokpop.dev |
| Homepage URL | `https://tokpop.dev` |
| Authorization callback URL | `https://tokpop.dev/api/auth/github/callback` |

Deploy this branch's code and the new environment settings to BOTH Vercel and Railway. Vercel needs a new build for metadata and redirects; Railway needs the matching origin for OAuth callbacks and generated URLs. Do not apply the production callback to an unrelated development OAuth app.

The code redirects only the legacy GitHub sign-in start route to the configured public origin before a state cookie is created. Other legacy API/card routes stay in place. Users sign in once on the new domain because cookies are host-specific; their account and stored data do not change. Start a fresh sign-in attempt after the cutover.

Preview deployments should use an isolated backend and development OAuth app if testing login; do not point a production OAuth callback at a temporary preview hostname.

## 4. Check the full flow before announcing

- `https://tokpop.dev` shows tokpop.dev and a valid certificate; `https://www.tokpop.dev` redirects to it.
- `https://tokpop.dev/api/health` returns HTTP 200 with `{"status":"ok"}`.
- In a private browser window, sign in with GitHub from the new domain. Confirm you return to `tokpop.dev/share` without a state/callback error.
- Sign in from the legacy site's button too. Confirm the sign-in start moves to `tokpop.dev` before GitHub opens, retaining the return path.
- Generate a fresh connection command on `/share`. It must explicitly contain `--api-url 'https://tokpop.dev'`. Approve pairing and sync only on a device/account you intend to upload from.
- Confirm a successful sync changes the dashboard and provider/day totals. Check the collector's `doctor` output and the next background-sync timestamp if automatic updates are enabled.
- Publish a test card deliberately. Copy Markdown: image URL must use `https://tokpop.dev/api/v1/cards/...`; its link must use `https://tokpop.dev/make/...`.
- Verify dark/light cards, a public profile, and the visitor make-your-own flow while signed out. Private profiles must stay private.
- Open `/brand-preview` and `/media/launch-demo.mp4`. The older walkthrough is explicitly labelled as recorded before the rename.
- Verify an existing collector on the old origin can still sync and an old embedded card still loads. No npm republish is required for this domain launch; the website uses the existing package with an explicit API origin.

Existing copied Markdown cannot be changed remotely. It keeps working on the old host; users can copy again to use the new domain. GitHub's image proxy may take time to refresh branding.

## Rollback

If sign-in fails, restore the previous `PUBLIC_APP_URL` on both services and the matching GitHub homepage/callback, then redeploy both. Leave the old domain active and keep the same database and secrets. Changing the origin back disables the legacy sign-in redirect automatically. Do not delete accounts, devices, or DNS records as a troubleshooting shortcut.

## Reference guides

- [Vercel: add and configure a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Namecheap: DNS host records](https://www.namecheap.com/support/knowledgebase/subcategory/2237/host-records-setup/)

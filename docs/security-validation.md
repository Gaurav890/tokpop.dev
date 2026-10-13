# Security validation

Run both dependency scopes before a release:

```sh
pnpm audit --prod
pnpm audit
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI blocks on moderate-or-higher production dependency advisories. The full audit
must still be reviewed; a clean production audit is not a guarantee that the
application has no vulnerabilities.

## Dependency maintenance

Next.js and its lint configuration are pinned together. Vite is explicitly pinned
to a patched version for the test runner. The scoped esbuild override updates the
legacy loader used by the migration tooling; validate schema generation when
changing it. No database migration is needed for these dependency updates.

## Remaining development-only advisory

As of October 13, 2026, the full audit reports
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
in `braces@3.0.3`, reached through the framework's lint plugin, `fast-glob`, and
`micromatch`. Upstream has no patched release. Deeply nested, attacker-controlled
glob patterns can exhaust the process stack.

This dependency is used by lint tooling, not the production dependency graph.
Keep lint patterns in reviewed repository configuration, do not expose linting as
a service accepting arbitrary patterns, and run untrusted contributions only in
isolated CI without deployment secrets. Keep the advisory visible in the full
audit and update the lint dependency chain when an upstream fix is available.

## Login redirect regression coverage

`lib/auth-return-path.test.ts` covers same-origin return paths and rejects
external destinations, backslashes, control characters, encoded separators,
nested encodings, and paths that normalize into protocol-relative destinations.
Both the login start route and callback apply this validation.

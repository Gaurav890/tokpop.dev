# Contributing

Issues and pull requests are welcome. For adapters, start with `docs/adapter-guide.md` and the provider matrix. Every behavior change needs tests proportional to privacy and scoring risk.

Before opening a pull request, run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Do not include real provider logs or exports. Use redacted synthetic fixtures. Changes to scoring require an update to `docs/methodology.md`, versioned release notes, and boundary tests proving non-competitive sources cannot enter rankings.

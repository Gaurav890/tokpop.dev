# Collector release runbook

The hosted onboarding advertises:

```bash
npx ai-native-profile@latest connect
```

That command is a launch gate. Do not ship copy pointing to it until the public npm package resolves successfully.

## First public release

npm trusted publishing can only be configured after the package exists. The first release therefore requires a maintainer with npm two-factor authentication:

```bash
cd packages/cli
npm pack --dry-run
npm publish --access public --provenance
```

Confirm the result from a clean temporary directory:

```bash
npx ai-native-profile@latest --help
npx ai-native-profile@latest sources
```

## Later releases

1. Update `packages/cli/package.json` and the CLI `VERSION` constant to the same version.
2. Run the repository verification suite and `npm pack --dry-run` from `packages/cli`.
3. Create a GitHub release tagged `collector-vX.Y.Z`.
4. Configure npm trusted publishing for:
   - GitHub owner: `Gaurav890`
   - Repository: `ai-native-profile`
   - Workflow: `publish-collector.yml`
   - Allowed action: publish
5. Publish the GitHub release. The workflow verifies that the tag and package versions match before publishing.

The workflow uses a GitHub-hosted runner and OIDC. Do not add a long-lived npm write token.

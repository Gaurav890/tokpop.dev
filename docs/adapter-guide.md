# Adapter contribution guide

An adapter returns dated `DailyActivity`, one `SourceCoverage` record, and human-readable warnings. It must:

1. Read only a documented or explicitly supported local/official source.
2. Emit the narrow `anp.activity.v1` schema.
3. Choose an honest provenance and completeness label.
4. Keep prompts, responses, code, tool payloads, commands, repositories, paths, titles, identifiers, and credentials out of output.
5. Include corrupt, truncated, duplicate, clock-skew, timezone, DST, and schema-change fixtures.
6. Fail closed when a provider format is ambiguous.

Use the functions in `packages/adapters/src/index.ts` as templates. Run `privacyCheck` against every batch after composition, not only against individual adapter output. Redacted fixtures must follow `docs/fixtures.md`.

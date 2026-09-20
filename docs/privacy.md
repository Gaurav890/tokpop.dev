# Privacy boundary

Private visibility is the default. Public profile, leaderboard inclusion, conversation activity, private-repository evidence, and individual session stories require separate opt-ins.

Normal synchronization may contain dates; provider and model identifiers; aggregate input, output, cache-write, cache-read, session, turn, tool, skill, command, and agent counts; duration; collector and adapter versions; anonymous device identifiers; and coverage/provenance fields.

Normal synchronization must never contain prompts, responses, source code, tool arguments or outputs, shell commands, repository names, file paths, conversation titles, email addresses, cookies, credentials, provider tokens, or environment variables. The CLI preview makes the aggregate payload inspectable before sync, and the server repeats schema, privacy, signature, and replay checks.

Historical ChatGPT and Claude ZIP files are decompressed and parsed in a browser Web Worker. Only approved daily counts and coverage dates are posted. The ZIP and raw messages never leave the browser.

Selected-session publishing is a separate path with preview, explicit invocation, secret scanning, unlisted default visibility, optional expiry, and revocation-compatible records.

Account deletion disables all public content immediately by deleting the account projection and cascades through managed metrics, devices, OAuth grants, and stories.

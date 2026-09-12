# Redacted fixture format

Fixtures may contain timestamps, provider/model identifiers, event type labels, aggregate counts, and synthetic IDs. They must not contain real prompts, responses, code, file paths, repository names, conversation titles, tool arguments/outputs, commands, emails, hostnames, credentials, cookies, environment values, or stable personal identifiers.

Use impossible canary strings such as `PRIVATE_CONTENT_CANARY` in privacy tests and assert that adapter output does not contain them. Never commit a real provider export, SQLite database, session log, or home-directory path.

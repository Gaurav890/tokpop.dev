# AI Native Profile Collector

[![npm version](https://img.shields.io/npm/v/ai-native-profile.svg)](https://www.npmjs.com/package/ai-native-profile)
[![license](https://img.shields.io/npm/l/ai-native-profile.svg)](https://github.com/Gaurav890/ai-native-profile/blob/main/LICENSE)

Connect local AI coding activity to a private [AI Native Profile](https://ai-native-profile.vercel.app), then choose what to publish on your profile or GitHub README.

The collector runs directly with `npx`; no global installation is required. It discovers supported tools, builds aggregate activity locally, lets you inspect the exact payload, and syncs only after you pair and approve the device.

## Quick start

Check which coding tools are available:

```bash
npx --yes ai-native-profile@latest sources
```

Inspect the exact aggregate payload before sending anything:

```bash
npx --yes ai-native-profile@latest preview
```

Pair this computer with your cloud profile:

```bash
npx --yes ai-native-profile@latest connect
```

The command prints a short-lived verification URL and code. Open the URL, sign in with GitHub, and approve the device. The collector then shows the privacy boundary and asks before the first sync. You can also run a one-off sync later:

```bash
npx --yes ai-native-profile@latest sync
```

For the fastest setup, sign in on the website and choose **Power up with coding activity**. The site creates a one-time command like this:

```bash
npx --yes ai-native-profile@latest connect --code ABCD1234
```

That command is already associated with the signed-in profile. It detects sources, displays the privacy boundary, asks before the first sync, and updates the open card without requiring the code to be entered again. After that first sync it offers automatic 15-minute refreshes; approving them installs a visible user-level macOS LaunchAgent or Linux systemd timer.

Enable persistent 15-minute updates later:

```bash
npx --yes ai-native-profile@latest watch --install
```

Check their status with `doctor`, or disable them with `watch --uninstall`. Plain `watch` remains available for a foreground-only loop that stops with the process. The scheduled collector is copied under `~/.config/ai-native-profile/collector`; no provider credentials or source data are copied.

## Supported coding sources

| Source | Collection path | Trust label |
|---|---|---|
| Codex | Official local App Server account usage | Official account source |
| Claude Code | Deduplicated local session usage plus non-overlapping statistics-cache history | Local exact for retained records; estimated daily splits for cache-inclusive statistics history; partial lifetime coverage |
| Cursor | Supported local database metadata | Estimated; excluded from rankings |
| Gemini CLI | Locally retained CLI telemetry | Locally derived |
| GitHub Copilot CLI | Locally retained CLI activity | Locally derived |

ChatGPT Web and Claude Web are connected separately through browser-local official export import or explicit MCP activity. This collector does not read browser conversations or provider cookies.

## Privacy boundary

Normal synchronization may include:

- Dates and provider/model identifiers
- Token, session, turn, and tool-call counts
- Input, output, cache-write, and cache-read token counts when a provider reports them
- Duration, coverage, freshness, and provenance
- Collector version and an anonymous device identifier

It never includes:

- Prompts or responses
- Source code
- Tool arguments or outputs
- Shell commands
- Repository names or file paths
- Conversation titles or email addresses
- Cookies, provider credentials, access tokens, or environment variables

Run `preview` whenever you want to inspect the exact aggregate payload. Pairing credentials are stored locally in `~/.config/ai-native-profile/config.json` with user-only file permissions.

## Commands

| Command | Purpose |
|---|---|
| `connect` | Pair this device with the hosted profile |
| `sources` | Detect supported local coding tools |
| `preview` | Print the exact aggregate payload without sending it |
| `sync` | Send one approved aggregate batch |
| `watch` | Sync every 15 minutes in the foreground |
| `watch --install` | Enable persistent 15-minute updates after Terminal closes |
| `watch --uninstall` | Disable persistent updates |
| `doctor` | Check local sources, pairing, and automatic-sync status |
| `sessions` | List deliberately published session stories |
| `share` | Preview or publish a manually supplied sanitized story |
| `unshare` | Revoke a published story |
| `export` | Alias for `preview` |
| `disconnect` | Disable automatic updates and remove the local platform pairing |

Use a self-hosted deployment instead of the managed service:

```bash
npx --yes ai-native-profile@latest connect --api-url https://your-domain.example
```

## Troubleshooting Codex discovery

The collector checks the shell `PATH` and the standard macOS ChatGPT/Codex app-bundle locations for the Codex App Server executable. If yours lives elsewhere, provide its exact path:

```bash
ANP_CODEX_PATH=/path/to/codex npx --yes ai-native-profile@latest preview
```

If the App Server is unavailable, the collector reports that Codex was skipped and continues collecting other detected sources instead of failing the entire sync.

## What the evidence means

Every metric carries its source, coverage dates, freshness, and provenance. A device signature protects integrity in transit; it does not make a user-controlled computer tamper-proof. Activity demonstrates workflow adoption, not developer skill, productivity, code quality, or AI authorship.

Conversation imports, MCP observations, manual stories, and estimated metrics never affect competitive scores.

## Links

- [Create a profile](https://ai-native-profile.vercel.app)
- [Source code and issue tracker](https://github.com/Gaurav890/ai-native-profile)
- [Privacy boundary](https://github.com/Gaurav890/ai-native-profile/blob/main/docs/privacy.md)
- [Provider capability matrix](https://github.com/Gaurav890/ai-native-profile/blob/main/docs/providers.md)
- [Scoring methodology](https://github.com/Gaurav890/ai-native-profile/blob/main/docs/methodology.md)

## License

MIT. Provider names are compatibility labels. AI Native Profile is provider-neutral and is not endorsed by the providers it supports.

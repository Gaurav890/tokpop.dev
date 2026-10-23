# Beta acceptance gate

Status: pending. A working maintainer account is not evidence that a fresh user can complete onboarding. Do not describe this checklist as passed until results are recorded.

## Release gate

- [ ] Merge the tested framework patch and confirm both web and API deployments run the patched revision.
- [ ] Run the production dependency audit on the exact release lockfile. Record the result; a clean dependency audit is not a guarantee of zero vulnerabilities.
- [ ] Smoke-test the deployed homepage, GitHub sign-in redirect, profile, card image, and banner-to-create funnel.

## Fresh-user gate

Invite 5–10 consenting beta users, including at least one on a second computer with retained Claude Code history. The critical path below must pass for a genuinely new account before broad promotion. Do not request raw conversation logs, credentials, or private repository names.

1. Open the homepage signed out. Make a card, sign in with GitHub, and confirm the starter card remains private.
2. Copy the personalized command from the share page and run it on the participant's computer. Confirm the displayed collector version is 0.2.2 or the release being tested. No global install or project-directory change should be necessary.
3. Inspect the preview locally before approving upload. Compare at least two known days of retained Claude usage with the daily provider ledger. Check input, output, cache writes, and cache reads; distinguish exact session records from estimated cache allocation. Record aggregate differences only.
4. Confirm all detected providers are represented honestly. Activity-only providers must not imply measured token totals. Missing coverage must not look like measured zero usage.
5. Approve the first sync. Confirm the card and public profile use the same provider totals and refresh after another successful sync. Check both card themes.
6. Opt into background sync, close the terminal, generate new activity, and keep the computer awake and online for a scheduled interval. Confirm a later successful upload timestamp and the expected new aggregate activity. Repeat after restarting the computer. An unchanged total alone is not a failure if the provider has no new reported usage.
7. Check GitHub receipts against the same exact 90-day window and contribution definitions. Verify private coverage is labelled accurately. A failed or unavailable fetch must not be presented as verified zero contributions.
8. Publish deliberately, copy the README markdown, and render it in the participant's profile. Click the banner signed out: it must lead to making a new card. Confirm the source profile remains reachable where promised.
9. Check the primary flow on a narrow mobile viewport, including command wrapping, readable text, keyboard focus, and sharing controls.
10. Disable automatic sync and revoke the device. Confirm the scheduled job stops and the revoked credential cannot upload. Restore the participant's chosen privacy state.

## Record results without sensitive data

| Tester alias | OS / runtime / collector | Sign-in and connect | Claude daily reconciliation | Background update / restart | Share funnel | Result / issue |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | — | — | — | — | — | Not tested |

For failures, record the release SHA, route or command, sanitized error, timestamp and expected versus observed aggregate values. Keep the beta small while pairing failures, missing token categories, misleading coverage, or stale successful-sync displays remain unresolved.

## Broader launch

- [ ] Critical-path failures above are resolved and retested by an affected participant.
- [ ] Launch media matches the current branding and flow (or outdated media is omitted from the campaign).
- [ ] The campaign explains the terminal step and local-history limits; no claim of complete lifetime usage or guaranteed instant background updates.
- [ ] Ranking remains optional. Existing retained history can satisfy the 30-covered-day eligibility rule; users can share their card before qualifying.

The beta is for validating activation and trust, not manufacturing leaderboard entries. Costs, team views, recap cards, provisional rankings, and more archetypes are separate product decisions, not completed launch work.

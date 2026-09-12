# Threat model

## Protected assets

- Provider credentials and local provider state
- Prompt, response, code, repository, path, and tool-content data
- Device and MCP bearer tokens
- Private profile settings and aggregates
- Integrity of public provenance labels and ranked scores

## Trust boundaries

Provider OAuth credentials stay inside the official provider process where supported. The local connector sees supported local files but filters to the public schema before transmission. Device authorization uses a short-lived human code plus a separate high-entropy device code. Raw device tokens live briefly in object storage and are deleted after one redemption. Stored GitHub tokens use AES-GCM with a deployment secret.

MCP OAuth uses dynamic client registration, authorization code flow, PKCE S256, short-lived codes, hashed access tokens, expiry, and explicit scopes. MCP observations and imports are permanently non-competitive.

## Known limitations

A signature proves that a batch came from the same paired device token and was not altered in transit. It cannot prove that software or data on a user-controlled machine was honest. Local databases may change without notice; adapters therefore expose versions, freshness, completeness, and derived/estimated labels. Public GitHub events are a bounded partial window. The platform never attributes a specific commit to AI without direct evidence.

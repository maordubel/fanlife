# M2 — Identity & Theme

Base: M1 merged main, `355ca2e70d5d66d8838f1b25f3dab7e6698cbf5f`.

## Identity is data

`club-packs/<club-id>/identity.json` defines the core clubs' shared identity. `lib/clubs/theme.ts` resolves manifests and validates the palette. Gameplay adapters and the compiler use the same resolved identity as portal cards and hubs. Theme changes participate in compiled content versions; a stale action is rejected through the existing version guard.

| Field | Meaning |
| --- | --- |
| schemaVersion | Identity schema version, currently 1 |
| primary | Registry club color |
| secondary | Companion identity color |
| background / surface | Page and content plate |
| text / muted / accent / onPrimary | Readable foregrounds; required pairs meet contrast 4.5:1 |
| fonts | Enumerated self-hosted font IDs; no arbitrary CSS/font injection |
| pattern | rules, diagonal, stripes or plain |
| identityColors | Club color families subtracted from rival restrictions |
| colorPolicy | pending, approved or legacy; human approval provenance |
| rivalForbiddenColors | Derived only from approved rival identity metadata |
| historicalExemptions | Exact asset, HTTPS source, historical context, rights, human actor/date and reason |

The three motifs are editorial UI design, not claims about historical shirt patterns. The remaining registry clubs retain a neutral fallback with their own registry primary. Complete identity work for those clubs requires individual review.

Identity manifests govern compiled shared themes. The existing admin's color fields still belong to the older control store; editing them does not publish a new compiled identity. A unified review/publish workflow is M4 work.

## Locale and script

English is the shared default. English and Hebrew messages are complete for M2 shell and shared hub controls. `?lang=he` selects RTL; English remains LTR for Hapoel too. The original Hapoel archive text stays Hebrew and is labelled as source content. Native Hapoel routes keep the original typography and date format.

Unsupported languages fall back to English with an explicit message. Greek and Croatian historical translations are not claimed. Existing native gate names/descriptions and legacy readiness notes retain their source strings pending full M5 extraction. Self-hosted Latin/Hebrew fonts are reused; other scripts use platform fallbacks until approved font assets are added.

Shared Timeline formats visible dates with UTC `Intl.DateTimeFormat` for the UI locale and isolates source titles with their content language. Unplayed dates remain on the server.

## Color rules

Owner-approved rival colors minus the club's own color families produce forbidden colors. Pending or automated approvals cannot create a rivalry rule. Hapoel's existing yellow restriction is labelled legacy and carried forward; it does not invent a new owner approval or rivalry fact. New policies for Zrinjski and Olympiacos remain pending.

Historical exemptions are exact-path and provenance-based, never folder-wide or global color permissions. No new historical exemption is granted by this milestone. Existing native assets and their original rights/exception ledgers stay in their original scope.

`master:identity` validates every registry palette and scans shared source paths for raw colors and hardcoded color utilities. Browser CI scans rendered PNG pixels against each identity's forbidden rules. It uses the same grayscale text-rasterization flags as the existing `scripts/brand/qa-sweep.mjs`; LCD subpixel glyph edges otherwise introduce renderer-only color fringes. The forbidden-color threshold remains zero. This is a scoped check over the portal cards, hubs and shared Timeline; it is not a claim that every native gate is migrated.

## Review

- `/` — compare the three themed cards within the neutral portal.
- `/clubs/hapoel-tel-aviv`, `/clubs/zrinjski-mostar`, `/clubs/olympiacos` — same hub with three identities.
- `/clubs/<id>/timeline?seed=42` — same interactive board with the matching identity.
- `?lang=he` — hub and shared game RTL.
- `?lang=el` — explicit English fallback until M5.
- `/timeline/order` — original native Hapoel presentation is preserved.

Evaluation remains open without signup or a live Supabase connection. Admin pause and Timeline gate controls remain authoritative. Club hubs now reject mismatched host/path selection too.

## Verification

Unit tests cover distinct three-club identities, contrast, unsafe color input, own-color subtraction, owner-only rivalry review, exact historical exemptions, immutable compiled themes and locale fallback. Original Hapoel golden fixtures and engine tests remain unchanged.

CI retains all M1 checks and adds the identity/color guard. The real browser flow completes each club's round, replay and host isolation; additionally it verifies three backgrounds/fonts, portal cards, Hebrew hubs, translated navigation, unsupported-language notices and forbidden screenshot pixels. Artifacts include screenshots and `report.json`.

Local Chromium has the previously observed environment socket restriction; final visual verification uses the GitHub browser artifact rather than claiming an unexecuted local pass.

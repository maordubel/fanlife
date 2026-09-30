# M1 ClubData contract

Authority: [canonical owner Bible](26-canonical-bible-2026-09-30.md). It supersedes conflicting older Fan Life Bibles, ADRs and inherited single-club notes. The Worker remains separate; this change is in Fan Life only.

## Boundary

`lib/clubs/contract.ts` defines the contract. Server providers resolve identity, locale, theme, evidence and readiness. Gates read compiled data, never raw packs. Providers load only the requested club, freeze results, and cache within an immutable deployment. Timeline caches by club ID plus content hash. Only the anchor and blind queue reach the client; unplayed dates and fact envelopes remain server-side.

| Field | Meaning in M1 |
| --- | --- |
| schemaVersion/version | Schema 1 and deterministic content hash; changed packs invalidate grading |
| identity | Registry-owned ID, name, location and football scope |
| locales | UI/content languages separate; shared UI English by default, optional Hebrew; native Hapoel content preserved |
| theme | Registry ink scoped through semantic tokens; complete M2 theme validation remains future work |
| archive | Canonical sourced historical events, including unapproved drafts |
| timeline | Approved confidence ≥2 exact-date projection; opaque IDs and distinct dates |
| sources | Publisher, URL, access state and checked date; blocked/unchecked new sources excluded |
| gates/readiness | Computed readiness, playable flag, eligible/target counts and reasons |
| other sections | null means not migrated/researched; reserved entity types need refinement with each gate |
| life | Explicit legacy or unavailable; no fabricated scenes |

## Provenance

Each Fact records ID, value, sources, confidence 0–3, status, research/approval dates, actor and notes. Primary-source labels or old OPEN gates do not mean approved facts. Compiler input is reviewed repository content, not a public upload endpoint.

New core files hold three cross-checked, non-sensitive match results per club. Approval actor is explicitly `automated:cross-source-review-m1`, under Bible §35: two independent publishers, high certainty, no observed conflict, confidence 3, no culture/rivalry/person/rights decision. The compiler checks metadata; it cannot establish a source's truth or crawl it. Source links and actor/date remain reviewable. These are match dates, which can differ from article publication dates.

Zrinjski's existing anchors remain review/1. Known years never become invented January 1 dates. Original pack files remain unchanged.

Hapoel is a documented carry-forward exception: its existing curated, confidence-filtered archive retains pool order, IDs, titles, date deduplication and canonical match aliases. Each card retains its actual source URL/title/confidence. Actor `legacy-curation`, unknown approval dates and unknown current source access explicitly avoid asserting new owner/source approval. The full archive and LIFE are not migrated.

## Validation and readiness

Compiler normalizes identifiers, numeric confidence and supported legacy confidence labels, then checks schema/identity, dates, sport, source references, approval provenance and duplicate IDs. Conflicting duplicate IDs quarantine both versions. Same-day events stay in the archive but chronology uses only the first. Hints lose dates; year-revealing titles are excluded without rewriting facts. Semantic contradictions between differently identified events still require review.

11+ distinct eligible events: READY, 10 placements. 3–10: PARTIAL, 2–9 placements, explicitly labelled short rounds. 0–2: LOCKED. HIDDEN is reserved for publishing policy. Red Thread has different requirements and is not migrated.

## Tenant authority and compatibility

Closed registry host resolution runs on the server for pages and every action. Mismatched path selectors fail. Unknown subdomains do not default to Hapoel. Explicit club paths on neutral hosts are evaluation-only. Existing admin pauses and disabled live-club gates also block shared actions. Research/review club previews require evaluation mode. Actions validate pack version, current card ID, seed/cursor and placement indices. Scores are local evaluation display, not persisted rankings. Production account/RLS/anti-cheat are later milestones.

`timeline-engine.ts` owns one dealing/grading algorithm. `SharedTimelineBoard` owns the timer, slots, feedback, lives, combo and score display. The native wrapper retains coach, recording, sharing and recommendations. Shared wrappers provide English/Hebrew results. No algorithm is forked.

Native `/timeline` remains Red Thread; `/timeline/order` remains chronology. Non-Hapoel hosts route Timeline into compiled club data. Unmigrated native screens show unavailable on other registered hosts. Native compatibility facades remain explicit Hapoel exceptions; full legacy API/action isolation is not claimed. No active Supabase connection or signup is introduced.

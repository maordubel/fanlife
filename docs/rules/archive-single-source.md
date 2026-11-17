# A single source is enough: every researched record goes into action (17.11.2026)

- Any ONE cited source that is checked and available approves a record. Two publishers, or an official body (rule `archive-official-source`), now mark the cross-checked tier (`lib/clubs/official.ts → crossChecked`), which still earns confidence 3.
- One test decides an automated approval for every compiler (events, players, sections): `automatedApprovalOK` — a cited source, confidence 2 or 3, a declared sure parse (`parserCertainty` `high` or `medium`), `conflictFree: true`, not sensitive.
- The daily wave (`scripts/ingest/clubs/wave.ts`) approves a one-publisher match at confidence 2 with the primary report's eleven and scorers; the roster wave (`scripts/rumble/build-roster-wave.ts`) writes confidence 2, so trivia, Blind Cow and the archive deal those men.
- Records held before were stamped once by `scripts/club-research/single-source-approval-2026-11-17.py` (idempotent): 635 held records approved, 69 automated-but-held re-stamped, 2,160 roster men raised from confidence 1 to 2. Atalanta's 576 and Maccabi Haifa's 27 history results moved into their packs and merged (`lib/clubs/history-wave.ts`).
- Not approved by this rule: a rejected record, a sensitive record, an eleven whose second publisher shares fewer than 6 of 11 surnames (the result is kept, that eleven dropped).
- Conflicts: the more correct reading wins, Wikipedia breaking a tie on dates and scores. The merge's day-collision gate still keeps two different results for one day out.
- Opening a club is separate from completing its archive; research-desk clubs keep their desk batches.
- **Who approved what is bookkeeping, never content.** A record's note reaches a reader only through `lib/clubs/public-note.ts → publicNote`, which drops every sentence that names an approval, a person or a private exchange. Approval stamps and notes written from now on name a rule, never a person or a conversation.

# Integration and verification record

Imported revision: `0adf5464d00122a1dc310367f46e99e8dd9d74f2` from `maordubel/The-Worker`.
Compared with original base `0d5e5e0899d8ab916db327abfbb133a52ad10cb8`: **21 commits and 153 changed paths**.

The actual updater detected these changes and attempted three-way integration. `package.json` conflicted, the updater exited with status 2, and the installed lock did not advance. The scripts were then merged while preserving both sets of commands. The native home was mapped to `/ground`. Integration also repaired the Royal Rumble captain evidence field and two mandatory LIFE beat assertions. The follow-up check reported the installed revision current at the time of testing. No original repository branch was pushed.

Verification of the integrated core on 29 September 2026:
- 4,894 tests passed across 224 files.
- Typecheck and production build passed. Lint had existing upstream warnings, no errors.
- All 20 native SQL migrations and local profile/admin/collector checks passed.
- LIFE dead-end audit: no dead ends; 77 content warnings remained.
- Browser: 29 primary routes returned HTTP 200; no page errors or Supabase requests were observed.
- Actual admin club creation, stale-version rejection, cross-origin rejection, profile/admin RPCs, photo upload/read/remove, two-user Royal Rumble and Stand joins passed.
- An Arsenal research request completed with an unapproved source. Upstream admin check returned the installed commit with zero commits behind at that time.
- Mobile views at 390px had no horizontal overflow.

These are checks of the integrated core, not a claim that every interactive scene was manually played. Final release packaging adds launchers, workflow definitions, provenance gap records and documentation. Workflow definitions are not activated until the repository is uploaded and GitHub settings are enabled. Full native English localization and additional playable club adapters remain incomplete.

## Final release recheck

After restoring the launchers, workflows, QA-room links and stadium image, production build, full typecheck, lint, all 4,894 tests, the 20-migration local database check and LIFE dead-end audit passed again. The asset audit now covers 1,949/1,949 files with six explicitly unknown provenance groups. Final browser checks passed for 29 routes, 14 QA links, real admin club creation and three mobile pages at 390px. No page errors or Supabase requests were observed. See `release-checks/` for actual command output, browser JSON and screenshots.

# ADR-fanlife-0004: Localisation: build-time locale per club

## Status
Proposed

> **עדכון 30.9:** מפני שפריסה אחת משרתת את כל המועדונים, השפה נקבעת **בזמן ריצה** לפי המועדון/משתמש (קטלוגים נטענים אסינכרונית, `t()` מקבל שפה), לא בזמן בנייה.

## Date
2026-09-30

## Context
`lib/i18n.ts` imports Hebrew only (48 catalogues); 320 files call `t()`; ~989 files contain Hebrew (most comments). Prompts embed Hebrew grammar. Layout is globally RTL; canvas share cards assume RTL.
## Decision
1. Locale set comes from the club manifest; `@/messages/active` resolves at build; `t()` stays synchronous.
2. English is the master catalogue; other locales mirror keys; a parity test fails on missing keys (fallback en, never he).
3. Club names and grammar via `{club}` and per-locale message variants, not string concatenation.
4. Direction from the club; share cards take a direction parameter; fonts per script (Latin, Greek, Cyrillic subsets).
5. Israeli clubs ship he + en; others their language + en.
## Alternatives
Runtime locale switching in one bundle (bundle weight, async `t()`). Rejected for now.
## Consequences
+ Small change to `t()`. − ~5k lines × locales of catalogue work; Greek/Croatian/German/Italian plural and number rules.
## Dependencies
Depends on 0001. Blocks M5.
## Validation
Hapoel he identical; a club in en builds with zero missing keys.

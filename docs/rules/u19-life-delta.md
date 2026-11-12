## LIFE — אני · התיק שלי · הסיפור שלי (delta 90-H, 25.9.2026)
- Two destinations, one dossier: HUD `אני` (`data-life="me-open"`) and `התיק` (`profile-open`), LifeMenu rows `menu-me` / `menu-profile`, bedroom bag → bag. `useLifeSheets.openMe/openBag/view`. No tab between them; each header has a door to the other; phone swipe turns the page.
- `components/life/ProfileCard.tsx` is the ROUTER only; everything it draws lives in `components/life/profile/*` (shell, motion, objects, pages). CSS for the layer is `components/life/profile/personal.module.css` (house tokens only, scoped reduced motion).
- Readings: `lib/life/profile.ts` stays the one number→word translator; `lib/life/personal.ts` composes (identity, path map, constellation, story, bag). No figure is returned to print; nothing Pugi doesn't know (routes appear once offered, chapters once lived, unreached stages unnamed).
- `presence` is biography: it is drawn in אני → הסיפור שלי, never in the bag.
- The header keeps the literal "לסגור" button (`t('life.profile.close')`) — `scripts/life/playthrough.mjs` closes the bedroom bag by it.
- Page state (which half/page) is React only, never saved. Session memory of the last identity/paths (for the one-time strike-through / "משהו השתנה") is module-level, not in the save.
- Tests: `tests/life-me-bag.test.ts`. Spec + decisions: `docs/life/LIFE-PERSONAL-SYSTEM-UPGRADE.md`.

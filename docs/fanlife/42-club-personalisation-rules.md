# Making a club page personal — the universal rules (8.10.2026)

Owner brief: each club entrance gives a full The Worker experience adapted to that club — emotion, attachment, a personal
collection, a personal card, a community, and every gate connected to every other. Not a fixed stencil: each club sees the
thing that matters most to *its* supporters emphasised.

## 1. What The Worker actually does (read from its code, not guessed)

| Layer | Worker source | What it makes the supporter feel |
|---|---|---|
| Opening | `Intro`, `ArenaEntrance` (overlay over a finished page, once per session) | I am walking into *my* ground |
| Now | `NowLayer`, `lib/daily` | The club remembers today: one thing to remember, choose, discover — anchored on a real dated match |
| Returns | `Returns` (saved archive item, LIFE resume, one soft memory line) | It was waiting for me |
| The wall | `lib/gates.ts`, `GatePlate`, gate 5 = the curva with the full bill | The loved gate is bigger than the rest; the others are doors, not a menu |
| One ledger | `emit()` → `lib/profile/store` → records | Every game writes to the same personal file |
| Words, not scores | `memoryMap` (words at sizes), `standing` (season-ticket ladder: days > gates > rounds) | Love before competition; nothing can be bought or ground |
| The card | `/tik` member book, issued once, member number never re-minted | This is mine and I do not want to lose it |
| Collection | assemble a shirt in gate 4 → it enters gate 5; "I was there" stamps | I own pieces of the club's history |
| Next step | `lib/results` RECOMMEND (deterministic, every href checked by `lib/links`) | Every ending opens exactly one or two real doors |
| Honesty | rule 11: never invent; empty states say so | I can trust it |

## 2. The universal translation (FAN LIFE)

1. **Beloved gate.** The club's own terrace gate, *read from its sourced `world.json` terrace line* (Hapoel Tel Aviv Gate 5, Olympiacos Gate 7, Panathinaikos Gate 13) — never typed in code. It takes the big plate at the top of the wall (`lib/clubs/beloved.ts`).
2. **The shirt is the loved game.** Behind the beloved plate hangs the most personal game: design your own shirt (`kit-builder`); fallback `kits`, then `archive`. A club with no numbered terrace still gets a ★ plate for the shirt.
3. **Open gates first, closed gates "Soon".** All 13 hang on every wall; closed ones sink to the end and are never links.
4. **Today at the club** (`lib/clubs/today.ts`): the club's own dated moment for today's calendar day, else the nearest within 14 days with its *real* date, else nothing. Only exact-dated, approved, conflict-free rows (TI-R01). Plus one deterministic round of the day.
5. **Your card at this club** (`SupporterCard`): three numbers — gates walked, rounds, "I was there" — from this device, a "next gate" door, and an empty state that invites instead of showing zeros. No ranks bought, no ladder that unlocks content.
6. **Entrance.** Two gate leaves in the club's colour, once per session per club, skippable, off under reduced motion.
7. **Colours.** The club's own colours everywhere on its pages; never a rival colour from `identity.json colorPolicy.rivalIdentityColors` (rule 95).
8. **Voice** comes only from `world.json` (rule 100).
9. **Never invent** (rule 11): a club with no dated rows gets no "Today" moment; no terrace gate number gets no number.

## 3. Setup checklist for every new club (a club is not "personal" until all are true)

- [ ] `world.json` with a terrace line (≥2 publishers). If the terrace is a numbered gate, the number is in `terrace.name` ("Gate N").
- [ ] `identity.json` with colours and `rivalIdentityColors`.
- [ ] ≥3 exact-dated timeline rows (so Today and Timeline can speak); more is better.
- [ ] `kit-builder` playable (≥5 sourced kits) — otherwise the shirt plate falls back and the club loses its best hook.
- [ ] LIFE skin registered in `lib/clubs/life/packs.ts`.
- [ ] Launch defaults regenerated (`scripts/master/launch-defaults.ts`).
- [ ] Look at the home page at 390px and 1440px: entrance, Today, beloved plate, card.

## 4. Where each club stands today

| Club | Terrace | Beloved plate | Shirt game | Dated moments |
|---|---|---|---|---|
| Hapoel Tel Aviv | Gate 5 | 5 ★ | open | 3,080 |
| Olympiacos | Gate 7 | 7 ★ | open | 73 |
| Panathinaikos | Gate 13 | 13 ★ | open | 445 |
| AEK, Celtic, St. Pauli | no researched terrace file | ★ shirt (no number) | open where kits are playable | 835 / 90 / 18 |
| Hapoel Petah Tikva, Zrinjski | terrace named, not a gate number | ★ shirt | open | 69 / 82 |

## 5. Known limits / open

- **Numbers are per club (owner, 8.10.2026).** The wall's printed numbers start as The Worker's, then `wallNumbers()` gives the featured game the club's own terrace number and the game that held it takes the vacated one (Olympiacos: shirt designer 7, terrace vote 4). Still 1–13, each once; display only — links, access and data go by gate key. If the club's number is already a shirt gate's (Hapoel: 5 = the shirt collection) nothing moves.
- Greek clubs' terrace research beyond Gate 7 / Gate 13 (AEK, etc.) needs a sourced `world.json` before a number can be shown.
- Shirt closet/market/auction are account-backed; the card counts only this device until sign-in.

## Compact club-home standard (9.10.2026)
Every club home (new clubs inherit it, no per-club work) is in this order: small hero → slim next-match card → slim "Today at the club" → narrow LIFE band → the gate wall (beloved gate first) with the AWAY DAYS square last (open for Hapoel Tel Aviv, SOON stamp elsewhere until a club has its own away data) → supporter card → terrace. No "The games" or "Shirt corner" sections; the shirt game lives in the beloved gate. Styles: the "compact standard" block at the end of `app/club-app.css`.

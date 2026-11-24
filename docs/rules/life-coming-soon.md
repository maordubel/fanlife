# LIFE is closed to the public: Coming soon only

**Owner, 24.11.2026.** "LIFE must stay closed to the public. COMING SOON only." (The switch itself: 9.11.2026.)

- One switch decides: `life` in Settings → Features, read through `lifeOpen()` (`lib/clubs/life/entry.ts`). Off = nobody enters but the owner's preview. Only the owner turns it on.
- **Every LIFE address asks it first**: a club's `/clubs/<club>/life` and the old `/life`. Closed, both render `components/clubs/LifeSoon.tsx` — "Coming soon" — and resolve nothing of the game. Before 24.11.2026 the club address answered 404 and `/life` had no door at all (it answered the public with a server error).
- **Every LIFE door says Coming soon and links nowhere** while closed: `lifeEntry()` returns `{state:'soon', href:null}`.
- A club that gets a LIFE cast (a promotion, `promote.ts --complete`) is not opened by that: its cast is `proposed` and the switch still decides.
- A new LIFE route, API or share page starts with `lifeOpen()`. `tests/life-coming-soon.test.ts` holds the two pages to it.

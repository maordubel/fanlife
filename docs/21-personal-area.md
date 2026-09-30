# 21 · האזור האישי — אני · התיק שלי · מפת הזיכרון · זיכרונות · דרכון LIFE

ONE RED WORLD §24–§26, §23.3, §35, §46 (28.9.2026). Not LIFE's in-game "אני / התיק" (rule 90-H) —
this is the site's personal area.

## Two destinations (§24)

| route | what | file |
|---|---|---|
| `/tik` — **אני** | the card (name, number, fan since — `CardTabs`, unchanged), how the terrace sees you (`PublicIdentity`), position + favourite (gate 7's seal), "הכרטיס שלי" (sealed/open → `/polls`), the stand link (read-only, if any), the memory map | `app/tik/page.tsx`, `components/profile/MeArea.tsx` |
| `/tik/file` — **התיק שלי** | memories, the LIFE passport, `KeptPanel` (XI, kits, saved archive, souvenirs, goals, routes), trivia history, timelines, debates, challenges | `app/tik/file/{page,FileArea,actions}.tsx` |

`components/profile/AreaSwitch.tsx` sits at the top of both. Old links keep working (rule 26):
the tab bar's `/tik` prefix lights both, and `/tik#kept` (the retired "מה ששמרתי" tab) is sent to
`/tik/file` on arrival. Layouts are separate, not scaled: phone = one column, memories as a rail,
the map as a column of lines; desktop = shelves beside a sticky aside, the map as one poster.

## Privacy (§35)

- `lib/profile/identity.ts`: `AccountIdentity` (id, email — only on the account plate) vs
  `PublicSupporterIdentity` (`kind/mode/label/no`, nothing else). **Default anonymous.** Label =
  nickname when chosen, else `אדום #N`; on a device with no account there is no N and the label is
  `אדום` — never an invented number. Device copy `worker.public.v1`; newest edit wins.
- `lib/portal/public-sync.ts`, registered in `SYNC_HANDLERS`.
- **Migration `supabase/migrations/20260928130000_worker_public_identity.sql`** (additive, `worker_`
  only, nothing on `auth`): `worker_profile.supporter_no` (issued once from its own sequence,
  frozen by trigger `worker_profile_c_public`, like `member_no`), `public_mode` (default
  `anonymous`), `public_nickname` (≤18), `public_edited_at`. Writes only through
  `worker_public_identity_set` / `_me` (authenticated). **`worker_public_label(uuid)` is how a stand
  learns who someone is** — `{label, no, mode}`, never id/email/account name, granted to nobody
  (call it from a `security definer` function). Self-check line: `public_columns 4 · public_functions 4 · anon_can_call 0 · auth_triggers 0`.
- DB assertions: `supabase/tests/60-public-identity.sql`, wired into `scripts/db/verify.sh`.
- Guard: `tests/personal-area.test.ts` scans `components/share`, `lib/share`, `lib/og`, `app/api/card`,
  `app/c`, `components/stand`, `app/stand` for `email` / `user_id` / `userId` / `.user.id` /
  `auth.getUser` / `currentAccount`.

**Owner step (click-only):** Supabase → SQL Editor → paste
`20260928130000_worker_public_identity.sql` → Run. The last line must read `4 | 4 | 0 | 0`. If the
collector or blind-cow file is ever re-run, run this one after it.

## Records → map → memories

- `lib/profile/records.ts` — `recordsFrom(raw, resolve?)`, pure, garbage-proof; the one fold of every
  store (profile, `worker.xi.v1`, `worker.kits.v1`, ballot + seal, `worker.debate.v1`,
  `worker.daily.v1`, Rumble's recent runs, the LIFE log). People are compared by canonical id:
  `fileExtras` resolves slugs/ids through `resolvePlayerId` (rule 7).
- `lib/profile/memoryMap.ts` — **the only translator** (§25). Seven grounds (ידע, זיכרון, טקטיקה,
  היסטוריה, רגעים, זהות, אספנות) → a word and a size token (`quiet/spark/present/strong/deep`) and a
  door. No number leaves it; `MemoryMap.tsx` imports only the reading. No "Fan Score" anywhere.
- `lib/profile/memories.ts` (§26) — one Hebrew line each, no points, no totals, no progress: לא
  שכחת (100 correct), עוד חולצה חזרה (10 shirts), עמוק בארכיון (50 archive cards), אותו שם חוזר
  (same man in XI + slip + Rumble), עוד שבת אחת (7 daily days), הייתי שם שוב (a completed LIFE
  chapter + one of its ids opened in the archive/gate 8), החוט נסגר (a Red Thread route), plus
  חתמתי, ככה זה קרה, נשאר אצלך, שבעה שערים, מה אתה אומר?. The test builds each from raw storage
  fixtures through `recordsFrom` — reachable from what the gates write.
- Rule 63B: nothing here is a single score; `tests/life-share.test.ts` untouched.

## LIFE passport (§23.3)

`FileArea` sends only the chapters the device's save **completed** (`readCompletedChapters`);
`fileExtras` answers with `bridgeOf(chapter)` cards (year, card date, archive moments). Nothing ahead
is named. Lived ids also feed "הייתי שם שוב".

## Home

`NowLayer` gets at most one soft line: "מהתיק שלך: <memory>" → `/tik/file`, only when a memory is
reached (`softLine`).

## Stand link seam

`lib/profile/standLink.ts` reads any `worker.stand*` key read-only and links the first invite code
(`/^(?=.*\d)[A-Z0-9]{4,12}$/`) to `/stand/<code>`. When the stand module lands, storing
`{ code }` under a `worker.stand…` key is all it takes; nothing else is imported either way.

## Checks

`tests/personal-area.test.ts` (37) · `scripts/db/verify.sh` (23 new assertions) · tsc · vitest · lint.
Screens checked at 390×844 and 1440×900 (no overflow, no page errors).

# 20 · "היציע שלי" — קבוצות חברים

ONE RED WORLD §1, §7.3, §8, §30–§35, §45, §48, §50, §58 (28.9.2026). The Worker doesn't replace
WhatsApp. It supplies what the chat there talks about: the same "היום בהפועל" for a handful of
friends, a group result, the stand's own debate, "השבוע ביציע", shared goals, and what two people
have in common. There is **no chat, no private messages and no followers** (§45 "not in the MVP").

## Where things live

| layer | files |
|---|---|
| database (the referee) | `supabase/migrations/20260928120000_worker_stands.sql` · test `supabase/tests/60-stand.sql` (in `scripts/db/verify.sh`) |
| server | `app/stand/actions.ts` (actions, httpOnly cookie) · `lib/stand/server.ts` (`server-only`, forwarder + labels) |
| shared, client-safe | `lib/stand/contract.ts` (cleaners = the SQL checks) · `week.ts` · `story.ts` · `debate.ts` · `local.ts` |
| screens | `/stand` (`components/stand/StandIndex.tsx`) · `/stand/<code>` (`StandHome.tsx`: guest / member) · `WeekCard.tsx` |
| hooks into existing screens | `components/share/StandPost.tsx` (one element + its import in `ShareRow`) · `components/home/StandHooks.tsx` (one line in `NowLayer`) |
| tests | `tests/stand.test.ts` · `scripts/stand/invite-probe.mjs` (Playwright, 390×844) with `scripts/stand/pg-rest-shim.mjs` |

## Privacy model — a decision, with the reasoning

**Who is counted: a device key, not an account.** This was chosen on purpose, from the two
options the brief allowed:

- **The way gate 10's duel does it.** On the first join or create, the Next server mints a random
  32-hex key and puts it in the httpOnly cookie `stand_me`. The page can't read it and never sends
  it. The server passes it to the functions, and **the database keeps only its sha256**
  (`worker_stand_me`, a salt of its own). Just opening a link mints nothing.
- **Why not the Google account.** (1) No wall in front of play or in front of the group (§50, §58.11):
  whoever gets the link on WhatsApp is inside in one tap. (2) `lib/portal/device.ts` has already ruled
  that the device and the account never travel in the same request. Tying membership to the
  account would have turned an anonymous stand into an identified one. (3) An anonymous DUBID user
  counts as `authenticated` in the shared project (rule 90). With a device key the question doesn't
  come up at all, because nothing here reads `auth`.
- **The price, stated plainly.** Membership belongs to the device. A phone and a laptop are two
  members, and clearing site data means leaving the stand. Moving a stand to an account can come
  later as a single link, `worker_market_uid()`, and it isn't built.

**Public identity (§35).** A member appears only as a nickname or as **"אדום מהיציע #N"**. N is the
join order **within that stand**, not a global number, so two stands can't be linked into one person.
There is no `user_id`, email, name or account column anywhere. Nothing that leaves the database
carries a hash or a key (checked in `60-stand.sql`).

**One public identity (28.9.2026).** The personal area (`docs/21-personal-area.md`,
`lib/profile/identity.ts`) already gives a supporter ONE public face: a nickname they chose, or the
account-wide **"אדום #N"**. The stand now follows it instead of asking again:

- **The default nickname is the public one.** When this device's public mode is `nickname`, the
  create and join forms open with that nickname filled in (`defaultStandNick(readPref())`,
  `lib/stand/contract.ts`), cleaned by the stand's own rule (20 characters, no `@`). Anonymous →
  the field stays empty and the stand prints its own fallback. Nothing about the account crosses:
  the value is read from the device's own `worker.public.v1`, and the form sends a nickname, the
  same field it always sent.
- **Per-stand override.** "לשנות את הכינוי ביציע הזה" on the member screen re-joins with the new
  nickname — `worker_stand_join` on an existing member already updates only `nickname`, so this
  needs no new function, no new privilege and no SQL change. An empty field returns to the
  anonymous fallback in that stand only.
- **Two numbers, two words.** The anonymous fallback used to print "אדום #N" — the same words as
  the account-wide supporter number, with a different N in every stand. It now reads
  **"אדום מהיציע #N"** (`stand.member.anon`), so a stand's join order can never be read as the
  supporter number (`tests/stand.test.ts`). The account number is not shown inside a stand at
  all; linking the two would join the stand to the account, which the device-key model exists to
  prevent.

**What gets stored (the minimum), per member per day:** which of the three daily items were done;
the daily Blind Cow result (status, clues, wrong guesses); the choice in the stand's debate. Per
week, which stations were closed. Retention is 60 days. Someone who isn't in any stand has nothing
stored (`not_member`).

**What stays closed:**
- The daily Blind Cow: a member who hasn't finished it sees only how many have finished. The answer
  isn't stored here at all. The result is read on the server from its own sealed cookie
  (`bc_daily`), not from the page, so a stand sees exactly what the server graded.
- The stand's debate tally is returned only to someone who has already voted on that debate.
- A post to the stand is a link on this site (a path, checked against a regex) plus a result line of
  up to 48 characters, with no line breaks and no `@`. It is not a message.

**Honest limits:** in a stand of two, the group tally shows your friend what they picked. That is
built into a two-person group, not a leak. A member can call the functions directly and misreport
**their own** daily. They can't touch anyone else's. The Blind Cow is protected because the
normal path goes through the server's cookie, and in a friend group with no public leaderboard
that is the right trade-off.

**Limits against flooding:** 5 new stands a day per device, up to 12 stands per device, up to
60 members per stand, 30 joins an hour, 30 posts a day, and the feed keeps the last 50 posts.
Every refusal is returned as a value (`{ ok:false, error }`), never as an error.

## What the screen shows (every number comes from real rows, §58.12)

- **What's happening today:** "היום בהפועל" (the existing `DailyCard`), the stand's debate (the day's
  choose slot if it is a debate; otherwise the first debate of a round pinned to the date, via
  `lib/stand/debate.ts`), and challenges that were posted to the stand. "עוד N מהיציע לא נכנסו לזה"
  is the soft wording.
- **The group result:** the headline is a group story (`lib/stand/story.ts`): "8 מהיציע שיחקו",
  "כולכם זיהיתם", "N זיהו לפני רמז 4". Under it is a compact ranking of clues only, for someone
  who has played. There is no winner line.
- **"השבוע ביציע"** (§31): five stations from gates 2/3/4/6/8/10/13, dealt by the ISO week of the Israel
  date. The deal is identical for everyone, including solo play (`/stand`). The recap reads
  "ככה היציע שלנו זכר את השבוע." (solo: "ככה אתה זכרת את השבוע."), with a station nobody has played yet.
- **Together** (§32): five different people played the daily this week · all five stations were closed by
  someone · ten Blind Cow identifications · the whole stand voted in today's debate. On completion:
  "היציע סגר את זה ביחד."
- **What the stand remembers:** days played together this month, a debate everyone agreed on, and the
  debate that split the stand.
- **What came back from the archive:** today's discover item.
- **What connects you** (§33): facts about the two of you: identical rounds you both posted, days you
  both played, who catches the Blind Cow earlier, how many debates you agree on. There is no W-L.
- **Home screen** (§34): "N מהיציע X כבר שיחקו היום" and "השבוע נשארה לך תחנה אחת", only for a device
  that is in a stand. No streak and no pressure.

## Maor's steps — clicks only, no terminal

1. Supabase → the **Dubid** project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/20260928120000_worker_stands.sql` on GitHub, click **Raw**, select all,
   copy, paste into the query, and click **Run**.
3. The last line of the result should read:
   `stand_tables 6 · stand_open_functions 8 · anon_can_touch 0 · auth_triggers 0`
   Any other result means don't continue; send a screenshot.
4. **Order:** run this file **after** all the earlier files that were already run. It is standalone
   and touches nothing else. **If you ever run `20260922120000_worker_collector_market.sql` again,
   run this file right after it**, because that file revokes access to every `worker_` function it
   doesn't know.
5. Nothing in Vercel: no new environment variable. The stand uses the existing
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Until the file is run, `/stand`
   says the stand isn't connected to the server yet, and everything else plays as usual.

## Local checks (for whoever writes code)

```
PGHOST=/tmp PGPORT=5499 PGUSER=postgres WORKER_TEST_DB=worker_verify_stand scripts/db/verify.sh
PGHOST=/tmp PGPORT=5499 PGUSER=postgres STAND_DB=worker_verify_stand node scripts/stand/pg-rest-shim.mjs 54377
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54377 NEXT_PUBLIC_SUPABASE_ANON_KEY=probe npx next dev -p 3217
node scripts/stand/invite-probe.mjs http://127.0.0.1:3217 http://127.0.0.1:54377
```

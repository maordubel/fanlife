# The Worker — delta 3, 1 Sep 2026

Unzip over the repo root, then delete the files listed in `DELETE-THESE.txt`.
`npm run typecheck && npm run test && npm run build`.

---

## 1 · משחק השנאה — your ranking, verbatim

`content/manual/enemies.json` is rebuilt from the list you sent. **56 rows, and
`terraceRank` is your order, 1 to 56** — not an editorial guess. The two corrections are
in: **ים מדר** (he is not on the fifty, so the row went when the file was rebuilt) and
**אמיר גרוס כבירי** (was filed as עמיר). The six extras — אייל צור, יוסי אבוקסיס,
איתן טייב, מאיר כהן, הפועל בית שאן, אמיר גולה — sit at 51–56.

Each row carries your charge in the terrace's voice, plus what a source states, plus the
source URL. Three rows have no sourced detail (וויצ'יץ', ארל ויליאמס, אמיר גולה) and the
plate prints the charge alone rather than inventing a record. **For אמיר גולה: no source
anywhere ties him to injuring שלום תקוה. A rough date or competition from you would very
likely close it.**

The bracket now draws four from the top half of your ranking and four from the bottom,
so with 56 names no two runs look alike.

Research found the thread you were pointing at with the three extras: **משחק השרוכים,
2.5.1998** — Beit She'an lost 3–2 to Beitar at a neutral ground, Tayeb tied his laces at
midfield as the equaliser went in, and 2 May is marked on the terrace as a day of
remembrance for corruption. Tayeb, Meir Cohen and Beit She'an all trace to that night.

## 2 · המשחקים — a real loop, not a form

`lib/game/session.ts` is now the loop behind a run, and every part of it is there
because you said the games were boring:

- **אין כפתור "הבא".** A correct answer advances itself after 900ms. The run does not
  navigate at all — all twelve questions are dealt at once (answers stripped on the
  server) and played on one screen. A page transition is a full stop.
- **שלושה שלבים שמתקשים**, with a full-bleed card between them naming the new rule.
- **שלושה פנסים.** A wrong answer costs one. At zero the run ends. A free wrong answer
  is why the old rounds felt weightless.
- **מכפיל רצף** 1× → 4×, and a clock per question that tightens 20s → 15s → 11s. Answer
  fast and it pays more.
- **תנועה** — points burst off a right answer, the plate shakes on a wrong one, the
  stage card slams in. All of it off under `prefers-reduced-motion`.
- Game screens run `<Screen chrome={false}>`: no masthead, no footer. On a phone those
  were eating a third of the glass.

## 3 · החולצות — the rack, and the full strip

The designer opens on **a rack of eight real Hapoel kits** read off the references you
sent: אתא with the white sleeves, the 2010/11 Champions League shirt, the red-white
stripes, the tonal hoops, the plain Adidas, the printed shoulders, Fujitsu, the 1992
sash. One tap puts any of them on the screen. There is a **הגרל חולצה** button.

`KitStrip.tsx` draws the **full kit** — shirt, shorts, socks — because every reference
you sent shows a strip and a shirt alone reads as a mockup.

`colours-of-football.com` returns 403 to automated reads. I did not circumvent it; the
kit vocabulary came from your images instead, and that is recorded in CLAUDE.md rule 20
like any other blocked source.

## 4 · הסטוריז — the six templates, implemented

`lib/share/story.ts` is rebuilt on `The Worker - Story Templates.dc.html`: five grounds
(`score` cream · `grass` · `ink` · `kit` silkscreen · `year` vermilion), each built as
**headline · one graphic · credit strip**, with the handoff's **260px safe zone** top and
bottom where Instagram's interface sits. Type is skewed and printed twice — ink under at
a hard offset, colour over. That is the second plate, not a drop shadow.

The kit template draws your actual shirt on the card, from the same path data the app
uses, so the shirt on screen and the shirt on the story can never drift apart.

Every gate now has a template: trivia → score with the twelve-mark punch grid, hate →
ink, kits → silkscreen, timeline → year, lineup → grass, memory → ink.

## 5 · טריוויה — the two shapes you asked for

Both from last time, now inside the run: the quote question ("הנה לאלא", sourced to you)
and multi-select — six options, exactly three right, all-or-nothing, with the reveal
marking which three.

---

## Still open

- **אמיר גולה / שלום תקוה** — needs a date from you.
- **wiki.red-fans.com** still 403s. It holds the shirt numbers, the chants and the older
  grievances. Emailing the Red Fans owners is the highest-value unblock in the project.

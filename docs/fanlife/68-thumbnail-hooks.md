# 68 · Thumbnail hooks — one engine for every category

Owner, 5.11.2026: *"When a thumbnail image is created there must be a HOOK tied to the club / the story / the event, to
grab attention — for all categories."*

`scripts/football-stories/studio/thumbs/` makes every thumbnail of the channel: documentaries (VOX and classic),
CLASSIFIED, I WAS THERE. PIL only — no browser — so the tests run it and every runner can.

| Category | Called from | Files (same names as before) |
|---|---|---|
| Documentary | `studio/pipeline.py` → `package.thumbnails` → `thumbs.for_film` | `out/thumbnail-1..3.jpg`, `thumbnail-short.jpg`, `thumbnails.json`; `youtube.json` → `thumbnails` |
| CLASSIFIED | `comic/produce.py` → `thumbs.for_classified` | `out/thumbnail-1..3.jpg`, `thumbnail-short.jpg`, `thumbnails.json`; `youtube.json` → `thumbnails` |
| I WAS THERE | `matchday/film.py` (run by `vlog_auto.render`) → `thumbs.for_vlog` | `<cut>/thumbnail.jpg`, `thumbnail-2.jpg`, `thumbnail-3.jpg`, `thumbnail-short.jpg`, `thumbnails.json` |

The studio stores `thumbnail-short.jpg` beside the three (the desk shows it; a post can carry it).

## 1 · The hook — from the record, never invented

Three hooks a film, each a different kind, each with different words (`hooks.film_hooks`):

- **score** — the strongest moment (`story.moments[0]`): the scoreline as a chip read from the club's side ("4–1"),
  the opponent under it, and what that night WAS: `CHAMPIONS!` (a title-deciding night with a league honour won),
  `CUP WINNERS` (a final whose cup the honours record), `REAL MADRID HELD`, `THE NIGHT IT ENDED`, `DERBY DAY`,
  `THE LATE WINNER`, `THROUGH!`… — one line per reason the story block proved (`hooks.stake`).
- **emotion** — the writer's own thumbnail concept (`script.thumbnails[].text`) when it passes the checks; else what
  the season carried (`THE DOUBLE`, `8 IN A ROW`, `10 UNBEATEN`), a man's brace or hat-trick, the competition's night.
- **question** — only one the record answers: `WHO STOPPED THEM?` needs a run that a defeat ended,
  `HOW DID THEY COME BACK?` a proven comeback, `WHO WON IT LATE?` a late winner; else `HOW DID IT END?`.

Every hook passes `hooks.check_hook`: at most four words; every number in its words, chip and kicker is in the claims
it cites (`script.claim_numbers`); every club, person, month, weekday and weather word is in those claims
(`script.cited_words`); a hook citing a claim the ledger does not hold is refused. A writer's concept that fails is
dropped, not softened. CLASSIFIED's hooks are the approved script's `package.thumbnails` (the owner approved every
word). An I WAS THERE hook reads the episode's fixture: the scoreline, what the goal list proves (`FROM 0–3 DOWN`,
`THE LATE WINNER`), the episode's own line (already checked by vlog_auto), and `WERE YOU THERE?`; any number on it
must be in the fixture or the episode's sources.

## 2 · The picture

`art.documentary_picture`, in order: the story pack's press photograph (`pack-<club>`, faces as they are) → the Drive
library's `thumb-hero-{penalty,europe,derby,trophy,despair}-kr` for the moment's tag (painted in the club colour; the
words go on the right third the hero leaves empty) → the film's own art and the common paper-cut set by mood (a home
European night is not shown with an away end) → the era's ground (never a later one) with a library cut-out in front →
the house terrace. The three variants never repeat a picture (a piece and its `-b-` take count as one).
`cinema/library.py` now keeps `thumb-*` pieces as class `thumb`; the film's animation never takes one.

The club's colour is the plate, the kicker and the pen (`vox.compose.Ink`: rival families are never the accent); the
crest comes from `public/crests/` (the club pack's art, never re-drawn); every saved file is checked for the club's
banned families and scrubbed when the picture brought one in (rule 95; no yellow on Hapoel, rule 8).

## 3 · The looks

- **VOX documentary** — torn newsprint card with tape, highlighter under the key word (multiply), ONE pen stroke:
  a loop round the score, an underline under the emotion, an arrow from the question to the figure.
  **Broadcaster**: the score is a TV scorebug (club · score · opponent · FT). **Terrace**: warm paper.
  **Trailer Cut**: letterbox bars, the title tracked wide.
- **CLASSIFIED** — the manila case folder (tab in the tone's colour, LAUGH / WAR / HEART), the hook big on it, a
  redacted `SUBJECT:` line, the evidence photo clipped in with a red loop, the CLASSIFIED stamp; the library's
  `thumb-classified-<tone>` desk behind it when synced.
- **I WAS THERE** — the owner's frame, viewfinder corners and REC, the `I WAS THERE` stamp and `EP.n`, the scoreline
  chip, the crest and the ground.

Each has a 1080×1920 Shorts cover (picture above, hook on the paper below, the score on the seam).

## 4 · Legible at 168×94

`render.legibility` downsizes the finished picture to YouTube's smallest thumbnail and measures, per line of the hook
and the score chip, the letters' height in pixels (≥ 9) and their contrast against what is around them (≥ 3:1, WCAG
large text). It is written into `thumbnails.json` per file. The headline picks the line break (1–3 lines) that sets
it biggest in its box. Tests: `studio/tests/test_thumbs.py`.

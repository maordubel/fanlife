# Football Stories — the Director's Cut (contract, 4.11.2026)

Owner, 4.11.2026: *"The studio's own films are boring — no animation, no film atmosphere, a dull display of information,
results not always shown in graphics, no tables, no story, it just reads results. Upgrade drastically. We have thousands of
graphic assets. The script must always be interesting, gripping, entertaining, funny when possible, dramatic when possible,
tense when possible. A director who thinks like a football fan, sees the full picture — the critical matches, that season's
rivalries, the season's matches, the rise and fall in the table and in form. Think like a sports-channel director, a sports
documentary director, a director of football trailers."*

Two workstreams build against THIS contract, in parallel, in separate files:

- **A · the director's brain** — `studio/director.py` (new), `studio/writer.py`, `studio/script.py`, `studio/research.py`
  (only to attach the story block), tests `studio/tests/test_director.py`.
- **B · the cinema** — `studio/edit.py`, `studio/motion.py`, new `studio/cinema/` package, `studio/audio.py`,
  tests `studio/tests/test_cinema.py`.

Neither stream edits the other's files. Both read this file; a change to the contract is a change to this file in the
same PR, announced to the other stream.

## 1. The story block (A writes, B reads) — `ledger['story']`

Deterministic, from the ledger's match claims (no model). Every value is computed from claims; nothing is typed.

```json
{
  "matches": [                       // the club's matches in date order (all competitions)
    {"id": "<claim id>", "date": "YYYY-MM-DD", "competition": "...", "opponent": "...", "side": "home|away",
     "club_goals": 2, "opponent_goals": 1, "outcome": "win|draw|loss",
     "form": 3,                      // the form line after this match: +1 win, 0 draw, −1 loss, cumulative
     "gd": 7,                        // cumulative goal difference
     "rival": true,                  // the opponent is a named rival (club pack rivals) or the brief's opponent
     "tags": ["derby", "final", "europe", "decider", "biggest-win", "worst-defeat", "late-winner", "comeback",
              "turning-point", "streak-start", "streak-end", "first", "last"]}
  ],
  "runs": [{"kind": "unbeaten|winless|wins|losses", "from": "<id>", "to": "<id>", "length": 7}],
  "turning_point": "<id>|null",       // where the rolling form changes most
  "moments": [{"id": "<id>", "why": "biggest-win|derby|final|decider|late-winner|comeback|worst-defeat|...",
               "weight": 0.0}],       // ranked, strongest first
  "rivals": ["Olympiacos"],
  "honours": [{"competition": "...", "result": "..."}],   // honour claims in the ledger
  "acts": [{"name": "Cold open|Act I|Act II|Act III|Epilogue", "ids": ["<id>", ...], "note": "..."}]
}
```

Added by A when it was built (4.11.2026, additive — nothing above changed meaning): `"version": 1`; `"shape"`
(`rise | fall | rise-and-fall | fall-and-recovery | turn-up | turn-down | steady | single | tie`);
`"turning_direction": "up|down|null"`; `"totals"` (`played, won, drawn, lost, for, against, form, gd, form_high,
form_low`); `"note"`. Each match also carries `stage`, and `through` (true/false/null) when it is the second leg of a
two-legged tie the ledger holds both legs of, with `first_leg` (the first leg's id). Each moment carries `also` (its
other reasons, strongest first) and `score` (the raw weight before normalising — comparable across seasons). Each
honour carries its claim `id`. The story is attached by `studio/director.py` in `pipeline.py` after any focus/pick, and
computed again from its own claims for a ledger written before it existed (`director.story_of`).

Rules: a tag or a moment exists only when the claims prove it (a late winner needs a scorer minute ≥ 85 on the deciding
goal; a comeback needs minutes showing the club behind). The form line is **wins minus defeats**, never "points" and
never "league position": the archive holds only the club's own matches, not the league's, so a position the archive
cannot prove is never drawn (rule 11). A final league table appears only from a `table` claim.

How A reads the claims (so B knows what a tag means on screen):
- `derby`: the opponent is one of the club's approved rivals (The Worker's `isDerbyRival` for Hapoel Tel Aviv, else the
  compiled pack's `rivals`, else the pack's `core.json`), matched by spelling — equal once FC/FK/AC… are dropped, or a
  shorter form that starts the full name ("Velež" of "FK Velež Mostar"); never a longer name ("Olympiacos Volou" is not
  Olympiacos). In a rivalry film the film's opponent is the rival.
- `decider`: the second leg of a two-legged tie, a one-off knockout cup round, the night a title was decided, or a
  shoot-out. A group stage is not a tie: home-and-away pairs that interleave or nest (A, B, C, C, A, B) are a group.
- `comeback`: behind at some point and not beaten — proven by every goal's minute on both sides (the opponent's from a
  `match-detail` claim of the same date), or a recorded half-time score; or lost the first leg and went through.
- `late-winner`: won by one goal and the club's last goal came at 85′ or later; with the opponent's minutes, the score
  was level just before it.
- `biggest-win` / `worst-defeat`: the widest margin of the season, at least two goals, at most two matches sharing it.
- `turning-point`: the first match of the new trend where the three-to-five-match rolling form changes most (at least
  two results' worth), or none.
- `streak-start` / `streak-end`: the first and last match of a listed run. Runs: wins/losses of 3+, unbeaten/winless of
  5+ that contain a draw (a run of wins only is listed as wins); at most six, longest first.
- `moments`: one per match, its strongest reason as `why` (`final, title-decided, comeback, late-winner, decider, derby,
  turning-point, biggest-win, run-ended, drought-ended, worst-defeat, europe, last, first`), at most twelve, `weight`
  normalised so the strongest is 1.0. `run-ended` is the defeat after 5+ unbeaten; `drought-ended` the win after 5+
  without one.
- `acts`: `Cold open` = `[moments[0]]`; Act I, II and III split the matches in date order with no gap and no overlap
  (cut by the shape: the fall and the recovery, the rise and the fall, the turn, else thirds); with one or two matches,
  Act I is the first, Act II all of them, Act III the last. `Epilogue` = the honour claims and the last match.

## 2. New visual types (A allows them in the schema and the validator; B renders them)

Data on screen always comes from the claims; the writer chooses WHICH claims and a short label.

| type | fields | what it shows |
|---|---|---|
| `form` | `claims`: 3–12 match ids in date order, `label` ≤ 40 chars | W/D/L tiles flipping in one by one, each with its score; a running W–D–L tally |
| `race` | `label`, `mark`: 0–4 match ids to mark | the season's form line (story.matches[].form) drawing itself left→right; marked matches pop with their score; the turning point glows |
| `versus` | `claim`: match id | face-off before the whistle: two crests/colour fields, the date, the competition, the ground; then the score slams in |
| `goal` | `claim`: match id, `scorer`: index into the claim's scorers | only when the claim names scorers: a clock running to the minute, the net, the name, the score ticking |
| `record` | `claim`: `summary:<competition>` | won / drawn / lost / for / against counting up |
| `run` | `claims`: consecutive match ids, `label` | a streak counter: a tile per match, the number growing |
| `trailer` | `lines`: 1–4 lines, ≤ 5 words each | kinetic title cards (slam, whip, stutter). No number, date or name unless a cited claim holds it |

The new types carry exactly the fields above (no `backdrop`: the art behind a card is the beat's `broll`). Validation
(A): `form` 3–12 distinct match ids in date order; `race` needs a story of 3+ matches; `goal` needs a claim with
scorers and the chosen scorer's minute; `run` 3+ consecutive matches of one streak kind (all wins, all defeats,
unbeaten, or winless); labels ≤ 40 characters; trailer lines are checked for numbers (fact guard), for the name words of
any claim the beat does not cite, and for a month no cited claim is dated in.

The owner's craft (§6) in the schema, added by A (4.11.2026), both optional and validated for every script:
- beat `slug`: a screenplay slug line, `"<place> — <time phrase>"` (em dash), ≤ 60 characters — "Piraeus — the night of
  the final". Every capitalised word must be in a claim the beat cites (or be a month/weekday that matches a cited date,
  or a plain time word); numbers through the fact guard; no weather. **For B:** print it as a slug at the start of that
  beat's shot (typewriter, lower-left), before the visual's own text.
- top-level `motif`: the film's recurring image, ≤ 6 words, no number, month, club or name in it ("a red scarf"). The
  narration returns to it; **for B:** a small recurring mark/caption is optional — the motif is the writer's device first.

A beat may cite the pseudo-claim `"story"` (like `summary:<competition>`): its numbers are the run lengths, the form
line's end/high/low, the goal difference and the matches played. It is not a ledger claim — B ignores ids it cannot find.

Beat-level fields (all optional, all validated):
- `camera`: `push | pull | whip | shake | drift | slow | orbit` — the move the director wants on this beat.
- `pace`: `fast | normal | slow` — fast = hard cuts and quicker motion; slow = held frames, slow push.
- `broll`: an art key (`beat:…`, `clip:…`, `tunnel|terrace-crowd|terrace-empty|supporter`) behind a data card.
- `sfx`: `roar | whistle | groan | gasp | drum | none`.

## 3. Director rules (A's validator enforces; B's edit also guarantees on screen)

1. **Every match the narration names is shown with its score** on that beat: a `matchday`/`score`/`versus`/`goal`
   visual, or (B) an automatic broadcast lower-third scoreline when the beat cites a match claim with another visual.
2. A season film has at least one `race` or `form` and one `record`; a match film has a `versus` and a `score`/`goal`;
   a rivalry film has a `record` (All competitions) and `versus` for its biggest meeting.
3. The film opens cold on the strongest moment (`story.moments[0]`) or with a `trailer` — never on "In the season of…".
4. No visual type more than twice in a row; no three beats without motion of the camera (B: every shot moves).
5. Chapter ends on a question, a cliffhanger or a turn; the next chapter answers it.
6. Humour only from the record or the fan's point of view (self-irony, the absurd fixture, the weather) — never at a
   named person's expense, never invented.

How A enforces them: only a script that declares `"director": 2` (the writer is told to set it); an older script on
disk validates exactly as before. The `follow` and `end` beats the studio adds are not counted.
- Rule 1: a beat whose narration tells a result (a result word — won, beat, lost, drew, defeat, winner, … — and an
  opponent's name) must cite a match against that opponent; every scoreline in the narration ("2–0", "two-nil",
  "one-all") must be the score of a match the beat cites (or a pair a cited claim prints, e.g. an aggregate).
  **For B:** when a beat cites match claims and its visual is not `matchday/score/versus/goal`, the lower-third shows the
  first cited match whose opponent the narration names, else the first cited match.
- Rule 2: by the brief's kind (`season | match | tie | rivalry`), else read off the ledger's focus. The rivalry `versus`
  must be `story.moments[0]`. A season with fewer than three matches is not asked for a race/form.
- Rule 3: the first beat is a `trailer`, or cites `story.moments[0]`; the hook may not open "In the season…", "In 1999…",
  "The 2002/03 season…", "This is the story…".
- Rule 4: no visual type three beats running; no `camera` move three beats running.
- Rule 5: the last line of every chapter but the last ends with `?`, `…` or a dash, or carries a turn word (but, until,
  then, yet, still, only, nobody, what, how, would, could, next, …). "The next chapter answers it" is the writer's craft.
- Rule 6 is a writing rule, in the writer's prompt.
- Also: no weather (rain, snow, fog, sunshine, mud — literal words only, "stormed back" is football) unless a claim
  cited in that beat records it; the same for trailer lines, slugs and pitches.
- Also (rule 11, §1): a beat may not talk about the table, the standings, a place or points ("top of the table",
  "second place", "five points clear") unless it cites a `table` claim. Seen in the first real Gemini script.

## 4. The cinema (B)

- Every shot has camera motion and a backdrop: art from the library behind every data card (`broll`, else B picks a
  fitting `beat:`/`clip:` by competition, venue, mood), parallax where the art has depth layers.
- A broadcast **scorebug** in a corner from the first match beat on: the club's running W–D–L as the story moves.
- Transitions by pace and mood: whip pan, film burn, flash frame, push-through, hard cut on a drum hit.
- A film grade: letterbox 2.35 on cold open and climax, grain, light leaks, vignette, slow-motion on `slow`.
- Goals: shake, flash, crowd roar, a net ripple; defeats: desaturate, hush; derbies: split colour fields.
- Sound: music changes by act (`story.acts`), stings on `trailer` and `goal`, crowd beds under terrace art.
- The 9:16 Shorts reuse the same shot builders.

### 4.1 The moving-art library (owner, 4.11.2026: "real animation — items moving across the screen, arriving, leaving")

The owner's Drive folder **Dynamic Football Fan Art** (`studio/cinema/library.py`) is listed on every run, downloaded and
cut out of its paper once (actions/cache, keyed by the listing), and read by the render through `STORIES_CINEMA_LIB`.
Without it the film is exactly the house edit. The prefix of a file says what it is (`pup-`, `ppl-`, `sup-`, `obj-`,
`era-`, `doc-`, `ins-`, `layer-`, `sky-`, `ground-`, `city-`, `tr-`, `clip-`); `thumb-` is kept for the thumbnails only
(doc 68); `cl-`, `f01-`, `iwt-`, `map-`,
`tex-`, series plates are not used in documentaries. `-kr` pieces wear the club's colour; every piece is scrubbed of the
rival's families.

The plan (`cinema.animate.choose`) gives each shot 1–3 elements by meaning, recorded in `shot.cinema.lib`
(`{key, role: actor|object|scene|transition, motion, side}`): a goal → the striker puppet's kick and the net-ripple clip;
penalties or a save → the keeper's dive, the shoot-out walk; a derby → the capo, the drummer, smoke/flag wipes; a defeat
→ the empty ground, the supporter on the step (in the rain only if a cited claim records rain); memory, records,
chapters → the old man and the child; away and European nights → the city where it was played, the away end, the
European night layers; the season's era → its ground (never one 20 years older). Skies: weather only when a cited claim
records it; a night sky only with a recorded evening kick-off. Silverware only on a final won or an honour claim. No
piece implying an incident the record does not hold (riot line, police, doctor). The recurring supporter (`sup-`) is
one man: never twice in a frame. No piece plays in two shots running; the least-used piece is chosen first.

On screen every element enters (walks in, flies in on an arc, rises, slides in), performs (step bob, kick about the
planted foot, dive, hops of joy, a float), and leaves before the cut, behind the cards and every glass graphic; on chart
shots people keep to the edges and are dimmed. Depth layers (`layer-*-fg/mid/bg`) move against the camera at their own
speeds. A `tr-*` piece is the cut itself (`entry: tr:<stem>`): a full picture slides over as a torn panel, a cut-out
sweeps across and the new shot appears where it has passed. Puppet SHEETS are rigged only from a written
`comic/rigs/<stem>.json`; without one the `-pose` picture performs as one piece.

## 5. Three directors (owner, 4.11.2026)

*"Three directors with a football brain and a film brain, each thinking a little differently; the system runs all three
and gives three scripts; each also proposes the next film and the script he loves most, each time another club and
another event."*

`studio/directors.py` is the one definition: **The Broadcaster** (live thriller, forward in time), **The Terrace** (the
supporters' documentary, warm and wry), **The Trailer Cut** (non-linear cinema, cold open on the climax). The three
script options of a film are one per director (they replace ANGLES_V3; the option's `angle` field carries the
director's name, and `director` its id). Each director also writes **pitches** (studio/pitch.py): the next film he
wants to make — a club and an event no other director pitched that round and no film already made — with a title,
a logline, the cold open and the three acts, and "Make this film" in the studio.

How A built it (4.11.2026): `writer.write_options` runs the three directors in order, each with `directors.brief(d)` and
`writer.DIRECTOR_CRAFT[d['id']]` (how that director builds a film out of the story block) in the brief; a later option
may not repeat an earlier one's hook or chosen title (sent back like any failed check). Options carry `_angle` = name and
`_director` = id; `option_summary` returns `director`. The busy-writer fallback is unchanged (two options are enough when
the third must wait).

For the pitch desk (studio/pitch.py, another stream):
- `director.candidates(club_ids: list[str], seasons_per_club: int = 6) -> list[dict]` — each
  `{club_id, club_name, kind: season|match|tie|rivalry, season, match_ids?, opponent?, story, why, score}`, one per
  (club, kind, season or match), ranked by `score` (story-block raw weights; seasons add honours and runs). Per club: the
  best `seasons_per_club` seasons (6+ matches), the biggest `seasons_per_club` nights, half as many two-legged ties, and a
  rivalry per approved rival met 4+ times (`season` is `YYYY–YYYY`, ready for `research.rivalry_ledger`). Reads each
  archive once (~5 s for a club with 3,400 matches).
- `writer.write_pitch(director: dict, candidates: list[dict], cache_dir: Path, log) -> dict` — returns `{director,
  club_id, kind, season, match_ids, opponent, title, logline, cold_open, acts: [3], why}`; the pick must be a candidate
  index; title ≤ 100, logline and cold open ≤ 240, acts 3 × ≤ 160, why ≤ 300; every number, month and club name must
  come from the picked candidate's own data. Three tries through `writer.call_model`; a busy free tier raises the same
  wait codes as a script (`writer.WAIT_CODES`), a pitch that never passes raises `PITCH_INVALID`.

## 6. The house soul (owner, 4.11.2026)

*"I want the directors to really identify with me — sum up my character and the emotion I express towards football…
so the system keeps speaking from my thinking."* `studio/soul.py` is the owner's football heart, drawn from his own words
over months of work: football as belonging and inheritance, memory as sacred, rivalry lived with pride and wit (never
hate for people), the fan as the hero, every club loved equally; and his demands — precision as respect, never boring,
show don't list, emotion first, bold and original. `directors.brief(d)` puts the soul first, then the director's own
facet of the owner (`owner_facet`), then his craft. Every script and every pitch is written from it. It is a voice, not
a source: it adds no fact, never names the owner and never brings another club into a club's story.
The soul also carries the owner's own storytelling craft (`SOUL['craft']`, from his novel's writing profile, 4.11.2026):
slug lines (date + place), the parallel "meanwhile" cut, the personal moment tied to the real event of that day,
screen-ready moments, headline montages broken into moments, a recurring motif that pays off, pathos punctured by
irony, one strong image per moment, one quotable line, questions instead of explanations, chapters ending on a breath,
heroes who are not clean. On the channel: terrace slang yes, profanity no; no political side; nothing graphic.

## 7. VOX — the documentary look (owner, 4.11.2026: "VOX Style, automatically")

`studio/vox/` renders the same plan (script + ledger + story block + the cinema's `s['cinema']` block) as one paper
board per chapter that a single camera glides across. No new inputs; `vox.engine_for(brief)` makes it the default
(`plan['engine']`), `STORIES_VOX=0` or a brief with `engine`/`visual_style` `classic` keeps the classic edit.

- **Board** (`render.place`): a board starts at the open, at every chapter card and after a shot off the board; panels
  (1920×1080 units each) follow a snake (the Trailer Cut: a diagonal staircase) with a little irregularity. The paper is
  crumpled newsprint with faded archive prints, older cuttings, the season's years in huge outline type and a pencil path
  from beat to beat. Panels already played are baked onto it once per shot (`final-<n>.png`, board resolution 0.7).
- **Camera** (`camera.CameraPath`): a pure function of the layout, so a glide that starts in one shot and lands in the
  next is seamless across workers. Each beat's `focus` keys (where to look, when, how close) are eased in-out; between
  beats it glides with a pull-back and a small overshoot (longer for a longer way); a held frame drifts; a chapter is a
  dive into the paper and a fall onto the next board. Motion blur on fast glides, a zoom blur through the paper.
- **Panels** (`compose.py`, one function per visual type): torn paper cards with soft shadows and tape that slide, drop or
  are stamped onto the board; kinetic words (rise from a mask, pop, slide, stamp), typewriter lines with a block cursor;
  the pen (`Marker`) circles the score, points at the scorers, underlines, brackets a run; a multiply highlighter on the
  winner, the headline, the key words; odometers that roll up and down (the form number rides the form line's tip) and
  split-flap scores that count up goal by goal; maps with dropping pins and the route drawn; the beat's b-roll as a
  printed photograph half under the card; kit cut-outs and the moving-art library's people at the edges in front of the
  board (they move faster than the paper: the depth). Every number is read from a claim or the story block.
- **Duties kept**: the scorebug and the burned captions are glass; contract rule 1's lower-third is a torn slip with the
  scoreline, underlined by the pen; the slug line is typed on its own strip; the grade (letterbox at the climax and cold
  open, hush, leaks, the Terrace's warm paper); `follow` and `end` keep their own designed shots (classic engine) and the
  board hands over with a dissolve.
- **Directors** (`compose.STYLES`): the Broadcaster glides fastest and counts fastest; the Terrace glides slowest, warmer
  paper, more people; the Trailer Cut pulls back furthest and pushes in hardest.
- **Sound**: a whoosh on every glide, `pen` on a stroke, `tick` on a counter or a flip, `paper` when a card lands —
  levelled like every effect (`audio.FX_UNDER_VOICE_DB`).
- **Shorts**: a VOX film's Short takes the middle 4:3 of the frame (the camera keeps what matters at its centre), larger
  on the page.
- **Cost**: OpenCV's warp (Pillow's transform as the fallback) — one board warp and one panel warp a frame. Measured on a
  GitHub runner: a 4.7-minute film, 7,097 frames in 437 s on 4 workers (62 ms a frame).

Look at it without a narrator: `python3 -m studio.vox.stills --club <id> --season <s> --script s.json --out /tmp/v
--shots 0-6 --at 0.2,0.9` (or `--clip 3-6` for an MP4 with the glides). Tests: `studio/tests/test_vox.py`.

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
two-legged tie the ledger holds both legs of. Each moment carries `also` (its other reasons, strongest first). Each
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

## 4. The cinema (B)

- Every shot has camera motion and a backdrop: art from the library behind every data card (`broll`, else B picks a
  fitting `beat:`/`clip:` by competition, venue, mood), parallax where the art has depth layers.
- A broadcast **scorebug** in a corner from the first match beat on: the club's running W–D–L as the story moves.
- Transitions by pace and mood: whip pan, film burn, flash frame, push-through, hard cut on a drum hit.
- A film grade: letterbox 2.35 on cold open and climax, grain, light leaks, vignette, slow-motion on `slow`.
- Goals: shake, flash, crowd roar, a net ripple; defeats: desaturate, hush; derbies: split colour fields.
- Sound: music changes by act (`story.acts`), stings on `trailer` and `goal`, crowd beds under terrace art.
- The 9:16 Shorts reuse the same shot builders.

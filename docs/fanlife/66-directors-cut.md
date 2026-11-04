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

Rules: a tag or a moment exists only when the claims prove it (a late winner needs a scorer minute ≥ 85 on the deciding
goal; a comeback needs minutes showing the club behind). The form line is **wins minus defeats**, never "points" and
never "league position": the archive holds only the club's own matches, not the league's, so a position the archive
cannot prove is never drawn (rule 11). A final league table appears only from a `table` claim.

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

## 4. The cinema (B)

- Every shot has camera motion and a backdrop: art from the library behind every data card (`broll`, else B picks a
  fitting `beat:`/`clip:` by competition, venue, mood), parallax where the art has depth layers.
- A broadcast **scorebug** in a corner from the first match beat on: the club's running W–D–L as the story moves.
- Transitions by pace and mood: whip pan, film burn, flash frame, push-through, hard cut on a drum hit.
- A film grade: letterbox 2.35 on cold open and climax, grain, light leaks, vignette, slow-motion on `slow`.
- Goals: shake, flash, crowd roar, a net ripple; defeats: desaturate, hush; derbies: split colour fields.
- Sound: music changes by act (`story.acts`), stings on `trailer` and `goal`, crowd beds under terrace art.
- The 9:16 Shorts reuse the same shot builders.

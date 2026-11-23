# Football Stories — editing lessons (the log the `football-stories-film-editor` skill reads and keeps)

Every round on the studio's editing adds one entry: what the owner said, what was measured, what changed, what the
numbers became. Newest first. The skill reads this before touching the editor and appends to it after every render.

## Targets (the numbers a film must meet, measured by `qa.experience_numbers` on the rendered picture)

| measure | target | why |
|---|---|---|
| flashes (luma up and back inside 6 frames) | 0 | owner 17.11.2026: "everything flickers" |
| worst jerk | ≤ 130 px | rule 142, VOX's camera guard |
| changes a minute | 10–22 | film, not slideshow and not strobe (was 40 on the failed sample) |
| longest shot | ≤ 12.5 s, moving | `editor.LONG_HOLD` |
| documentary share | ≤ 60% | graphic layer on most sentences |
| story thread | on every chapter with ≥ 3 knots | owner: "connecting lines, storytelling" |
| jump cut to a closer framing of the same picture | never (cold open excepted) | it read as flicker |

## 2026-11-23 · "I want a film, a story" — the raconteur and the archive on screen

- **Owner**: the editing, directing and script are not at the level; smarter, more dynamic, more varied; "I want a
  story"; reference Kan 11's "The Unimportant"; "if it talks about a season it pulls its kit, the card of the player
  it talks about"; the information should talk "in a fun, hypnotic, humorous way".
- **Measured before** (Olympiacos 2023/24, house crew, 239 s): 15.3 changes a minute, 3 flashes (36.6, 107.1, 209.0 s),
  worst jerk 95.8 px, mix 73% documentary / 19% explainer / 8% kinetic, end card 17.9 s. On the sheet: the final was
  ONE beat under one `?–?` board for about 50 s.
- **Cause**: not the picture — the words. The house script read tallies aloud ("18 matches: 11 won, 3 drawn, 4 lost.
  40 goals scored, 18 conceded."), poured the same craft lines over every chapter, and told the final as one 90-word
  beat. The dossier's best material (370 people in Bačka Topola, three managers, a final in AEK's ground) was a list at
  the end of a sentence. One long beat = one board = a slide, whatever the editor does under it.
- **Changed**: `studio/raconteur.py` (the lead house writer: the small door, scenes, a tie as one scene in two acts, one
  dry aside a scene, the night as five short beats); `studio/archive_props.py` + `Adapter.archive_device` +
  `Film.kitdev` / `Film.pcard` (the season's shirt on its hanger, the named player's archive card); the VOX pass lets
  an archive prop fire on a line's first sentence (a name is said there). Rule: `docs/rules/studio-story-first.md`.
- **Measured after** (same club and season, same machine, 299 s): 17.8 changes a minute, **0 flashes**, worst jerk
  **35.2 px**, mix 58% / 26% / 15%, 38 edited beats (was 21), the final in 6 beats with its own pictures. One static
  stretch of 2.2 s at 143.5 s (a held ticket) and the 18 s end card remain.
- **Seen on the sheet, fixed after that render** (not in it): the night's first beat was a `versus` board, which printed
  1–0 before the goal → now a matchday card; the card's numbers sat on its dashed rule; the shirt's label ran into the
  subtitle band.
- **Lessons**:
  1. When the gate passes and the film is still a slideshow, read the script before touching the editor. Beat length is
     set by the writer: a 90-word beat is 40 s under one device.
  2. A prop that listens for a NAME must listen in a line's first sentence; the VOX pass skipped it by rule.
  3. `versus` prints the result. A beat before the reveal takes `matchday`.
  4. A local render stops at the master (the intro lives on Drive): judge `picture.mp4`, mux it with `mix/mix.m4a`.
  5. This machine (2 cores) renders about 3.7 frames a second: a 5-minute film is 40 minutes. Test a device alone first.
- **Next**: match, tie and rivalry films by the raconteur; a wrong-match ticket over the final (the picker took a
  "ticket" by subject with sight off — a picture made for one match should be refused on another); the Europa League
  final of Atalanta 2023/24 is ranked below a cup semi-final because the archive holds no stage for it; clubs with no
  dossier get plainer scenes — the next research wave should add match details (crowd, city, how the goal came).

## 2026-11-23 (later) · "still boring — not enough movement for the eyes" — life in the frame

- **Owner**, on the story-first sample: still boring, the backgrounds are not good enough, not enough movement for the
  eyes, not fun to watch.
- **Measured before** (that sample): moving share 99%, 0 flashes — and nothing INSIDE any shot moved. Every shot was a
  still under a camera glide. The gate's "moving share" counts a glide as movement, so it could not see this.
- **Changed**: `docu/life.py` + `Film.life` (the library's painted crowd rows as a moving band at the foot of the frame,
  falling paper, floodlight beams, flare light, dust and a light leak, the ball in flight), chosen per beat by
  `life.direct` from the score sheet; the story thread's labels no longer overprint each other; the small-crowd
  opening stands on an empty stand; the model writer's brief carries the story-first rules; Status → The engine on the
  studio desk and its four variables on the worker.
- **Measured after** (same film, 299 s): life on 32 of 38 beats, 18.2 changes a minute, 0 flashes, worst jerk 35.4 px,
  0 static seconds. Render 58.5 minutes on 2 cores (was 41): the layer costs about 40% more render time.
- **Lessons**:
  1. First try drew the crowd and flags as vector shapes: they read as clip art beside the library's painted art.
     Life is made from the OWNER'S pieces (crowd-row-*), moved — never from a second, cheaper hand.
  2. A row scaled to the frame's width covered the whole picture when the chosen piece was short. A foreground band has
     a fixed height and repeats sideways; a test holds it under a third of the frame.
  3. A 3D transform anywhere (rotationX/Y, perspective) drops HyperFrames' motion blur to its slow "filter" tier for the
     whole film. Flips are flat (scaleX/scaleY through zero).
  4. `filter: blur()` on a moving element is overridden by the motion blur and leaves square edges: soft shapes are
     gradients. A masked gradient is refused by `test_camera` (the sliced-parallax guard).
  5. A render started with `&` inside a tool call dies when the call returns ("render_cancelled_parent_exited"): start it
     as a background task, and run nothing heavy (tsc, vitest) beside it on this machine.
  6. Run the WHOLE studio suite after the last change, not before it: the guard that failed CI was already there.
- **Next**: the goal replayed from above from the goal-detail contacts (pass, cross, shot, as moving dots and a drawn
  ball path); a picture made for one match refused on another (a Maccabi ticket still stands over the final); a
  picture of rain over a line with no weather claim; the gate should measure movement inside the shot, not only the
  camera; the flags row repainted in the library's hand.

## 2026-11-17 · "everything flickers — more movement, more film, graphic connections, connecting lines, storytelling"

- **Owner**: the VOX-pass sample (HTA 2009/10) is a failure: flickering, bad work.
- **Measured**: 176 s, 116 changes (39.9 a minute), 17 flashes, worst jerk 408 px, a still of 18 s (end card).
- **Causes**: cuts every 2.6 s to a closer framing of the SAME picture (jump cuts); 0.3 s whips/slides/zooms between
  sentences; type and objects popping in bright over dark pictures (0.2–0.32 s); the camera's `snap`.
- **Changed (film mode)**: TARGET 2.6→5 s, MIN_SUB 1.4→2.4, MAX_STILL 4→7, LONG_HOLD 12; no jump cut (the cut goes to
  another relevant picture, else the shot runs on under one move); soft transitions only — dissolve 0.8 s, push
  0.85 s, ink 0.8 s; kinetic words 0.45 s with a 0.7 s veil and a 0.5 s exit; objects enter over 0.8–1.0 s with their
  opacity eased; `snap` never chosen; segments 4–8 s.
- **Added**: the story thread (a hand-drawn line along the top of each chapter with a knot and a key word per
  sentence); a pen line from every object's word to the object, and an arc between two objects.
- **Measured after** (same script, same voice, re-rendered): 51 changes (17.7 a minute, was 39.9), 4 flashes (was 17:
  the turning tint, a score board, the record card), worst jerk 33.5 px (was 408), longest shot 18 s (the end card).
- **Next**: the last 4 flashes (tint/board/record entrances); the 12 s follow card and 18 s end card; the thread larger
  (done: 8 px line, 34 px words) — check on the phone; more accents on a beat's first sentence (mix fell back to 71%
  documentary when segments grew).

## 2026-11-17 · VOX pass (merged #572)

- Segments per sentence, relevant pictures by caption, objects library, club scenes. Mix 48/25/27 — but the cut rate
  doubled and it flickered (see the entry above). Lesson: more graphic ideas must not mean more cuts.

## 17.11.2026 (afternoon) — the atlas: maps that move

- **Owner**: "improve, and take inspiration from the films I attached — the maps, the movement between places, the graphics."
  References: two Search Party films by Sam Ellis (ex Vox Atlas) — *How England's football league is breaking the sport*,
  *How Mexico built the World Cup's best stadium*. The pages were readable; the videos could not be fetched here (YouTube is
  outside the network allowlist), so the style is taken from the series' known language: a printed map, a camera that flies
  over it, routes drawn city to city, pinned paper tags, the country filled as the story reaches it.
- **Before**: a place was a split card (two halves, a bolt) — no map, no movement between places. The house writer never
  named the away cities, so even the split card was rare.
- **Changes**: `docu/atlas.py` + `build.Film.atlas` (one SVG sheet from Natural Earth, camera = an eased viewBox flight,
  tags counter-scaled to keep their size, route drawn with a marker travelling it, destination country filled); `cities`
  becomes the flight when both cities are placed; VOX accent `place` (a city or country the line names, never a club's
  name, at most one flight per 24 s); map beats fly the whole road (`Adapter.journey`); the house writer writes the road
  ("The road ran through Genk, Belgrade and London") from the away matches the place book can place.
- **Owner, same round**: "make sure the flow is smooth, clean, fun."
- **Smooth flow**: the last hard ways in became soft — `fade` 0.35 s → 0.8 s dissolve, `match` → a dissolve on the scale,
  `dive` 0.4 → 0.8 s eased; the score board drops in without the back-ease overshoot; the turning tint and the slammed
  word come up through the picture instead of slamming (the 22 s flash); odometers roll on a sine ease over 2.2 s.
  A map flight is exempt from the card limits (`MAX_CARD`, the card budget) — it was cut to 2.6 s and left a picture
  flashing behind it. The jerk gate's window after a change now covers the 0.8 s soft ways in: a dissolve blending two
  moving pictures was measured as a camera jerk (every jerk over 130 px in this film sat inside a dissolve).
- **Measured** (Olympiacos 2023/24, house writer, same plan, re-rendered): flashes 4 → 2 (left: the map → the next
  picture at 55.5 s, the chapter card at 108.7 s), changes 18.1 a minute, worst jerk 19.7 px on the new window
  (157.6 on the old one; the odometer ease change was not in this render).
- **Next**: Search Party's other devices — the highlighted newspaper clipping, the stadium plan drawn from above, bar
  charts standing on the map; more cities in the place book (only 37 today: every away ground the archive holds should
  have one).

## 17.11.2026 (evening) — the drama desk and a city for every away ground

- **Owner**: "a city for every away ground, so every film with away matches gets a route on the map; everything that helps
  the writer build mini-drama, tension, excitement; very comprehensive research to refine the pipelines."
- **Before**: 43 clubs in the place book; away matches with a known city: a handful per club. The house writer said a
  result with no stakes in front of it ("UEFA Cup, 25 March 2004, away: Celtic were held 0–0 by Barcelona").
- **Changes**: `place_book.py` (openfootball CC0 + GeoNames CC BY) → 913 clubs, 514 cities; away matches placed: Celtic
  99%, St. Pauli 96%, Atalanta 95%, Hapoel TA 94%, Hapoel PT 93%, PAO and Maccabi Haifa 90%, AEK and Olympiacos 88%, Al
  Ahly 78%, Zrinjski 71%, the Moroccan clubs 41–46% (local clubs openfootball lacks). `drama_facts.py` counts each match's
  stakes; the writer says them before the result; chapters tease the next chapter's match. Research:
  `docs/fanlife/studio-drama-playbook.md`.
- **Example lines** (Hapoel TA 2009/10): "The longest trip of the season: 4,000 kilometres from Tel Aviv to Glasgow." ·
  "In October 2009 Hamburger SV had beaten Hapoel Tel Aviv 4–2. Now they met again." · "Waiting ahead: Rubin Kazan, who
  had beaten them 3–0 in February 2010. Was this the night it changed?"
- **Lesson**: the archive is uneven — Olympiacos holds 13–16 matches for some seasons. Without the coverage rule the
  writer would have said "had not beaten Panathinaikos in 2 years" across a hole in the record.
- **Next**: league position before a match; an underdog factor (an archive Elo, or ClubElo through a GitHub Actions job:
  the external sites are blocked from this machine); silence in the mix before the decisive goal.

## 17.11.2026 (late) — the cast, the angle, the dossiers told

- **Owner**: "understand the material, read it right, vary from film to film, find the important points, understand
  football and competition and tension — heroes, tragedies, every film a world of its own."
- **Before**: the dossiers held managers, the centenary, the final's meaning, the crowd, the supporters, the league
  finish — the house writer used none of it. Every season opened the same way. No player was a character.
- **Changes**: `characters.py` (hero, wound, angle) and the writer's `cast_into` / `weave_dossiers`.
- **Lessons**:
  1. The archive names only 33 of Olympiacos' 116 goals in 2023/24. A count would undersell the hero ("15 goals" for a
     33-goal season), so he is named without one.
  2. A motif told in every chapter becomes a refrain: three "the road ran through…" beats in a 5-minute film. Now once.
  3. Director rule 6 refuses lines about the film ("This is the story of…"). Angle lines speak about the season.
- **Open**: ClubElo answered 502 to every request from the Actions runner on 17.11. The weekly job retries.

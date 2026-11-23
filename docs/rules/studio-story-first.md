# Story first: the raconteur leads, and the archive is on screen (owner, 23.11.2026)

Owner, 23.11.2026: *"The editing, the directing, the script do not reach the level. I want a film! I want a story! …
information that knows how to talk in a film in a way that is fun, hypnotic, humorous."* His reference: Kan 11's "The
Unimportant" (small, seemingly marginal items that open onto a big story; archive, a narrator with a raised eyebrow, and
a short animated sequence built to one emotional peak). And: *"if it talks about a certain season it pulls that
season's kit into the film; it pulls the card of the player it talks about."*

**Measured before** (Olympiacos 2023/24, house crew, 23.11.2026): the picture passed the gate (15.3 changes a minute,
worst jerk 95.8 px) and the film was still a slideshow, because of what was SAID: *"18 matches: 11 won, 3 drawn, 4 lost.
40 goals scored, 18 conceded."* The final was one 90-word beat under one `?–?` board for 50 seconds. The ledger held the
370 people in Bačka Topola, the three managers, the final in a rival's stadium, the striker who was a carpenter — and
the script said none of it as a story. The season's shirt and the players' archive records were never on screen.

1. **The raconteur writes first** (`studio/raconteur.py`, `house.LEAD`). The first script of every season film is his;
   the other options stay their directors' own house writers. `STORIES_HOUSE_LEAD=unit` gives each director his unit's
   writer back. A film that is not a season goes to the unit's writer (match, tie and rivalry films are next).
2. **The small door.** A film opens on the smallest true thing the record holds about its biggest night (a crowd you
   could count, the note beside a player's name, a final in somebody else's ground) — a person or a place with a
   number, never the score — and asks how that leads to the night.
3. **Never a tally read aloud.** No "N matches: W won, D drawn, L lost. X goals scored, Y conceded." A stretch is told by
   its matches; the one `form` card and the one `record` card a season film must carry are said like a person says them.
4. **A match is a scene; a tie is one scene in two acts**: what it meant before kick-off (the drama desk's line), what
   happened, who, and the one detail worth keeping (the dossier's city, crowd, deficit, extra time, shoot-out; the goal
   as the goal-detail claim describes it). A scene chosen is told whole — the cut drops craft lines, never half a tie.
5. **One raised eyebrow a scene, never during the goal** (`raconteur.ASIDE`). An aside is a remark on a fact the line
   just said; it holds no name, no number and no event of its own, and each kind is said once a film (director rule 6).
6. **The biggest night is a set piece**: the room (where, whose ground, how many) → the wait → the ball (the minute,
   the goal's own description, the result, a shoot-out) → what it was (the dossier's meaning) → the release. Five short
   beats, two or three of them carrying it. A shoot-out won is joy, not "a draw".
7. **The archive is on screen** (`studio/archive_props.py`, `docu/plan.Adapter.archive_device`, `build.Film.kitdev` /
   `pcard`). The season's shirts (`public/club-kits/<club>/svg`, shirt only) and the film's players (the compiled pack's
   approved record: position, years, games and goals where counted, one hand-researched line about the man) join the
   ledger as claims (`kind: kit`, `kind: player`). When a line says the shirt, the season's shirt comes down on its
   hanger with its season, maker and sponsor; when a line names a player who has a record, his card turns in on his
   name — in the film's first sentence of a line too. Each once a film. A card shows the season's shirt, never a
   stranger's face (studio-pictures §2). A written name two records share gets no card. `STORIES_ARCHIVE_PROPS=0` turns
   the props off.
8. **Life in the frame** (`studio/docu/life.py`, `build.Film.life`; owner, same day, on the first sample: "still boring …
   not enough movement for the eyes"). A glide over a still is still a still: every scene beat carries a layer between
   the picture and the graphics where the scene itself moves — the library's own painted crowd rows as the nearest
   planes (bouncing on joy, swaying when calm, drifting against each other), torn paper falling on a release,
   floodlight beams sweeping on tension, flare light from below, dust and a light leak on a calm shot, the ball in
   flight when the line is about a goal. The life director (`life.direct`) chooses by the beat's emotion on the score
   sheet; never the same set three beats running; nothing over a board, a map or the closing cards; a prop owns the
   foreground and type is read on a calm ground. Only the club's colour, paper and ink (rule 95). Everything eases in
   over 0.8 s; no 3D transforms (they drop the renderer's motion blur to its slow tier for the whole film).
   `STORIES_LIFE=0` turns it off.
9. **The model writer gets the same rules** (`writer.py`, STORY FIRST in its brief): the small door, no tally, scenes,
   the night in short beats, no beat over 55 words, one raised eyebrow, the shirt and the player said so they are shown.
10. **The studio desk shows the engine** (Status → The engine, `lib/stories/engine.ts`): every part, what it does and the
   Actions variable that turns it off; the worker reads those variables.
11. Everything else stands: every number, name, minute and place is a cited claim's (`script.validate_script`,
   `writer.hook_option_errors`), rule 142 (the props ease in and stop), rival colours, the gate.

Held by `studio/tests/test_raconteur.py`. The round's log: `docs/fanlife/studio-editing-lessons.md`.

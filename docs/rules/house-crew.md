# The house crew: three writers, three directors, three editors who never wait for Google (owner, 16.11.2026)

The owner asked, several times, for an in-house crew — three directors, three editors and three screenwriters who understand football, read the archive, build a full, moving story on it and **produce it without waiting for Google when it is unavailable or out of credit**. Until now a film with no answering model either waited (a busy tier: up to 20 minutes a call, then whole worker runs) or ended as `SCRIPT_INVALID`.

**The crew** (`studio/house.py`) works in three units, one behind each model director of `studio/directors.py`, so a film keeps its director's angle whoever writes it:

| unit | writer | director (shot list) | editor (the cut) |
|---|---|---|---|
| broadcaster | The Chronicler — linear thriller, the clock and the score | The Match Director — action, pitch, scoreboard | The Cutter — fast, cuts on the beat |
| terrace | The Terrace Poet — "we", the trips, warmth and self-irony | The Documentarian — the people, terrace, street | The Storyteller — lets a face breathe |
| trailer | The Myth-Maker — trailer cold open, non-linear, rhetorical | The Auteur — night, light, myth | The Montage — bursts, then one held breath |

**The writers** (`studio/house_writer.py`) read the story block the record proves (`studio/director.story`: shape, ranked moments, runs, turning point, acts, honours, summaries) and write the whole script in code: hook and three openings, a cold open on the strongest moment with its result withheld, chapters as mini-dramas (want, obstacle, clock, turn, payoff, cliff edge), the Director's Cut cards (`race`/`form`/`run`/`record` for a season, `versus`/`goal`/`score` for a match or a tie, `record` + `versus` for a rivalry), the payoff after the midpoint and a moment of joy where the record has a win, ten titles, the description, tags, Shorts and thumbnails. Every number, score, scorer, minute, date and competition comes from a claim the beat cites; the words around them are craft (a want, a clock, a turn, a question) and hold no fact. A script is handed over only when `script.validate_script` (with the director rules) and `writer.hook_option_errors` pass; a refused beat is cut and `studio/salvage.py` repairs the rest. Length is what the record carries — shorter, never padded.

**When the house writes** (`writer.write_script`):
- at once when the model cannot answer — no key, no credit, a spent day, a busy tier past `STORIES_WRITER_WAIT_S` (90 s), the provider unreachable, an HTTP error. One refusal is enough: for the next half hour every director goes straight to his house writer (no more requests spent on the same refusal);
- when no model script passes its checks and none could be salvaged (the studio always makes a film);
- always first when the repository variable `STORIES_WRITER` is `house`.

**The directors** (`house.direct`): when `studio/sight.direct` has no key or no answer, the house director of the film's unit makes the shot list from the media index — the picture whose mood is the line's feeling (`studio/drama.read`) and whose subjects the line says, his own taste between equals. He refuses a celebration or a trophy on a defeat, a mood that fights the line, bars or police on a transfer, and anything a caption marks "NOT for" that line.

**The editors** (`house.editor_profile`, read by `docu/editor.pace`): the film's unit sets the rhythm — a tempo on tension and joy, a calm on grief and pride, and a card factor that can only shorten a card. `MIN_SUB`, `MAX_STILL` and `MAX_CARD` stay the hard limits.

**Deep research no longer makes a film wait** (`deep_research.enrich`): a busy, spent or credit-less Google means the film goes ahead on the archive at once and says so (`research_thin`). The bounded wait of 16.11 is kept only behind `STORIES_RESEARCH_WAITS=1`.

The script records who wrote it (`_house`: writer, director, editor, unit, why) and the desk can show the crew (`house.roster()`).

Held by `studio/tests/test_house.py` and `studio/tests/test_deep_research_wait.py`.

# The studio always makes a film, and never says what it cannot prove: the writer salvages in code (owner, 13.11.2026)

A film made from a pitch (Celtic 1984/85, job 6f9c3de6) ended as `SCRIPT_INVALID` with no film: deep research was skipped (Gemini 429), the archive gave 6 claims, the brief asked for ten minutes, and three directors spent five model rounds each on numbers and results no cited claim held. The owner's line: the studio always produces a film, fully automatic, and never states an unproven fact.

**The salvage** (`studio/salvage.py`, called by `writer.write_script`). A script that still fails its checks is repaired in code, with no model call, by three moves only:
- **re-cite** — add a claim the research already holds, when exactly one claim carries the number (or is the match against the opponent the line names, or the one leg whose score the line says) and the sentence itself names that claim's subject. Two candidates is no candidate: nothing is guessed.
- **remove** — cut the sentence that carries what no cited claim proves (a number, a result, a scoreline, the table, the weather); drop a beat left under `MIN_BEAT_WORDS`; drop an emptied chapter; run a chapter whose cliff edge was cut into the next one.
- **copy** — speak hook option 1, already checked against its own evidence, as the opening, word for word.

It never adds a fact, a number or a name. What these moves cannot repair stays a failure of that script.

**The floor.** A salvaged script is accepted only when the whole validator passes and it still stands as a film: at least `FLOOR_MINUTES` (1.5), at least `FLOOR_BEATS` (6), at least `FLOOR_KEPT` (40%) of the narration it was written with, and the cold open (director rule 3). Its length is what the proven narration carries: the film is made shorter, never padded. Every script records the length it was checked at (`_minutes`), and the pipeline, the editing room and the QA duration check read that, not the brief.

**When.** After every model round the salvage is tried; it is taken at once only if it cost at most `EARLY_LOSS` (10%) of the words, dropped no beat and kept the asked length (one request instead of five). Otherwise the model is asked again and the best salvage of any round is used when the rounds are spent. The log says `Writer: salvaged <director>'s script — removed N sentence(s), re-cited M, dropped K beat(s); film length now ~X min`.

**Three scripts.** The choice (`hook_judge.pick_script`) takes a script that passed as written before a salvaged one, then the salvaged one that lost the least; the opening's score decides only between equals.

**A thin archive is written short to begin with** (`writer.sized_minutes`). With no deep research and no owner documents, the writer's target is `CLAIM_MINUTES` (half a minute) per claim, never under `THIN_MIN_MINUTES` (2) and never over the brief: six claims are a three-minute film, not ten.

**Only then does a film fail**, and its error is one short line with the real reason (`writer.failure_line`: "Too few proven facts for this film: the research holds N claim(s)…"). The validator's output stays in the job log.

Also fixed on the way: a score told after a name ending in "a" ("beat Rapid Vienna three-nil") was read as "a three-nil" and never checked (`script.SCORELINE`).

Held by `studio/tests/test_writer_salvage.py`.

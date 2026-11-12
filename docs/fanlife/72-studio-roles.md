# 72 · Who does what in the studio, and where each one's rules live (9.11.2026)

Owner, 9.11.2026: *"make sure the studio reads all the rules, no confusion — the writer, the director and the editor
understand their roles."* One owner per decision; each rule lives in ONE place and the others point to it.

| Role | What it decides | Its rules (the only place they live) | Checked by |
|---|---|---|---|
| **Researcher** | what is true: claims with sources | `studio/research.py`, `deep_research.py`, rule 11 | `test_research*` |
| **Writer** | the story: hook, stakes, running score, one idea per beat | `studio/writer.py` SYSTEM (THINK FOOTBALL, HOOK LAWS, RUNNING SCORE, THE EDIT YOU WRITE FOR) · CLASSIFIED: `docs/fanlife/classified/WRITERS-ROOM.md` | `test_writer*`, `casefile.errors` |
| **Director** | what each beat SHOWS: the visual type, the claim, the hero, the moving-art pieces by meaning | `studio/director.py`, `cinema/direct.py`, `cinema/animate.wants` | `test_director`, `test_cinema` |
| **Hook judge** | which of the writer's three openings is spoken, and which director's script a pitched film uses | `studio/hook_judge.py`, `docs/rules/studio-experience.md` | `test_hook_judge` |
| **Editor (VOX)** | how it moves and reads: one camera, never a dead stop, one hero per line, big type, the score that follows the story | `docs/fanlife/71-continuous-camera-edit.md` → `vox/camera.py` (`flow()`), `score_story.py`, `vox/compose.py` | `test_vox` (Camera, Numbers) |
| **Editor (DOCU)** | the cut of the default engine: no still past 4 s, the looks, the transitions, the same docs/71 rules | `studio/docu/editor.py` → `docu/build.py` (`transition`, `FRAMINGS`) | `test_docu_editor` |
| **Graphic designer (DOCU)** | which device a beat's data earns; nothing on screen outside the research block | `studio/docu/designer.py` (`sourced`) | `test_docu_designer` |
| **Librarian** | which picture a beat with none of its own gets; what the last films showed; what art is missing | `studio/media_index.py` (`Picker`, `Ledger`, `report`), `docs/rules/studio-experience.md` | `test_media_index` |
| **Camera** | how a still is filmed: the named move, the depth planes, the bounds | `studio/camera.py` → `docu/editor.direct`, `docu/build.Film.image` | `test_camera` |
| **Score sheet** | what every beat FEELS like, and the film's arc; the mini-drama shape | `studio/drama.py`, `script.mini_drama`, `writer.drama_pass` | `test_drama` |
| **Languages (DOCU)** | documentary, explainer or kinetic per beat; the mix targets | `studio/docu/explainer.py` | `test_docu_languages` |
| **Producer** | whether the finished film is an experience: the gate's thresholds and the one re-plan | `studio/qa.py` (the experience gate) | `test_experience_gate` |
| **Narrator** | how names and moments sound | `studio/voice.py`, `pronounce.py`, `kit/pronounce/*` | `test_voice*` |
| **Flow operator** | the pictures and clips Flow makes: Shorts, CLASSIFIED panels, the art library | `docs/fanlife/70-flow-operator.md`, `cinema/flow_library.py` | `test_flow_library`, `tests/stories-flow-operator.test.ts` |

Order of authority when two disagree: the record (research) → the writer's words → the director's choice of picture →
the editor's motion. The editor never shows a fact the narration has not reached (the score); the director never picks
a piece the record does not support (weather, night, trophy — `animate.Picker.ok`).

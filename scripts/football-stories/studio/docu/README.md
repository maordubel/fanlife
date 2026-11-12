# DOCU — the documentary look (owner, 9.11.2026)

"VOX + HyperFrames + animation + storyline + documentary" — approved on the Hapoel Petah Tikva v Feyenoord sample:
*"this is the direction, and even more. From now on it is the graphic minimum."*

A film is a storyboard (`films/<slug>.py` writes `storyboard.json`): narrated beats, each with the shots under it.
`build.py` voices it (Kokoro, free), lays the beats on their narration, draws every shot as a HyperFrames clip and
checks the cut before anyone sees it (length against the plan, the aggregate moving one goal at a time, nothing
narrated over an empty frame).

```
python3 -m studio.docu.build storyboard.json --assets <owner pack + crests> --out <project>
hyperframes render <project> -o film.mp4 --fps 30
```

Devices: scoreboard · WON/OUT stamps · question · chapter ticket · owner clip with lower third and a running clock ·
illustration with push/pull/pan/slam and a name tag · lead banner · aggregate tracker · two-column ledger with a drawn
circle · rule card · verdict split · channel card. Every owner illustration carries "Illustration · graphic
reconstruction". Facts only from the brief and the archive; disputed minutes become early / late / after half-time.

## As the studio's engine (12.11.2026 — docs/rules/studio-experience.md)

`plan.py` adapts the pipeline's plan to these devices; `designer.py` decides which of the richer ones a beat's data earns
(cities · table · chalk · verdict · stamp · rule · press · cutout — never a word outside the research block); `editor.py`
cuts it (no still past 4 s: wide → detail → reverse looks on a beat or a word, cards that leave, a transition into every
beat, the docs/71 rules) and writes `docu-shots.json`, which the producer's gate (`studio/qa.py`) reads. A storyboard
written by hand has no `in` on its beats and is drawn exactly as it was.

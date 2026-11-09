# 71 · The continuous-camera edit — house rules (9.11.2026)

Owner, 9.11.2026: *"attach this to your capabilities to improve the edit"* — the brief "Continuous flowing Claude prompt"
(Google Doc 19Bz2tmn57b0unK2kUGFOsIAzjWWNxhnn_TuZqA-XZIk). It is the account skill `cinematic-code-edit` (look A) and
the rule for every VOX edit: the documentary's VOX look (`studio/vox`) and CLASSIFIED (`comic/casefile.py`, rule 142).

## The look
One continuous camera move over one big world (the board). Nothing cuts, no slides change: glide, push in on a detail,
pull back to travel, dive in again (a chapter change dives through the paper — the one designed break). Every start and
stop eases; **the camera never stops dead** — while it holds it creeps on toward its next move. Subtle hand-held, motion
blur on fast moves, film grain, soft glow, vignette. Real photos and documents drop onto the world as prints, papers,
clippings, where the story happens.

## Storytelling and readability (most important)
1. One idea per line of narration — ONE hero on screen, everything else dims back.
2. Every phrase appears on screen once: on a real document OR typed, never both.
3. No filler text: body copy on documents is soft grey lines, not words.
4. Big readable type: hero words very large, labels never tiny — readable on a phone in one second
   (typed strips ≥ 54 px on 1440 wide, ≥ 62 px on 1080×1920; typing ≈ 21 chars/s, hold ≥ 0.8 s after the last letter).
5. Less is more: no decorative clutter (random tape, stamps, memos, extra labels).
6. Moments land on the spoken word: the circle drawn as the word is said, the stamp on the beat (word timings come
   from the narration's alignment).

## Process
Beat table first (time → line → the one hero → on-screen text → sound); in the studio this is the scene board the owner
approves. Before the final render: stills from every beat and frame sequences of the camera moves; fix clutter,
unreadable type, overlaps, jerks and dead stops.

## What the code measures (so it cannot drift)
* `CameraPath.flow()` (`studio/vox/camera.py`): `dead_frames` — frames where the camera moves < 0.05 px (must be 0);
  `worst_jerk` — the largest one-frame change of speed (guarded < 130 px). Tests: `test_vox.Camera`. CLASSIFIED creeps
  slower (`lead` 6) so a held print stays steady (rule 142).
* `_retime`: a move inside a beat that would cross the screen faster than 1400 px/s borrows time from the hold before it.
* The hold creep (`lead`, 14 board units/s toward the next beat) and the eased hand-over between a glide and a beat's
  own move. Before this round 11 dead frames and jerks up to 123; now 0 and 33–123 depending on the director.
* `CameraPath.jumps()` — no frame moves more than a third of the screen (existing).

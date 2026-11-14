# Never slice a picture to fake depth (owner, 14.11.2026)

Owner, after seeing the model film (AEK 0–1 Panathinaikos): *"That effect — cutting the picture to create an illusion
that it moves — you did it on practically every picture. It is awful and ugly and I don't want to use it."*

1. A still is never cut into bands or masks that move apart from each other (the "2.5D" or "depth-plane" trick: the
   same picture duplicated, its lower band masked and moved faster than the rest). The seam shows and it reads as cheap.
2. A picture moves as **one sheet**: a slow push, pull, pan or tilt of the whole image, eased, within rule 142 (no shake,
   no flicker, no flash). A still that should not move is held.
3. Only a **real separate layer** may move in front of a picture: a cut-out the art was made as (a transparent PNG from
   the pack or the library), a card, a device, type. Never a piece cut out of the picture itself.
4. In code: `studio/camera.py` `SLICE_PLANES = False` — `planes()` draws the picture and the vignette only, and the
   camera's `fore` tweens find no target. Turning it back on needs the owner's yes. A test holds it
   (`tests/test_camera.py`: no `phi fore`, no `mask-image` on a still).
5. Life on screen comes from the edit instead: more cuts of different pictures, devices that build (counters, tiles,
   pen, stamps), kinetic type and real cut-outs — as in the Vox reference (`claude/edit-reference-vox-2026-11-13.md`).

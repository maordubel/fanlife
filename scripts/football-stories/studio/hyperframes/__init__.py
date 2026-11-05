"""VOX on HyperFrames — the documentary look drawn by Chromium instead of PIL (prototype, 5.11.2026).

The same plan the PIL VOX engine (studio/vox) renders — script beats, claims, the story block, the cinema block, the
narrator's word timings, the club palette and its rival bans, the owner's library art — written as one HyperFrames
composition per chapter: a DOM paper board that one GSAP camera glides across (the PIL engine's own CameraPath, so the
choreography is the same film), torn paper cards, kinetic words rising from masks, SVG pen strokes that draw themselves,
a highlighter swept over the words that matter, odometers and split-flap scores rolling to the claim values, timelines
and pins dropping, cut-outs in front of the board with their own parallax, the scorebug, the lower-third slip and the
burned captions on the glass. `npx hyperframes render` turns it into a deterministic MP4.

Selectable, never the default: a brief with `look: 'vox-hf'` (or `engine: 'vox-hf'`), or STORIES_VOX_HF=1.

    python3 -m studio.hyperframes.render --job DIR --palette palettes.json   # a job that already has its plan
"""
from __future__ import annotations

import os

ENGINE = 'vox-hf'


def wanted(brief: dict | None) -> bool:
    b = brief or {}
    if os.environ.get('STORIES_VOX_HF', '') == '1':
        return True
    return b.get('look') == ENGINE or b.get('engine') == ENGINE

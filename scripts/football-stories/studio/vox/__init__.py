"""VOX — the studio's documentary look (owner, 4.11.2026: "VOX Style, automatically"). One continuous paper board per
chapter that the camera glides across; cut-out archive pictures with torn edges and soft shadows; a pen that circles
the score and points at the scorer; a highlighter on the line that matters; counters that roll up and down; words that
arrive one by one. Built from the same script, ledger and story block as the classic edit — no new inputs.

    engine_for(brief) → 'vox' (the default) or 'classic' (STORIES_VOX=0, or a brief with engine/visual_style 'classic')
"""
from __future__ import annotations

import os

ENGINES = ('vox', 'classic')


def engine_for(brief: dict | None) -> str:
    b = brief or {}
    if os.environ.get('STORIES_VOX', '1') == '0':
        return 'classic'
    if b.get('engine') in ENGINES:
        return b['engine']
    if b.get('visual_style') == 'classic':
        return 'classic'
    return 'vox'

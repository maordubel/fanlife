"""The cinema (Director's Cut, workstream B): the new visual types as animated shots, and the film layer over every
shot — camera, b-roll, scorebug, lower-thirds, transitions, grade. Contract: docs/fanlife/66-directors-cut.md."""
from . import direct as direct_mod  # noqa: F401
from .direct import beat_fx, dress  # noqa: F401
from .direct import direct as direct_plan  # noqa: F401  (the module keeps the name `cinema.direct`)
from .shots import TYPES, build  # noqa: F401
from .story import story_of  # noqa: F401
from . import animate, library  # noqa: F401  (the moving-art library)

# the least a shot of each new type lasts, so its animation lands whatever the narration's length (seconds)
MIN_DUR = {'versus': 5.2, 'goal': 6.0, 'race': 6.5, 'record': 5.0, 'form': 4.0, 'run': 4.0, 'trailer': 2.2}


def min_duration(v: dict) -> float:
    kind = v.get('type')
    base = MIN_DUR.get(kind, 0.0)
    if kind in ('form', 'run'):
        base += 0.3 * len(v.get('claims') or [])
    if kind == 'trailer':
        base = max(base, 1.1 * len(v.get('lines') or []))
    return base

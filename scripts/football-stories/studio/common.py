"""Shared paths, palette rules and small helpers for the Football Stories studio.

The studio is a pipeline of stages (research → script → voice → visuals → edit → package → QA). Every stage reads and
writes inside one job directory, so a stage can be re-run from its checkpoint without repeating paid work.
"""
from __future__ import annotations

import colorsys
import hashlib
import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path

STUDIO = Path(__file__).resolve().parent
ROOT = STUDIO.parents[2]
KIT = STUDIO / 'kit'
FONTS = ROOT / 'public' / 'fonts'
CHANNEL_ID = 'UC2KULoLBFCSZC4jeRGYkKfQ'
CHANNEL_NAME = 'FanLife: Football Stories'
CHANNEL_HANDLE = '@FanLifeFootballStories'
SLOGAN = 'Football is ninety minutes. Being a supporter is a lifetime.'

# The Weekly guide (app/magazine.css) — ink, newsprint, paper and the magazine's own vermilion.
INK = '#15130F'
NEWSPRINT = '#F4ECD8'
PAPER = '#FFFBF2'
VERMILION = '#D71920'
NAVY = '#1F3A5F'

W, H = 1920, 1080
FPS = 25


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    if not re.fullmatch(r'[0-9a-fA-F]{6}', h):
        raise ValueError(f'Invalid colour {h!r}')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def family(rgb: tuple[int, int, int]) -> str | None:
    """The colour family a pixel belongs to, in the words lib/clubs/theme.ts → colourFamily() speaks."""
    r, g, b = (c / 255 for c in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    if s < 0.2:
        return None
    deg = h * 360
    if deg <= 18 or deg >= 342:
        return 'red'
    if 38 <= deg <= 70:
        return 'yellow'
    if 90 <= deg <= 170:
        return 'green'
    if 190 <= deg <= 260:
        return 'blue'
    return None


def is_banned_pixel(rgb: tuple[int, int, int], bans: list[str]) -> bool:
    """A pixel prints a banned family only when it is saturated and bright enough to read as that colour (isYellow.ts)."""
    r, g, b = rgb
    mx, mn = max(rgb), min(rgb)
    if mx == mn or (mx - mn) / mx < 0.35 or mx / 255 < 0.35:
        return False
    fam = family(rgb)
    return fam in bans


@dataclass
class Palette:
    """A club's colours for one film. `bans` are colour families the club's rival owns (rule 95)."""
    club_id: str
    club_name: str
    primary: str
    on_primary: str = PAPER
    bans: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        for c in (self.primary, self.on_primary):
            if family(hex_rgb(c)) in self.bans:
                raise ValueError(f'{c} is a rival colour for {self.club_name}')

    @property
    def accent(self) -> str:
        """The accent printed on the magazine paper: the club colour, else the Weekly vermilion, else ink."""
        for c in (self.primary, VERMILION, NAVY):
            if family(hex_rgb(c)) not in self.bans:
                return c
        return INK

    def to_json(self) -> dict:
        return {'club_id': self.club_id, 'club_name': self.club_name, 'primary': self.primary,
                'on_primary': self.on_primary, 'bans': self.bans}

    @staticmethod
    def from_json(d: dict) -> 'Palette':
        return Palette(d['club_id'], d['club_name'], d['primary'], d.get('on_primary', PAPER), list(d.get('bans') or []))


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha256_json(v) -> str:
    return sha256_bytes(json.dumps(v, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode())


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(tmp, path)


def read_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60] or 'x'


class StageError(Exception):
    """A stage could not finish. `code` is stable and shown to the owner; `retryable` says whether a retry is safe."""

    def __init__(self, code: str, message: str, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.retryable = retryable

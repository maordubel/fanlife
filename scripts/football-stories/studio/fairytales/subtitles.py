"""Football Fairy Tales — burned-in subtitles and the channel stamp (owner, 12.11.2026: "subtitles in a nice font, the
kind a children's series has" · "the site, the YouTube page and the Instagram page always on screen, nicely, not loud —
our stamps on the film").

Subtitles are libass (ASS) burned per language, in a rounded storybook face: Fredoka for English and Hebrew, Comfortaa
for Greek (Fredoka has no Greek). A narration line is cut into cues of at most two short lines and the cues share the
line's spoken time by their length. The stamp is drawn into the picture, so every language carries the same one.
"""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONTS = Path(__file__).resolve().parent / 'fonts'
FACE = {'en': 'Fredoka SemiBold', 'he': 'Fredoka SemiBold', 'el': 'Comfortaa Bold'}
LINE = 38                                                     # characters a subtitle line may hold

SITE = 'fanlife.dubelteam.com'
YOUTUBE = '@FanLifeFootballStories'
INSTAGRAM = '@fanlifefootballstories'


def _lines(words: list[str], width: int = LINE) -> list[str]:
    out, cur = [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            out.append(cur)
            cur = w
        else:
            cur = f'{cur} {w}'.strip()
    if cur:
        out.append(cur)
    return out


def _two(words: list[str]) -> list[str]:
    """Words that fit on two lines, broken where the two lines come out most even."""
    best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        if len(a) <= LINE + 4 and len(b) <= LINE + 4:
            score = max(len(a), len(b))
            if best is None or score < best[0]:
                best = (score, [a, b])
    return best[1] if best else _lines(words)


def cues(text: str) -> list[str]:
    """The line cut into on-screen cues: sentences first, two even lines a cue, never one dangling word."""
    parts = [p.strip() for p in re.split(r'(?<=[.!?…—])\s+', text) if p.strip()]
    out = []
    for p in parts:
        words = p.split()
        if len(p) <= LINE:
            out.append(p)
            continue
        ls = _lines(words)
        n = (len(ls) + 1) // 2                                # cues this sentence needs, then share the words evenly
        per = -(-len(words) // n)
        for i in range(0, len(words), per):
            chunk = words[i:i + per]
            one = ' '.join(chunk)
            out.append(one if len(one) <= LINE else '\n'.join(_two(chunk)))
    merged = []                                               # a cue of one or two words joins the cue before it
    for c in out:
        if merged and len(c) < 12 and '\n' not in merged[-1]:
            merged[-1] = f'{merged[-1]}\n{c}'
        else:
            merged.append(c)
    return merged


def _visual(line: str, lang: str) -> str:
    """This libass build has no bidi: Hebrew lines are handed over already in visual order (python-bidi)."""
    if lang != 'he':
        return line
    from bidi.algorithm import get_display
    return get_display(line)


def _t(s: float) -> str:
    s = max(0.0, s)
    return f'{int(s // 3600)}:{int(s % 3600 // 60):02d}:{int(s % 60):02d}.{int(s * 100 % 100):02d}'


def ass(lang: str, spans: list[tuple[float, float, str]], outline: str = '&H00142A3A', size: int = 66) -> str:
    """spans: (start, end, text[, 'top']) per narration line. Returns an ASS document for 1920×1080."""
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Tale,{FACE[lang]},{size},&H00F4FBFF,&H00FFFFFF,{outline},&H64000000,0,0,0,0,100,100,1,0,1,6,3,2,140,140,58,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for span in spans:
        a, b, text = span[:3]
        pos = '\\an8' if len(span) > 3 and span[3] == 'top' else ''      # over the closing card's ribbon
        cs = cues(text)
        if not cs:
            continue
        total = sum(len(c) for c in cs)
        t = a
        for c in cs:
            d = (b - a) * len(c) / total
            body = r'\N'.join(_visual(x, lang) for x in c.split('\n'))
            ev.append(f'Dialogue: 0,{_t(t)},{_t(t + d - 0.04)},Tale,,0,0,0,,{{{pos}\\fad(120,120)}}{body}')
            t += d
    return head + '\n'.join(ev) + '\n'


def stamp(scale: float = 1.0) -> Image.Image:
    """The channel stamp: a small cream paper tag, three quiet lines with simple drawn marks (no platform logos)."""
    f = ImageFont.truetype(str(FONTS / 'FredokaSemiBold.ttf'), int(23 * scale))
    rows = [('site', SITE), ('play', YOUTUBE), ('cam', INSTAGRAM)]
    pad, gap, icon = int(14 * scale), int(7 * scale), int(20 * scale)
    w = max(int(f.getlength(t)) for _, t in rows) + icon + gap * 2 + pad * 2
    lh = int(30 * scale)
    h = lh * len(rows) + pad * 2 - int(4 * scale)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=int(12 * scale), fill=(250, 244, 232, 150))
    ink = (42, 30, 20, 205)
    for i, (k, t) in enumerate(rows):
        y = pad + i * lh
        cx, cy, r = pad + icon // 2, y + lh // 2 - int(2 * scale), icon // 2
        if k == 'site':
            d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=ink, width=max(2, int(2 * scale)))
            d.line((cx - r, cy, cx + r, cy), fill=ink, width=max(1, int(1.5 * scale)))
            d.ellipse((cx - r // 2, cy - r, cx + r // 2, cy + r), outline=ink, width=max(1, int(1.5 * scale)))
        elif k == 'play':
            d.rounded_rectangle((cx - r, cy - int(r * .72), cx + r, cy + int(r * .72)), radius=int(5 * scale), fill=ink)
            d.polygon([(cx - r * .3, cy - r * .38), (cx - r * .3, cy + r * .38), (cx + r * .42, cy)], fill=(250, 244, 232, 230))
        else:
            d.rounded_rectangle((cx - r, cy - r, cx + r, cy + r), radius=int(6 * scale), outline=ink, width=max(2, int(2 * scale)))
            d.ellipse((cx - r * .45, cy - r * .45, cx + r * .45, cy + r * .45), outline=ink, width=max(2, int(2 * scale)))
            d.ellipse((cx + r * .5, cy - r * .7, cx + r * .7, cy - r * .5), fill=ink)
        d.text((pad + icon + gap, y + lh // 2 - int(2 * scale)), t, font=f, fill=ink, anchor='lm')
    return img


_STAMP: Image.Image | None = None


def put_stamp(frame: Image.Image, t: float, total: float) -> Image.Image:
    """The stamp in the top corner, after the opening and until the closing card; it fades in and out."""
    global _STAMP
    if _STAMP is None:
        _STAMP = stamp()
    k = min(1.0, max(0.0, (t - 3.0) / 0.8), max(0.0, (total - 4.0 - t) / 0.8))
    if k <= 0:
        return frame
    s = _STAMP
    if k < 1:
        s = _STAMP.copy()
        s.putalpha(_STAMP.getchannel('A').point(lambda v: int(v * k)))
    out = frame.convert('RGBA')
    out.alpha_composite(s, (frame.width - s.width - 34, 30))
    return out.convert('RGB')

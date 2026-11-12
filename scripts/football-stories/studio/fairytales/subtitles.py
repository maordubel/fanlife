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


def _split(words: list[str], n: int) -> list[list[str]]:
    """n cues from one long sentence, broken after a comma where one is near the even point — the voice breathes at
    a comma, so a cue that ends there leaves when the words do. Every cue still fits on two lines."""
    per = len(words) / n
    cuts, last = [], 0
    for k in range(1, n):
        even = round(k * per)
        near = [i for i in range(max(last + 2, even - int(per * 0.45)), min(len(words) - 1, even + int(per * 0.45)) + 1)
                if re.search(r'[,;:]$', words[i - 1])]
        cut = min(near, key=lambda i: abs(i - even)) if near else even
        cuts.append(max(cut, last + 1))
        last = cuts[-1]
    parts = [words[a:b] for a, b in zip([0] + cuts, cuts + [len(words)])]
    if all(len(_lines(c)) <= 2 for c in parts):
        return parts
    per = -(-len(words) // n)
    return [words[i:i + per] for i in range(0, len(words), per)]


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
        n = (len(ls) + 1) // 2                                # cues this sentence needs
        for chunk in _split(words, n):
            one = ' '.join(chunk)
            out.append(one if len(one) <= LINE else '\n'.join(_two(chunk)))
    merged = []                                               # a cue of one or two words joins the cue before it
    for c in out:
        if merged and len(c) < 12 and '\n' not in merged[-1]:
            merged[-1] = f'{merged[-1]}\n{c}'
        else:
            merged.append(c)
    return merged


def _runs(wav) -> tuple[list[tuple[float, float]], float]:
    """Where the voice speaks in a take: runs of sound split by pauses of 150 ms or more, and the take's length."""
    import wave
    import numpy as np
    with wave.open(str(wav)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    hop = int(sr * 0.01)
    e = np.sqrt((x[:len(x) // hop * hop].reshape(-1, hop) ** 2).mean(1))
    loud = e > max(0.012, float(np.percentile(e, 20)) * 3)
    runs, k = [], 0
    while k < len(loud):
        if loud[k]:
            j = k
            while j < len(loud) and loud[j]:
                j += 1
            if runs and k - runs[-1][1] < 15:
                runs[-1] = (runs[-1][0], j)
            else:
                runs.append((k, j))
            k = j
        else:
            k += 1
    return [(r0 / 100, r1 / 100) for r0, r1 in runs if r1 - r0 >= 4], len(x) / sr


def _spoken(cue: str) -> int:
    """How long a cue takes to say, in letters: a written year is read as four words ("nineteen sixty-two"), so a
    figure counts for the words it becomes, not the digits it is printed with."""
    n = len(re.sub(r'[\W\d]', '', cue))
    for num in re.findall(r'\d+', cue):
        n += 16 if len(num) == 4 else 5 * len(num)
    return max(1, n)


def timed(text: str, a: float, b: float, wav=None) -> list[tuple[float, float, str]]:
    """The cues of one line with their times. With the take at hand, every cue break is put in the pause the voice
    actually takes there (12.11.2026: cues spread evenly by letters ran up to a second ahead of or behind the words);
    a cue holds through a short breath and leaves in a long one. Without it, an even share by letters."""
    cs = cues(text)
    if not cs:
        return []
    size = [_spoken(c) for c in cs]
    tot = sum(size)
    runs, length = _runs(wav) if wav else ([], 0.0)
    if not runs:
        out, t = [], a
        for c, n in zip(cs, size):
            d = (b - a) * n / tot
            out.append((t, t + d - 0.04, c))
            t += d
        return out
    voiced = sum(r1 - r0 for r0, r1 in runs)
    gaps = [(runs[i][1], runs[i + 1][0]) for i in range(len(runs) - 1)]

    def at(v: float) -> float:                               # voiced seconds → take seconds
        for r0, r1 in runs:
            if v <= r1 - r0:
                return r0 + v
            v -= r1 - r0
        return runs[-1][1]
    wants, acc = [], 0
    for n in size[:-1]:
        acc += n
        wants.append(at(voiced * acc / tot))
    cuts = _assign(wants, gaps, [bool(re.search(r'[.!?…]\W*$', c)) for c in cs[:-1]])
    starts = [runs[0][0]] + [g1 for _, g1 in cuts]
    ends = [g0 for g0, _ in cuts] + [runs[-1][1]]
    out = []
    for i, c in enumerate(cs):
        t0 = a + max(0.0, starts[i] - 0.12)
        nxt = a + starts[i + 1] - 0.12 if i + 1 < len(cs) else None
        hold = a + ends[i] + 0.45
        t1 = min(hold, nxt - 0.03) if nxt is not None and nxt - (a + ends[i]) > 0.75 else (nxt - 0.03 if nxt else hold)
        out.append((t0, max(t1, t0 + 0.6), c))
    for i in range(len(out) - 1):                            # never two cues on screen at once
        if out[i][1] > out[i + 1][0] - 0.02:
            out[i] = (out[i][0], out[i + 1][0] - 0.02, out[i][2])
    return out


def _assign(wants: list[float], gaps: list[tuple[float, float]], ends: list[bool] | None = None) -> list[tuple[float, float]]:
    """Each cue break to its own pause, in order, all at once: the set of pauses nearest the estimates, where a
    longer pause (a sentence end) pulls harder. A break with no pause near it stays where the letters put it."""
    import functools
    centre = [(g0 + g1) / 2 for g0, g1 in gaps]

    def cost(b: int, g: int) -> float:
        pull = 1.1 if ends and ends[b] else 0.45            # a full stop is a long pause; a comma a short one
        return abs(centre[g] - wants[b]) - pull * min(gaps[g][1] - gaps[g][0], 1.0)

    @functools.lru_cache(None)
    def best(b: int, g: int) -> tuple[float, tuple]:      # breaks b.. placed using gaps g..
        if b == len(wants):
            return 0.0, ()
        miss = best(b + 1, g)
        options = [(0.75 + miss[0], (None,) + miss[1])]
        for k in range(g, len(gaps)):
            if abs(centre[k] - wants[b]) < 1.6:
                rest = best(b + 1, k + 1)
                options.append((cost(b, k) + rest[0], (k,) + rest[1]))
        return min(options, key=lambda o: o[0])
    pick = best(0, 0)[1]
    return [gaps[k] if k is not None else (w, w) for k, w in zip(pick, wants)]


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
        wav = span[4] if len(span) > 4 else None
        for t0, t1, c in timed(text, a, b, wav):
            body = r'\N'.join(_visual(x, lang) for x in c.split('\n'))
            ev.append(f'Dialogue: 0,{_t(t0)},{_t(t1)},Tale,,0,0,0,,{{{pos}\\fad(90,90)}}{body}')
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

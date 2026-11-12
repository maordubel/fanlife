"""What a finished CLASSIFIED episode ships with, besides the master: the YouTube package (title, description with the
chapters of the actual cut and the sources, tags), three thumbnails in the case-folder look, the Telegram preview, and
the draft note to the owner. Nothing here uploads or publishes anything: YouTube is the owner's click.
"""
from __future__ import annotations

import json
import re
import subprocess
import textwrap
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from comic import letter

TW, TH = 1280, 720
SITE = 'fanlife.dubelteam.com'
TITLE_STYLE = re.compile(r'^The .+ That .+$')


# ------------------------------------------------------------------ thumbnails: the case folder
def _cover(src: Image.Image, w: int, h: int, focus=(.5, .5)) -> Image.Image:
    s = max(w / src.width, h / src.height)
    im = src.resize((max(w, int(src.width * s + .5)), max(h, int(src.height * s + .5))), Image.LANCZOS)
    x = int(min(max(0, focus[0] * im.width - w / 2), im.width - w))
    y = int(min(max(0, focus[1] * im.height - h / 2), im.height - h))
    return im.crop((x, y, x + w, y + h))


def thumbnail(panel: Path | None, hook: list[str], number: str, title: str, tone: str, tone_rgb, out: Path, seed: int = 0) -> Path:
    """A manila case folder lying open on the desk: the owner's panel clipped inside it like an evidence photo, a red
    CLASSIFIED stamp across the corner, the hook typed large on the folder, FILE 01 on its tab. 1280×720 JPEG."""
    rng = np.random.default_rng(seed)
    base = Image.new('RGB', (TW, TH), letter.INK)
    if panel and panel.exists():
        with Image.open(panel) as p:
            bg = _cover(p.convert('RGB'), TW, TH).filter(ImageFilter.GaussianBlur(10))
        base = Image.blend(bg, Image.new('RGB', (TW, TH), letter.INK), .62)
    im = base.convert('RGBA')
    d = ImageDraw.Draw(im)
    # the folder: tab + body, manila (the magazine's newsprint), ink outline, its second plate in the tone colour
    fx0, fy0, fx1, fy1 = 30, 92, 690, 690
    d.rectangle([fx0 + 16, fy0 + 16, fx1 + 16, fy1 + 16], fill=tuple(tone_rgb) + (255,))
    d.polygon([(fx0, fy0), (fx0 + 40, fy0 - 62), (fx0 + 330, fy0 - 62), (fx0 + 370, fy0)], fill=letter.NEWS + (255,), outline=letter.INK + (255,))
    d.rectangle([fx0, fy0, fx1, fy1], fill=letter.NEWS + (255,), outline=letter.INK + (255,), width=6)
    d.text((fx0 + 56, fy0 - 52), f'FILE {number}', font=letter.face('num', 44), fill=letter.INK + (255,))
    # the evidence photo: the owner's panel as supplied, clipped to the folder's right edge, a little crooked
    if panel and panel.exists():
        with Image.open(panel) as p:
            ph = _cover(p.convert('RGB'), 560, 400)
        card = Image.new('RGBA', (560 + 28, 400 + 28), letter.PAPER + (255,))
        card.paste(ph, (14, 14))
        cd = ImageDraw.Draw(card)
        cd.rectangle([0, 0, card.width - 1, card.height - 1], outline=letter.INK + (255,), width=5)
        card = card.rotate(float(rng.uniform(3, 6)), expand=True, resample=Image.BICUBIC)
        sh = Image.new('RGBA', card.size, letter.INK + (255,))
        sh.putalpha(card.getchannel('A'))
        im.alpha_composite(sh, (640 + 14, 140 + 14))
        im.alpha_composite(card, (640, 140))
        # the paper clip, drawn
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([680, 108, 722, 204], radius=20, outline=(140, 140, 146, 255), width=7)
    d = ImageDraw.Draw(im)
    # the hook, set big on the folder (head face, ink; the second line in red)
    lines = [l.upper() for l in hook][:3]
    maxw = 640 - 24 - (fx0 + 46)              # the hook stops where the evidence photo begins
    size = 150
    f = letter.face('head', size)
    while size > 56 and max(f.getlength(l) for l in lines) > maxw:
        size -= 4
        f = letter.face('head', size)
    block = int(size * 1.02) * len(lines)
    y = fy0 + 40 + max(0, (fy1 - 130 - fy0 - 40 - block) // 2)
    for i, l in enumerate(lines):
        d.text((fx0 + 46 + 5, y + 5), l, font=f, fill=tuple(tone_rgb) + (255,))   # the second plate, in the tone colour
        d.text((fx0 + 46, y), l, font=f, fill=(letter.RED if i == len(lines) - 1 else letter.INK) + (255,))
        y += int(size * 1.02)
    d.line([(fx0 + 46, fy1 - 104), (fx1 - 46, fy1 - 104)], fill=letter.INK + (255,), width=4)
    d.text((fx0 + 46, fy1 - 86), f'CLASSIFIED · {title}', font=letter.face('caps', 46), fill=letter.INK + (255,))
    # the stamp, slammed over the corner where folder and photo meet
    st = Image.fromarray(letter.stamp('CLASSIFIED', letter.RED, 120, seed=seed + 7), 'RGBA').rotate(9, expand=True, resample=Image.BICUBIC)
    im.alpha_composite(st, (TW - st.width - 20, TH - st.height - 10))
    tab = Image.fromarray(letter.tone_tab(tone, tuple(tone_rgb), f'FILE {number}'), 'RGBA')
    im.alpha_composite(tab, (TW - tab.width - 40, 26))
    out.parent.mkdir(parents=True, exist_ok=True)
    im.convert('RGB').save(out, quality=90, optimize=True)
    return out


# ------------------------------------------------------------------ the YouTube package
def chapters_of(plan: dict) -> list[dict]:
    from studio import package
    return [{'time': package.ts_chapter(c['t']), 'title': c['title']} for c in package.chapters(plan)]


def description(ep: dict, plan: dict, music: dict | None, voice_credit: str) -> str:
    from studio.common import CHANNEL_HANDLE, CHANNEL_NAME, SHOP_LINE, SLOGAN
    pk = ep.get('package') or {}
    parts = [pk.get('hook', '').strip(), '', SHOP_LINE, '']
    ch = chapters_of(plan)
    if ch:
        parts += ['Chapters'] + [f"{c['time']} {c['title']}" for c in ch] + ['']
    parts += ['Sources'] + [f"{s['n']}. {s['title']}" + (f" — {s['url']}" if s.get('url') else '') for s in ep.get('sources') or []]
    parts += ['', 'Where the sources disagree, this film shows both versions and labels them.', '',
              'Credits',
              '• Panels: original comic art made for FanLife, used as supplied.',
              f'• Narration: {voice_credit}',
              ('• Music: ' + (music.get('credit') or f"{music.get('title')} by {music.get('artist')} ({music.get('licence')})")
               + '. Sound effects composed for this film; crowd atmosphere from FanLife\'s own recordings.') if music else
              '• Score and sound effects: composed for this film; crowd atmosphere from FanLife\'s own recordings.',
              '• Narration voice is synthetic. The panels are illustrations, not photographs of the events.',
              '', f'More strange and true football stories: {SITE}', SLOGAN, f'{CHANNEL_NAME} · {CHANNEL_HANDLE}']
    text = '\n'.join(parts)
    return text[:4900]


def youtube(ep: dict, plan: dict, music: dict | None, voice_credit: str) -> dict:
    from studio.common import CHANNEL_ID
    pk = ep.get('package') or {}
    cands = pk.get('title_candidates') or []
    title = cands[int(pk.get('selected', 0))] if cands else f"CLASSIFIED · FILE {ep.get('number')}"
    return {'channel_id': CHANNEL_ID, 'series': 'CLASSIFIED', 'file': ep.get('file'), 'title': title, 'title_candidates': cands,
            'description': description(ep, plan, music, voice_credit), 'tags': pk.get('tags') or [], 'category': 'Sports',
            'category_id': '17', 'default_language': 'en', 'made_for_kids': False, 'privacy_default': 'private',
            'synthetic_media': {'altered_or_synthetic': False,
                                'reason': 'Stylised comic panels and a synthetic narrator of no real person: no realistic scene that did not happen, no altered footage.'},
            'chapters': chapters_of(plan), 'published': False}


def title_ok(t: str) -> bool:
    """The series' title shape: "The [object] That [consequence]"."""
    return bool(TITLE_STYLE.match(t or ''))


# ------------------------------------------------------------------ Telegram preview and draft note
def preview(master: Path, out: Path, budget_mb: float = 44.0) -> Path:
    """A 960×540 copy of the master that fits Telegram's 50 MB, at the highest bitrate that does."""
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(master)],
                       capture_output=True, text=True, check=True)
    dur = max(1.0, float(r.stdout.strip()))
    kbps = int(max(300, min(2500, budget_mb * 8192 / dur - 128)))
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-vf', "scale='min(960,iw)':-2", '-c:v', 'libx264', '-preset', 'medium',
                    '-b:v', f'{kbps}k', '-maxrate', f'{int(kbps * 1.3)}k', '-bufsize', f'{kbps * 2}k', '-c:a', 'aac', '-b:a', '128k',
                    '-movflags', '+faststart', str(out)], check=True)
    return out


def draft_note(ep: dict, yt: dict, qa: dict, report: dict) -> str:
    """The text the owner gets on Telegram with the preview. A DRAFT: nothing has been uploaded."""
    lines = [f"CLASSIFIED · FILE {ep.get('number')} · {ep.get('title')} — DRAFT", '',
             'Nothing has been uploaded or published. This is for you to watch first.', '',
             f"Title: {yt['title']}"]
    for t in yt['title_candidates'][1:]:
        lines.append(f'  or: {t}')
    lines += ['', f"Length: {report.get('seconds', 0) / 60:.2f} min · voice: {report.get('voice')} · music: {report.get('music')}"]
    fails = [c for c in qa.get('checks', []) if not c['ok']]
    lines.append('QA: all checks passed' if not fails else 'QA: ' + '; '.join(f"{c['name']} — {c['detail']}" for c in fails))
    if report.get('missing'):
        lines.append('Panels not supplied (an ink slate stands in): ' + ', '.join(report['missing']))
    if report.get('unknown_names'):
        lines.append('Names the voice guessed (no lexicon entry): ' + ', '.join(report['unknown_names']))
    lines += ['', 'Files in the GitHub run (Artifacts, kept 3 days): master, captions (.srt/.vtt), 3 Shorts, 3 thumbnails, youtube.json.',
              '', 'To publish (when you are happy): YouTube Studio → Create → Upload video → the master → paste the title,',
              'description and tags from youtube.json → Subtitles → upload captions.en.srt → Thumbnail → upload one →',
              'Visibility: Private or Scheduled. Shorts: upload each short-N.mp4 the same way.', '',
              '— Description —', yt['description']]
    return '\n'.join(lines)


def wrap(text: str, n: int = 60) -> list[str]:
    return textwrap.wrap(text, n)


def write_json(p: Path, v) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(v, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

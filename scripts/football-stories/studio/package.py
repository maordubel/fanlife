"""Packaging: captions, chapters from the actual cut, description with sources and credits, thumbnails, and the
synthetic-media decision — all derived from what was rendered, never from what was planned.
"""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image

from .common import CHANNEL_HANDLE, CHANNEL_ID, CHANNEL_NAME, KIT, SLOGAN, Palette, write_json
from .paper import art_backdrop
from .sprites import SpriteFactory


def ts_srt(t: float) -> str:
    ms = max(0, round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'


def ts_vtt(t: float) -> str:
    return ts_srt(t).replace(',', '.')


def ts_chapter(t: float) -> str:
    t = int(t)
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f'{h}:{m:02d}:{s:02d}' if h else f'{m}:{s:02d}'


def captions(plan: dict) -> list[dict]:
    """Cues of at most two lines of 42 characters and 6 seconds, broken at sentence ends."""
    cues = []
    for s in plan['shots']:
        if not s['words']:
            continue
        base = s['voice_at']
        cur: list[dict] = []

        def flush():
            if cur:
                text = ' '.join(w['w'] for w in cur)
                cues.append({'start': base + cur[0]['start'], 'end': base + cur[-1]['end'] + 0.15, 'text': text})
                cur.clear()
        for w in s['words']:
            if cur and (len(' '.join(x['w'] for x in cur + [w])) > 80 or (w['end'] - cur[0]['start']) > 6.0):
                flush()
            cur.append(w)
            if re.search(r'[.!?…]["”’]?$', w['w']) and len(' '.join(x['w'] for x in cur)) > 30:
                flush()
        flush()
    for a, b in zip(cues, cues[1:]):
        a['end'] = min(a['end'], b['start'] - 0.04)
    out = []
    for c in cues:
        words, lines, line = c['text'].split(), [], ''
        for w in words:
            if line and len(line) + 1 + len(w) > 42:
                lines.append(line)
                line = w
            else:
                line = (line + ' ' + w).strip()
        lines.append(line)
        if len(lines) > 2:
            lines = [' '.join(words[: len(words) // 2]), ' '.join(words[len(words) // 2:])]
        out.append({**c, 'lines': lines})
    return out


def write_captions(cues: list[dict], d: Path) -> tuple[Path, Path]:
    srt = '\n'.join(f'{i + 1}\n{ts_srt(c["start"])} --> {ts_srt(c["end"])}\n' + '\n'.join(c['lines']) + '\n' for i, c in enumerate(cues))
    vtt = 'WEBVTT\n\n' + '\n'.join(f'{ts_vtt(c["start"])} --> {ts_vtt(c["end"])}\n' + '\n'.join(c['lines']) + '\n' for c in cues)
    (d / 'captions.en.srt').write_text(srt, encoding='utf-8')
    (d / 'captions.en.vtt').write_text(vtt, encoding='utf-8')
    return d / 'captions.en.srt', d / 'captions.en.vtt'


def chapters(plan: dict) -> list[dict]:
    """YouTube chapters: first at 0:00, at least three, each at least ten seconds long."""
    ch = [{'t': 0.0 if i == 0 else c['t'], 'title': c['title']} for i, c in enumerate(plan['chapters'])]
    ok = [ch[0]]
    for c in ch[1:]:
        if c['t'] - ok[-1]['t'] >= 10:
            ok.append(c)
    return ok if len(ok) >= 3 else []


def used_claims(script: dict, ledger: dict) -> list[dict]:
    ids = set()
    for ch in script['chapters']:
        for b in ch['beats']:
            ids.update(b.get('claim_ids') or [])
            v = b['visual']
            if v.get('claim'):
                ids.add(v['claim'])
            ids.update(v.get('claims') or [])
    return [c for c in ledger['claims'] if c['id'] in ids]


HEBREW = re.compile(r'[\u0590-\u05FF]')
# The archive's own source titles are often Hebrew notes; the channel is English. Known hosts get an English label.
HOST_LABELS = {'wiki.red-fans.com': "Vikipoel, the Hapoel Tel Aviv supporters' wiki",
               'he.wikipedia.org': 'Hebrew Wikipedia', 'www.one.co.il': 'ONE (Israeli sports site)',
               'www.sport5.co.il': 'Sport 5', 'www.football.org.il': 'Israel Football Association'}


def english_title(title: str, url: str) -> str:
    """A source title fit for an English description: Hebrew notes in brackets dropped, a Hebrew title replaced by
    the host's English name."""
    t = re.sub(r'\s*\([^)]*[\u0590-\u05FF][^)]*\)', '', title or '').strip()
    if HEBREW.search(t) or not t:
        host = re.sub(r'^https?://([^/]+).*$', r'\1', url)
        label = HOST_LABELS.get(host, host)
        tail = [w for w in re.split(r'\s+[—-]\s+', t) if w and not HEBREW.search(w)]
        t = label + (f' — {tail[-1]}' if tail else '')
    if ' ' not in t and url.lower().endswith('.pdf'):  # a file's internal name ("prjUCLPrint") is not a title
        host = re.sub(r'^https?://(?:www\.)?([^/]+).*$', r'\1', url)
        t = f"{'UEFA' if host.endswith('uefa.com') else HOST_LABELS.get(host, host)} — official match report (PDF)"
    return t


def sources_list(claims: list[dict]) -> list[dict]:
    seen, out = set(), []
    for c in claims:
        for s in c.get('sources') or []:
            u = s.get('url')
            if u and u not in seen:
                seen.add(u)
                out.append({'title': english_title(s.get('title') or u, u), 'url': u})
    return out


def synthetic_decision(manifest: dict) -> dict:
    """YouTube's altered/synthetic disclosure, decided from the assets actually in the cut.
    Required when the film shows a REALISTIC scene that did not happen, alters real footage, or makes a real person
    appear to say or do something. Stylised paper-cut illustrations, maps and typeset graphics are not realistic;
    the narrator is a synthetic voice of no real person. A photoreal generated image or a cloned voice flips it."""
    photoreal = [a for a in manifest.get('assets', []) if a.get('photoreal')]
    cloned = manifest.get('voice', {}).get('cloned_real_person')
    flag = bool(photoreal or cloned)
    return {'altered_or_synthetic': flag,
            'reason': ('Photoreal generated imagery or a cloned voice is present' if flag else
                       'No realistic synthetic scene, no altered footage, no real person depicted or voiced: the illustrations are '
                       'stylised paper-cut collage and the narrator is a synthetic voice of no real person.'),
            'transparency_line': 'Narration voice and illustrations are AI-generated. No archive footage is shown; graphics present archive records.'}


def description(script: dict, plan: dict, ledger: dict, manifest: dict) -> str:
    srcs = sources_list(used_claims(script, ledger))
    chs = chapters(plan)
    parts = [script['description'].strip(), '']
    if chs:
        parts += ['Chapters'] + [f'{ts_chapter(c["t"])} {c["title"]}' for c in chs] + ['']
    parts += ['Sources'] + [f'• {s["title"]} — {s["url"]}' for s in srcs[:25]]
    if len(srcs) > 25:
        parts.append(f'• and {len(srcs) - 25} more archive records')
    parts += ['', 'Credits',
              f'• Facts: the FanLife archive and the sources above. Scores, dates and tables on screen are printed from those records.',
              f'• Narration: {manifest["voice"]["credit"]}',
              '• Score and sound effects: composed for this film; crowd atmosphere from FanLife\'s own recordings.',
              ('• Illustrations: AI-generated art made for FanLife. Pictures marked ILLUSTRATION are drawn to look like photographs or '
               'documents of real players and tickets, based on the match reports — they are not photographs, and personal details are blurred.'
               if any(a.get('photoreal') for a in manifest.get('assets', [])) else
               '• Illustrations and stop-motion clips: AI-generated paper-cut art made for FanLife. They are symbolic: fictional figures, not photographs of the matches.'),
              '• Maps: Natural Earth (public domain).',
              '• ' + synthetic_decision(manifest)['transparency_line'],
              '', SLOGAN, f'{CHANNEL_NAME} · {CHANNEL_HANDLE}']
    text = '\n'.join(parts)
    return text[:4900]


def thumbnails(sp: SpriteFactory, script: dict, ledger: dict, out: Path) -> list[Path]:
    arts = ['terrace-crowd', 'tunnel', 'supporter']
    paths = []
    for i, th in enumerate(script['thumbnails'][:3]):
        a = out / f'_thumbart-{i}.jpg'
        if arts[i] == 'supporter':
            from .paper import supporter_scene
            supporter_scene(9, (1280, 720)).save(a, quality=92)
        else:
            art_backdrop(arts[i], (1280, 720)).save(a, quality=92)
        p = sp.thumbnail(f'{i}', th['text'], f"{ledger['club_name']} · {ledger['season'].replace('/', '–')}", a.as_uri())
        jpg = out / f'thumbnail-{i + 1}.jpg'
        Image.open(p).convert('RGB').save(jpg, quality=90, optimize=True)
        paths.append(jpg)
    return paths


def youtube_metadata(script: dict, plan: dict, ledger: dict, manifest: dict) -> dict:
    title = script['title_candidates'][script['selected']]['title']
    return {'channel_id': CHANNEL_ID, 'title': title, 'description': description(script, plan, ledger, manifest),
            'tags': script['tags'], 'category': 'Sports', 'category_id': '17', 'default_language': 'en',
            'made_for_kids': False, 'privacy_default': 'private', 'synthetic_media': synthetic_decision(manifest),
            'title_candidates': script['title_candidates'], 'shorts': script['shorts'], 'thumbnail_concepts': script['thumbnails'],
            'chapters': [{'time': ts_chapter(c['t']), 'title': c['title']} for c in chapters(plan)]}

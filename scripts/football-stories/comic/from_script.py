"""A CLASSIFIED script document → its episode (owner, 8.11.2026: "make sure everything can go to work").

The writers' room (docs/fanlife/classified/WRITERS-ROOM.md §7) writes a FILE as a table:

    | Time | Panel · camera | Narration | On screen |
    | **CHAPTER 1 · THE WORLD** | | | |
    | 0:44 | P04 the bench · slow push-in | Thirty-two minutes gone. [1][3] | Caption: *The Dell · 23 November 1996* |

and this turns it into comic/episodes/fileNN-….json — the beats (panel, line, camera move, chapter, sources, the board's
cards), the sources and the package — keeping what only the episode holds (fps, grade, approval). Every panel role the
script names is put in the FILE's panel map (classified_manifest.json) as `fNN-<role>`; a role with no picture yet waits
there with no Drive id, so the episode validates and the run stops at "panels missing" until the owner uploads them.

    python3 -m comic.from_script docs/fanlife/classified/file04-the-cousin.script.md [--write]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from .manifest import MANIFEST, load_manifest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
EPISODES = HERE / 'episodes'
KIT = {'S02': 's02-dossier', 'S03': 's03-laugh'}
ROLE = re.compile(r'^\s*(CH\d|P\d{2}|S0[2-5])\b')
CITE = re.compile(r'\s*\[(\d+)\]')
WPS = 2.35  # Kokoro George's narration rate with breaths, words a second (FILE 01)

MOVES = [  # the camera words a script uses → the board camera's move
    (r'crane[ -]?down|top-down', 'crane_down'), (r'crane[ -]?up', 'crane_up'), (r'orbit', 'orbit'), (r'tilt', 'tilt3d'),
    (r'pull[ -]?(out|back)|pulls? away', 'pull'), (r'push[ -]?in|macro|close', 'push'), (r'pan (to the )?left|pan_l', 'pan_l'),
    (r'pan (to the )?right|pan along|pan_r|pan across', 'pan_r'), (r'pan down|tilt down', 'pan_down'), (r'follow|tracking', 'follow'),
    (r'dolly|slide', 'dolly_r'), (r'drift|handheld|float', 'slowmo'), (r'hold|static|still', 'hold'),
]
MOOD = {'COLD OPEN': ('tense', 'tense'), 'CLOSE': ('minor', 'hush')}
TONE_MOOD = {'LAUGH': 'light', 'WAR': 'tense', 'HEART': 'minor'}


def move_of(camera: str) -> str:
    c = camera.lower()
    return next((m for rx, m in MOVES if re.search(rx, c)), 'push')


def cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip('|').split('|')]


def strip_md(s: str) -> str:
    return re.sub(r'[*_`]', '', s).strip()


def parse(md: str) -> dict:
    """The script document → {beats, sources, package, chapters}."""
    out = {'beats': [], 'sources': [], 'package': {}, 'tone': None, 'title': None}
    m = re.search(r'FILE\s+(\d+)\s*·\s*([A-Z0-9’\'\- ]+?)\s+—', md)
    if m:
        out['number'], out['title'] = m.group(1), m.group(2).strip()
    t = re.search(r'Tab:\s*\*\*(LAUGH|WAR|HEART)\*\*', md)
    out['tone'] = t.group(1) if t else None
    section = ''
    chapter, chapter_n, pending_chapter = None, 0, None
    in_table = False
    for line in md.splitlines():
        if line.startswith('## '):
            section = line[3:].strip().lower()
            in_table = False
            continue
        if not line.startswith('|'):
            in_table = in_table and not line.strip() == '' and False
        if line.startswith('|') and not in_table and re.search(r'\|\s*Narration\s*\|', line):
            in_table = True
            continue
        if in_table and line.startswith('|'):
            c = cells(line)
            if len(c) < 4 or set(c[0]) <= set('-: '):
                continue
            head = strip_md(c[0])
            if c[0].startswith('**') and not any(x.strip() for x in c[1:]):
                name = head.split('·', 1)[-1].strip() if '·' in head else head
                chapter = head
                pending_chapter = name.title() if head not in ('COLD OPEN',) else 'Cold open'
                if head.startswith('CHAPTER'):
                    chapter_n += 1
                    out['beats'].append({'_chapter_card': True, 'n': chapter_n, 'text': name})
                continue
            panel_cell, say_cell, screen = c[1], c[2], c[3]
            pm = ROLE.match(strip_md(panel_cell))
            role = pm.group(1) if pm else None
            camera = panel_cell.split('·', 1)[1].strip() if '·' in panel_cell else ''
            say = strip_md(say_cell)
            cites = [int(x) for x in CITE.findall(say)]
            say = CITE.sub('', say).strip()
            if say in ('—', '-', '(automatic)', ''):
                say = ''
            out['beats'].append({'role': role, 'camera': strip_md(camera), 'say': say, 'sources': cites,
                                 'screen': screen, 'chapter': pending_chapter, 'section': chapter, 'time': head})
            pending_chapter = None
        elif section.startswith('sources'):
            s = re.match(r'^\s*(\d+)\.\s+(.*)$', line)
            if s:
                txt = s.group(2).strip()
                link = re.match(r'^\[(.+?)\]\((https?://[^)]+)\)\s*(.*)$', txt)
                if link:
                    out['sources'].append({'n': int(s.group(1)), 'title': link.group(1).strip(), 'url': link.group(2)})
                else:
                    out['sources'].append({'n': int(s.group(1)), 'title': txt.split(' — ', 2)[0] + (' — ' + txt.split(' — ', 2)[1] if ' — ' in txt else '')})
        elif section.startswith('package'):
            p = out['package']
            if line.startswith('- Titles:'):
                p['title_candidates'] = [x.strip() for x in line.split(':', 1)[1].split('·') if x.strip()]
            elif line.startswith('- Hook:'):
                p['hook'] = line.split(':', 1)[1].strip()
            elif line.startswith('- Thumbnail:'):
                tm = re.match(r'- Thumbnail:\s*(\S+)\s*·\s*(.+)$', line)
                if tm:
                    p.setdefault('thumbnails', []).append({'role': tm.group(1), 'hook': [x.strip() for x in tm.group(2).split('/')]})
            elif line.startswith('- Short:'):
                sm = re.match(r'- Short:\s*(b\d+\w*)\s*[–-]\s*(b\d+\w*)\s*·\s*(.+)$', line)
                if sm:
                    p.setdefault('shorts', []).append({'from': sm.group(1), 'to': sm.group(2), 'hook': sm.group(3).strip()})
    return out


def screen_fx(screen: str, say: str, chapter: str | None) -> tuple[list[dict], dict]:
    """The On screen column → the board's cards. Returns (fx, beat fields)."""
    fx, extra = [], {}
    s = screen
    cap = re.search(r'Caption:\s*\*([^*]+)\*', s)
    if cap:
        label, _, text = cap.group(1).partition(' — ')
        fx.append({'type': 'caption', 't0': 0.8, 'label': (label if text else (chapter or 'CASE FILE')).upper()[:40],
                   'text': (text or label).strip(), 'cps': 30, 'pos': 'tl'})
    for v in re.finditer(r'Tab:\s*\*([^*]+)\*', s):
        text = v.group(1).strip()
        fx.append({'type': 'version', 'text': text, 'side': 'r' if re.search(r'VERSION B', text) else 'l', 't0': 0.5})
    sc = re.search(r'Score card\s*\*([^*]+)\*', s)
    if sc:
        fx.append({'type': 'score', 'text': sc.group(1).strip(), 't0': 1.0})
    shout = re.search(r'\*\*([A-Z][A-Z !?·\'’-]+[!?])\*\*', s)
    if shout and say:
        last = say.split()[-1]
        extra['smash_at_word'] = last
        fx.append({'type': 'smash', 't0': 'word', 'text': shout.group(1).split('·')[0].strip()})
    if '**CLASSIFIED**' in s or re.search(r'\*FILE \d+ · CLOSED\*', s):
        fx += [{'type': 'tab', 't0': 0.15}, {'type': 'stamp', 't0': 0.4, 'at': [0.5, 0.34], 'rot': -9, 'scale': 1.05}]
        if '**CLASSIFIED**' in s:
            fx.append({'type': 'title', 't0': 1.8, 'at': [0.5, 0.7]})
    if re.search(r'fade to black|fades? to black', s, re.I):
        fx.append({'type': 'fade_black', 'to': 0.85})
    return fx, extra


def build(md_path: Path, write: bool = False) -> tuple[dict, list[str]]:
    md = md_path.read_text(encoding='utf-8')
    doc = parse(md)
    key = 'file' + doc['number']
    old_path = next(EPISODES.glob(f'{key}-*.json'), None)
    old = json.loads(old_path.read_text()) if old_path else {}
    man = load_manifest()
    tone = doc['tone'] or old.get('tone') or 'LAUGH'
    mood = TONE_MOOD[tone]
    roles: list[str] = []
    beats, n = [], 0
    for b in doc['beats']:
        if b.get('_chapter_card'):
            beats.append({'id': f'c{b["n"]:02d}', 'panel': KIT['S03'] if tone == 'LAUGH' else KIT['S02'], 'dur': 2.6,
                          'mood': mood, 'move': 'dolly_r', 'transition': 'turn',
                          'fx': [{'type': 'chapter', 'n': b['n'], 'text': b['text'], 't0': 0.25}]})
            continue
        if b['role'] is None and not b['say'] and 'Sources' not in b['screen']:
            continue  # the follow line and the like: produce.py adds them
        n += 1
        bid = b['time'] if re.fullmatch(r'b\d+\w*', b['time'] or '') else f'b{n:02d}'
        role = b['role'] or 'S02'
        panel = KIT.get(role) or f'f{doc["number"]}-{role.lower()}'
        if role not in KIT and role not in roles:
            roles.append(role)
        fx, extra = screen_fx(b['screen'], b['say'], b['chapter'] or (b['section'] or '').split('·')[-1].strip())
        if 'Sources' in b['screen'] and not b['say']:
            beats.append({'id': bid, 'panel': KIT['S02'], 'dur': 6.0, 'mood': mood, 'move': 'hold', 'transition': 'fade',
                          'fx': [{'type': 'sources', 't0': 0.3}]})
            continue
        sec = (b['section'] or '').upper()
        m, delivery = MOOD.get('COLD OPEN' if 'COLD OPEN' in sec else 'CLOSE' if sec.startswith('CLOSE') else '', (mood, None))
        row = {'id': bid, 'panel': panel, **({'say': b['say']} if b['say'] else {'dur': 4.0}),
               **({'chapter': b['chapter']} if b['chapter'] else {}), 'mood': m, **({'delivery': delivery} if delivery else {}),
               'move': move_of(b['camera']), 'focus': 'subject', 'amount': 0.18, 'transition': 'fade',
               **({'sources': b['sources']} if b['sources'] else {}), 'camera': b['camera'] or 'one move, held for the line',
               **extra, **({'fx': fx} if fx else {})}
        if b['say']:
            row['dur'] = round(max(3.0, len(b['say'].split()) / WPS + 0.8), 1)
        beats.append(row)
    words = sum(len(b.get('say', '').split()) for b in beats)
    pk = {k: v for k, v in (old.get('package') or {}).items() if k not in ('thumbnails', 'shorts')}  # re-derived from this script
    pk.update({k: v for k, v in doc['package'].items() if k not in ('thumbnails',)})
    if doc['package'].get('thumbnails'):
        pk['thumbnails'] = [{'panel': KIT.get(t['role']) or f'f{doc["number"]}-{t["role"].lower()}', 'hook': t['hook']}
                            for t in doc['package']['thumbnails']]
    pk.setdefault('selected', 0)
    if doc['package'].get('hook'):
        pk['hook_options'] = [{'text': doc['package']['hook']}]
    ep = {**{k: v for k, v in old.items() if k not in ('beats', 'sources', 'package')},
          'file': key, 'number': doc['number'], 'title': doc['title'] or old.get('title'), 'tone': tone,
          'fps': old.get('fps', 25), 'grade': old.get('grade', 0.4),
          'script': str(md_path.resolve().relative_to(ROOT)) if md_path.resolve().is_relative_to(ROOT) else str(md_path),
          'script_version': re.search(r'\((draft[^)]*)\)', md).group(1) if re.search(r'\((draft[^)]*)\)', md) else old.get('script_version'),
          'approved': False, 'minutes': round(words / WPS / 60 + 0.4, 1),
          'beats': beats, 'sources': doc['sources'], 'package': pk}
    # every role in the FILE's panel map: a picture already mapped keeps its Drive id; a new role waits for its upload
    f = man['files'].setdefault(key, {'title': ep['title'], 'number': doc['number'], 'tone': tone, 'brief_roles': [], 'panels': []})
    have = {p['id'] for p in f['panels']}
    for r in roles:
        pid = f'f{doc["number"]}-{r.lower()}'
        if r not in f['brief_roles']:
            f['brief_roles'].append(r)
        if pid not in have:
            f['panels'].append({'id': pid, 'role': r, 'kind': 'panel', 'name': f'{r} (to be supplied)', 'drive_id': None, 'file': f'{pid}.png'})
    from .produce import validate
    errs = validate(ep, man)
    if write:
        dest = old_path or EPISODES / f'{key}-{re.sub(r"[^a-z0-9]+", "-", ep["title"].lower()).strip("-")}.json'
        dest.write_text(json.dumps(ep, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return ep, errs


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('script', type=Path)
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args(argv)
    ep, errs = build(a.script, a.write)
    words = sum(len(b.get('say', '').split()) for b in ep['beats'])
    print(f"{ep['file']} · {ep['title']} · {len(ep['beats'])} beats · {words} words · ~{ep['minutes']} min · {len(ep['sources'])} sources")
    for e in errs:
        print('  ✗', e)
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main())

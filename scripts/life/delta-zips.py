#!/usr/bin/env python3
"""
המשלוח — the delta, split so a browser can actually upload it.

Maor uploads through GitHub's web interface, which takes at most 100 files at a time and
never deletes. This builds the difference between what is on `origin/main` and what is in
this branch, in ZIPs of at most 99 files, with the repository's own folder structure
inside each one so a drag-and-drop lands every file where it belongs.

The split is by MEANING, not by an arbitrary count: the code that makes the game behave,
the art that makes it look like something, and — last, and optional — the raw boards, which
nothing on the site loads and which are most of the megabytes.
"""
import os, subprocess, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'delta'
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
BASE = ARGS[0] if ARGS else 'origin/main'
# --one: חבילה אחת, כשהכול נכנס בה.
#
# הפיצול לפי משמעות קיים בשביל משלוח גדול — 900 קבצים של גרפיקה אינם אותו דבר כמו
# ארבעים קבצי קוד, ומי שמעלה אותם רוצה לדעת מה הוא גורר. אבל כשכל הדלתא נכנסת מתחת
# לשני התקרות (99 קבצים ו-45MB), פיצול ל-4 קבצים הוא ארבע הורדות וארבע גרירות במקום
# אחת. **הדרישה של מאור מפורשת: הזיפ הוא *הקובץ*, לא ערימה.**
ONE = '--one' in sys.argv

changed = subprocess.run(
    ['git', 'diff', '--name-only', '--diff-filter=d', BASE, 'HEAD'],
    cwd=ROOT, capture_output=True, text=True, check=True,
).stdout.split()
deleted = subprocess.run(
    ['git', 'diff', '--name-only', '--diff-filter=D', BASE, 'HEAD'],
    cwd=ROOT, capture_output=True, text=True, check=True,
).stdout.split()

files = [f for f in changed if (ROOT / f).is_file()]


def take(pred):
    """Pull the files a group claims out of the pool, in repo order."""
    got = [f for f in files if pred(f)]
    for f in got:
        files.remove(f)
    return got


# Order matters: each group takes what is left, so the last one is the remainder.
GROUPS_SPLIT = [
    ('code-game', 'הקוד — המנוע, המסכים והתוכן', lambda f: f.split('/')[0] in
        {'app', 'components', 'lib', 'messages', 'content'}),
    ('code-tools', 'הכלים, הבדיקות והתיעוד', lambda f: f.split('/')[0] in
        {'scripts', 'tests', 'docs'} or '/' not in f),
    ('art-life', 'הגרפיקה של THE WORKER LIFE', lambda f: f.startswith('public/life/')),
    ('public', 'שאר ה-public', lambda f: f.startswith('public/')),
    ('brand-source', 'הלוחות המקוריים — ארכיון, לא נטען באתר', lambda f: f.startswith('brand/')),
    ('rest', 'שאר הקבצים', lambda f: True),
]

GROUPS = [('delta', 'הדלתא המלאה', lambda f: True)] if ONE else GROUPS_SPLIT

LIMIT = 99
# A browser upload takes 100 files; a chat attachment does not want 140 megabytes. Both
# caps are real, so a group is cut on whichever it reaches first.
SIZE_CAP = 45 * 1024 * 1024
OUT.mkdir(exist_ok=True)
for old in OUT.glob('*.zip'):
    old.unlink()

index, manifest = 1, []
for slug, titleHe, pred in GROUPS:
    group = take(pred)
    if not group:
        continue
    parts, part, bytes_so_far = [], [], 0
    for f in group:
        size = (ROOT / f).stat().st_size
        if part and (len(part) >= LIMIT or bytes_so_far + size > SIZE_CAP):
            parts.append(part)
            part, bytes_so_far = [], 0
        part.append(f)
        bytes_so_far += size
    if part:
        parts.append(part)
    for n, part in enumerate(parts, 1):
        suffix = f'-{n}' if len(parts) > 1 else ''
        name = f'{index:02d}-{slug}{suffix}.zip'
        path = OUT / name
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for f in part:
                z.write(ROOT / f, f)
        size = path.stat().st_size
        manifest.append((name, titleHe, len(part), size, part))
        index += 1

print(f'{BASE} → HEAD   {sum(m[2] for m in manifest)} files in {len(manifest)} zips\n')
for name, titleHe, count, size, part in manifest:
    roots = sorted({'/'.join(f.split('/')[:2]) if '/' in f else '(root)' for f in part})
    print(f'{name:32s} {count:3d} files  {size/1048576:7.1f} MB  {titleHe}')
    print(f'{"":32s}     {", ".join(roots[:6])}{" …" if len(roots) > 6 else ""}')
if deleted:
    print('\nקבצים שנמחקו — העלאה דרך הדפדפן לא מוחקת, צריך למחוק ידנית:')
    for f in deleted:
        print(f'  {f}')

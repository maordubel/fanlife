#!/usr/bin/env python3
"""Recover source records, not the unpersisted counts from the interrupted chat.

Only public season documents; three concurrent requests maximum, cached locally.
This collection step grants no approval. build-history-2026-10-18.py validates and
promotes records under the owner's 18 October instruction.
"""
import concurrent.futures
import hashlib
import html
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'research-data/history-recovery-2026-10-18'
CACHE = Path('/tmp/fanlife-recovery-cache')


def owner_spelling(value):
    """Apply the exact owner ruling from lib/canon/spelling.ts at ingestion."""
    if isinstance(value, str):
        return re.sub(r'(שלו[םמ])([\s\-_\u05BE]+)תקו{2}ה', r'\1\2תקוה', value)
    if isinstance(value, list):
        return [owner_spelling(item) for item in value]
    if isinstance(value, dict):
        return {key: owner_spelling(item) for key, item in value.items()}
    return value


def fetch(url, key):
    CACHE.mkdir(exist_ok=True)
    p = CACHE / key
    if not p.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'FanLife-ArchiveResearch/1.0 (https://fanlife.dubelteam.com)'})
        with urllib.request.urlopen(req, timeout=40) as r:
            data = r.read()
        p.write_bytes(data)
        time.sleep(.3)
    data = p.read_bytes()
    declared = re.search(br'charset\s*=\s*["\x27]?([a-zA-Z0-9_-]+)', data[:3000], re.I)
    encoding = declared[1].decode('ascii') if declared else 'utf-8'
    try:
        decoded = data.decode(encoding)
    except UnicodeDecodeError:
        if declared or 'rsssf.org/' not in url:
            raise
        # A few older RSSSF pages omit the declaration but use the same Central
        # European Windows encoding as the declared neighbouring seasons.
        # Decode strictly; never replace unreadable bytes with a question mark.
        decoded = data.decode('windows-1250')
    return decoded, hashlib.sha256(data).hexdigest()


def flight(text):
    chunks = []
    for m in re.finditer(r'self\.__next_f\.push\((\[.*?\])\)</script>', text):
        row = json.loads(m[1])
        if len(row) > 1 and isinstance(row[1], str):
            chunks.append(row[1])
    return ''.join(chunks)


def arrays(text, key):
    out = []
    for m in re.finditer('"' + key + '":', flight(text)):
        value, _ = json.JSONDecoder().raw_decode(flight(text)[m.end():])
        if isinstance(value, list):
            out.extend(value)
    return out


def hpt(year):
    url = f'https://hpt.co.il/seasons/{year}'
    text, sha = fetch(url, f'hpt-{year}.html')
    title = re.search(r'<h1[^>]*>(.*?)</h1>', text)
    label = html.unescape(re.sub('<[^>]+>', '', title[1])).replace('עונת ', '').strip() if title else None
    games = arrays(text, 'games')
    # Same record can be rendered twice. Different versions never silently win.
    by_id = {}
    for row in games:
        if row['id'] in by_id and by_id[row['id']] != row:
            raise ValueError(f'conflicting source id {row["id"]}')
        by_id[row['id']] = row
    doc = {'sourceUrl': url, 'sha256': sha, 'seasonLabel': label, 'seasonId': year, 'games': list(by_id.values())}
    normalized = owner_spelling(doc)
    if normalized != doc:
        normalized['normalizations'] = ['Owner spelling: שלום תקוה (spec §0.1, 22.9.2026); sha256 still identifies the downloaded bytes.']
    return normalized


def rsssf(year):
    suffix = str(year) if year >= 2010 else str(year)[-2:]
    url = f'https://www.rsssf.org/tablesb/bih{suffix}.html'
    text, sha = fetch(url, f'bih-{year}.html')
    # Keep line structure: RSSSF date headings apply to the following result lines.
    plain = html.unescape(re.sub('<[^>]*>', '', text))
    return {'sourceUrl': url, 'sha256': sha, 'seasonEnd': year, 'text': plain}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index, sha = fetch('https://hpt.co.il/seasons', 'hpt-seasons.html')
    years = sorted(set(map(int, re.findall(r'href="/seasons/(\d+)"', index))))
    if len(years) < 80:
        raise ValueError('HPT season index changed')
    tasks = [('hpt', y) for y in years] + [('rsssf', y) for y in range(1995, 2027)]
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
        jobs = {ex.submit(hpt if kind == 'hpt' else rsssf, y): (kind, y) for kind, y in tasks}
        for job in concurrent.futures.as_completed(jobs):
            kind, year = jobs[job]
            try:
                row = job.result()
                (OUT / f'{kind}-{year}.json').write_text(json.dumps(row, ensure_ascii=False, indent=1) + '\n')
                print(kind, year, len(row.get('games', [])) if kind == 'hpt' else len(row['text']), flush=True)
            except Exception as e:
                errors.append({'provider': kind, 'year': year, 'error': str(e)})
                print('FAILED', kind, year, str(e), flush=True)
    (OUT / 'collection.json').write_text(json.dumps({'checkedAt': '2026-10-18', 'hptIndexSha256': sha, 'hptSeasons': years, 'errors': errors}, indent=1) + '\n')


if __name__ == '__main__':
    main()

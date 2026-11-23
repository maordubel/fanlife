"""Kit marks research (owner, 23.11.2026: real crests, sponsors and makers on every drawn shirt).

For every maker and sponsor the drawn kits name that content/manual/maker-marks.json has no mark for, look on Wikimedia Commons for
its logo as an SVG (a free file: Commons hosts nothing else), keep the top candidates with their licence, and draw a contact sheet.
A person picks the right one (scripts/kits/approve-marks.py); nothing here reaches a shirt by itself.
  python3 scripts/kits/fetch-marks.py [--limit N]
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'content/research/kit-marks'
API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'FanLife kit-marks research (fanlife.dubelteam.com)'}


def get(url, params=None):
    if params:
        url += '?' + urllib.parse.urlencode(params)
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception:
            time.sleep(2 + i * 3)
    return None


def fold(s):
    return re.sub(r'[^a-z0-9α-ωא-ת]', '', s.lower())


def main():
    marks = json.loads((ROOT / 'content/manual/maker-marks.json').read_text())
    want = {}
    for f in (ROOT / 'content/generated/kit-svgs').glob('*.json'):
        if f.name == 'summary.json':
            continue
        for k in json.loads(f.read_text())['kits']:
            for g, n in (('makers', k.get('maker')), ('sponsors', k.get('sponsor'))):
                if n and n.lower().strip() not in marks[g] and n.lower().strip() not in ('no brand', 'none'):
                    want.setdefault((g, n.strip()), 0)
                    want[(g, n.strip())] += 1
    OUT.mkdir(parents=True, exist_ok=True)
    found = []
    for (g, n), uses in sorted(want.items(), key=lambda x: -x[1]):
        res = get(API, {'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': 12, 'format': 'json',
                        'srsearch': f'{n} logo filetype:drawing'})
        if not res:
            continue
        hits = [h['title'] for h in json.loads(res)['query']['search'] if h['title'].lower().endswith('.svg')]
        name = fold(n)
        hits = [h for h in hits if name and name[:5] in fold(h)][:3]
        for i, t in enumerate(hits):
            raw = get(API, {'action': 'query', 'titles': t, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'format': 'json'})
            if not raw:
                continue
            info = json.loads(raw)
            page = next(iter(info['query']['pages'].values()))
            ii = (page.get('imageinfo') or [{}])[0]
            meta = ii.get('extmetadata', {})
            body = get(ii.get('url', '')) if ii.get('url') else None
            if not body:
                continue
            slug = f"{g[:-1]}-{fold(n) or 'x'}-{i}"
            (OUT / f'{slug}.svg').write_bytes(body)
            found.append({'group': g, 'name': n, 'uses': uses, 'file': f'{slug}.svg', 'title': t, 'page': ii.get('descriptionurl'),
                          'license': (meta.get('LicenseShortName') or {}).get('value'), 'author': re.sub('<[^>]+>', '', (meta.get('Artist') or {}).get('value', ''))[:120]})
        time.sleep(1)
        (OUT / 'candidates.json').write_text(json.dumps(found, ensure_ascii=False, indent=1) + '\n')
    (OUT / 'candidates.json').write_text(json.dumps(found, ensure_ascii=False, indent=1) + '\n')
    print(len(want), 'names without a mark;', len({(c['group'], c['name']) for c in found}), 'with candidates;', len(found), 'files')


if __name__ == '__main__':
    main()

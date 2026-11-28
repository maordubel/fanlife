"""THE ALBUM — who is behind a Football Manager face (owner, 28.11.2026: "search the Manager by the serial number and fill
every gap you can from there"). The owner's FM 2024 face packs name each picture only by its FM person id; this asks
sortitoutsi (the FM community database) for each id's name, birth date, nationality and club, and writes
content/generated/fm-person-names.json. Runs on the GitHub runner (the build sandbox cannot reach the site).

Usage: python3 scripts/album/fm_names.py scripts/album/fm-ids.json"""
import html, json, re, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

UA = {'User-Agent': 'Mozilla/5.0 (FAN LIFE album; fanlife@dubelteam.com)'}
OUT = Path('content/generated/fm-person-names.json')


def one(fid):
    for t in range(3):
        try:
            req = urllib.request.Request(f'https://sortitoutsi.net/football-manager-2024/person/{fid}', headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                page = r.read().decode('utf-8', 'replace'); url = r.geturl()
            title = html.unescape(re.search(r'<title>(.*?)</title>', page, re.S).group(1)).strip()
            name = re.split(r'\s+[-|–]\s+', title)[0].strip()
            born = re.search(r'(\d{1,2}[./]\d{1,2}[./]\d{4}|\d{4}-\d{2}-\d{2})', page)
            club = re.search(r'/team/\d+/[^"]+"[^>]*>([^<]+)</a>', page)
            nat = re.search(r'/nation/\d+/[^"]+"[^>]*>([^<]+)</a>', page)
            return fid, {'name': name, 'url': url, 'born': born.group(1) if born else None,
                         'club': html.unescape(club.group(1)).strip() if club else None,
                         'nation': html.unescape(nat.group(1)).strip() if nat else None}
        except Exception as e:
            err = str(e)[:120]
            time.sleep(2 * (t + 1))
    return fid, {'error': err}


ids = json.loads(Path(sys.argv[1]).read_text())
out = {}
with ThreadPoolExecutor(6) as ex:
    for fid, rec in ex.map(one, list(ids)):
        rec['pack'] = ids[fid]
        out[fid] = rec
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
print('fm names:', sum(1 for v in out.values() if v.get('name')), 'of', len(out))

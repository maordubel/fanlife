"""Pull files and folders from the owner's public Drive into one directory (runs on the GitHub runner)."""
import json, re, sys
from pathlib import Path
sys.path.insert(0, 'scripts/football-stories/matchday')
import drive_fetch as d  # noqa: E402

req, dest = json.load(open(sys.argv[1])), Path(sys.argv[2])
rep = {'files': [], 'failed': []}
for f in req.get('files', []):
    t = dest / f['dir'] / re.sub(r'[\\/:*?"<>|]+', '_', f['name'])
    try:
        rep['files'].append({'path': str(t.relative_to(dest)), 'bytes': d.download(f['id'], t)})
    except Exception as e:  # reported, never skipped silently
        rep['failed'].append({'path': f['dir'] + '/' + f['name'], 'reason': str(e)[:200]})
for fo in req.get('folders', []):
    d.fetch(fo['id'], dest / fo['dir'], rep)
(dest / '_pull.json').write_text(json.dumps(rep, indent=1, ensure_ascii=False))
print(len(rep['files']), 'files', round(sum(x['bytes'] for x in rep['files']) / 1e6, 1), 'MB; failed', len(rep['failed']))

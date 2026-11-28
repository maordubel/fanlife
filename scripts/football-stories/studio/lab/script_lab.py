"""The script lab: write a film's scripts exactly as the worker would, and keep everything that went into them.

Owner, 28.11.2026: "we are not improving results … a script that sticks to the facts, builds tension, understands
football." A change to the writer is judged on what the production writer (Google's free models, the house crew when
they are busy) actually writes — not on a local stand-in. This runs the research and script stages of the pipeline for
one club and season and writes, per film:

    ledger.json          everything the writer was given (claims, the story block, the season book, deep research)
    script-<n>.json      each director's script, as the worker saves it
    script-<n>.txt       the narration only, as a viewer hears it
    report.json          the story judge's verdict on every script (studio/story_judge.py)

    python -m studio.lab.script_lab --club celtic --season 2016/17 --minutes 10 --out /tmp/lab

No film is rendered, nothing is uploaded, no job is touched. GitHub Actions: .github/workflows/stories-script-lab.yml.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def run(club: str, season: str, minutes: float, out: Path, topic: str = '', kind: str = 'season', log=print) -> dict:
    from .. import archive_props, characters, director, drama_facts, research, writer, script as sc
    from .. import deep_research, season_book, story_judge
    from ..common import StageError
    out.mkdir(parents=True, exist_ok=True)
    cache = out / 'cache'
    names = {c: research._club_names(c)[0] if research._club_names(c) else c.replace('-', ' ').title() for c in [club]}
    brief = {'club_id': club, 'club_name': names[club], 'season': season, 'duration': minutes, 'kind': kind,
             'scripts': 3, 'topic': topic, 'notes': ''}
    ledger = research.build_ledger(club, season)
    season_book.attach(ledger, brief, cache, log)
    deep_research.enrich(ledger, brief, cache, log)
    director.attach(ledger)
    drama_facts.attach(ledger)
    characters.attach(ledger)
    archive_props.attach(ledger)
    (out / 'ledger.json').write_text(json.dumps(ledger, ensure_ascii=False, indent=1), encoding='utf-8')
    report = {'club': club, 'season': season, 'minutes': minutes, 'scripts': []}
    try:
        made = writer.write_options(brief, {**ledger, 'bans': []}, cache, log, least=1)
    except StageError as e:
        report['error'] = str(e)
        made = []
    for i, s in enumerate(made, 1):
        (out / f'script-{i}.json').write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding='utf-8')
        lines = [b['narration'] for *_, b in sc.all_beats(s)]
        (out / f'script-{i}.txt').write_text(f'# {sc.selected_title(s)}\n# {s.get("_writer")}\n\n' + '\n\n'.join(lines) + '\n', encoding='utf-8')
        report['scripts'].append({'n': i, 'title': sc.selected_title(s), 'writer': s.get('_writer'), 'judge': story_judge.judge(s, ledger)})
    (out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
    dump(out, ledger, report)
    return report


def dump(out: Path, ledger: dict, report: dict) -> None:
    """Everything a reviewer needs, in the job log (the artifact store is not reachable from every machine)."""
    import glob
    print('\n===== LAB: SEASON BOOK =====')
    sb = ledger.get('season_book') or {}
    print(json.dumps({k: v for k, v in sb.items() if k != 'lead'}, ensure_ascii=False, indent=1)[:3000])
    raw = sorted(glob.glob(str(out / 'cache' / 'season-book' / '*.json')))
    if raw:
        book = json.loads(Path(raw[-1]).read_text())
        print('facts:', json.dumps(book.get('facts'), ensure_ascii=False)[:3000])
    print('\n===== LAB: FACT SHEET =====')
    from ..story_room import fact_sheet
    print(fact_sheet(ledger)[:6000])
    for f in sorted(glob.glob(str(out / 'cache' / 'story-room-*.json'))):
        print('\n===== LAB: TREATMENTS =====')
        print(Path(f).read_text()[:9000])
    for f in sorted(out.glob('script-*.txt')):
        print(f'\n===== LAB: {f.name} =====')
        print(f.read_text()[:12000])
    print('\n===== LAB: VERDICTS =====')
    print(json.dumps(report, ensure_ascii=False, indent=1)[:8000])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--club', required=True)
    ap.add_argument('--season', required=True)
    ap.add_argument('--minutes', type=float, default=8)
    ap.add_argument('--topic', default='')
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    r = run(a.club, a.season, a.minutes, a.out / f'{a.club}-{a.season.replace("/", "-")}', a.topic)
    for s in r['scripts']:
        print(f'{s["n"]}. {s["title"]} — {s["judge"]["score"]}/100 {s["judge"]["verdict"]}')


if __name__ == '__main__':
    main()

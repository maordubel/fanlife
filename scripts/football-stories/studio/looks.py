"""How a real person looks, from sources — so the Flow picture of a player named in a film is right in skin, hair, build
and era (owner, 14.11.2026: "if the film talks about a dark-skinned player he must be dark-skinned in the graphics too";
"a player named in the film appears only in a picture tagged for him, right in look and era — otherwise a card; make
it in Flow if missing").

  kit/people/looks.json   {slug: {name, club, era, skin, hair, build, facial_hair, sources: [...]}} — the look book
  kit/people/orders.json  the people the films named with no picture of their own yet (docu/plan writes them per job;
                          `collect` gathers them here)

A look is never guessed: `research` asks Google Search (grounded, docs: studio/deep_research) and keeps a feature only
when a grounding support covers the sentence that states it. A person with no grounded skin, hair and build gets no
order — the card holds (docs/rules/studio-pictures.md 2). The Flow prompt describes the look and the kit, never the name,
the year or the club (Flow refuses prominent people; flowkit, 8.11.2026).

The pictures are stored like every art-library piece (cinema/flow_library.json → the Flow operator, docs/fanlife/70)
under `person-<slug>-<era>-<pose>-fl1-kr`, so the media index finds them by the person's slug and era.

    python -m studio.looks research --name "Krzysztof Warzycha" --club panathinaikos --era 1990s
    python -m studio.looks collect <job-dir> ...      # merge a job's flow-people.json into orders.json
    python -m studio.looks research-orders            # research every open order (needs GEMINI_API_KEY)
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
BOOK = HERE / 'kit' / 'people' / 'looks.json'
ORDERS = HERE / 'kit' / 'people' / 'orders.json'
FEATURES = ('skin', 'hair', 'build', 'facial_hair')
NEEDED = ('skin', 'hair', 'build')       # without these three, no picture is ordered: a wrong face is worse than a card
POSES = {
    'portrait': 'head and shoulders, looking just past the viewer, calm and proud',
    'celebrate': 'running away in celebration, both arms out, mouth open in a roar, whole figure',
    'action': 'striking the ball at full stretch, body leaning back, whole figure',
}


def slug(name: str) -> str:
    s = unicodedata.normalize('NFKD', str(name)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def era_of(season: str | int | None) -> str:
    """'1993-94' / 1994 → '1990s'."""
    m = re.search(r'(19|20)\d\d', str(season or ''))
    return f'{m.group(0)[:3]}0s' if m else ''


def stem(name: str, era: str, pose: str) -> str:
    return f"person-{slug(name)}{'-' + era if era else ''}-{pose}-fl1-kr"


def load(path: Path = BOOK) -> dict:
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def save(d: dict, path: Path = BOOK) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(d, ensure_ascii=False, indent=1, sort_keys=True) + '\n', encoding='utf-8')


def ready(look: dict | None) -> bool:
    return bool(look) and all(str(look.get(k) or '').strip() for k in NEEDED)


def kit_design(club: str, season: str) -> str:
    """The shirt's design from the club's pack (stripes, hoops, a band…) — drawn in the signal red, which the library
    repaints in the club's colour. No crest, no sponsor."""
    try:
        from .flowkit import kit_lines
        for line in kit_lines(club, season):
            d = re.sub(r'^KIT [^:]*:\s*', '', line).strip()
            if d:
                return re.sub(r'\b(crest|badge|logo|sponsor)\w*\b[^,.;]*', '', d, flags=re.I).strip(' ,;')
    except Exception:  # noqa: BLE001 — no pack: a plain shirt
        pass
    return ''


def prompt(look: dict, pose: str, design: str = '') -> str:
    from .cinema.flow_library import CUT, STYLE
    shirt = f'a football shirt ({design}) in the signal red' if design else 'a plain football shirt in the signal red'
    era = look.get('era') or ''
    feats = ', '.join(str(look[k]).strip() for k in ('skin', 'hair', 'build', 'facial_hair') if str(look.get(k) or '').strip())
    who = f"A footballer of the {era} ({feats}), wearing {shirt} and period shorts and socks" if era else \
          f"A footballer ({feats}), wearing {shirt}"
    return f"{STYLE} {who}, {POSES[pose]}. The face must match this description exactly. {CUT}"


def pieces(book: dict | None = None) -> list[dict]:
    """The Flow orders for every person whose look is grounded: one piece a pose."""
    book = load() if book is None else book
    out = []
    for _, look in sorted(book.items()):
        if not ready(look):
            continue
        design = kit_design(look.get('club') or '', look.get('season') or '')
        for pose in POSES:
            out.append({'stem': stem(look['name'], look.get('era') or '', pose), 'aspect': '1:1', 'prompt': prompt(look, pose, design),
                        'person': look['name']})
    return out


# ── research ─────────────────────────────────────────────────────────────────────────────────────────────────────────
SYSTEM = '''You are a picture researcher for a football documentary. An illustrator must draw a real footballer as he
looked in a given era. Search the web for photographs and descriptions of him in that era and answer ONLY in JSON:
{"facts": ["one sentence per feature, naming him, e.g. 'X had short black curly hair in the 1990s.'", ...],
 "look": {"skin": "…", "hair": "…", "build": "…", "facial_hair": "…"}}
skin: his skin tone in plain words (e.g. "dark brown skin", "olive skin", "fair skin"); hair: colour, length and
style in that era; build: height and frame ("tall and slim", "short and stocky"); facial_hair: "clean-shaven",
"moustache", "full beard". Leave a field empty when the sources do not show it. Never guess.'''


def _supported(feature_text: str, facts: list[dict]) -> bool:
    words = [w for w in re.findall(r'[a-z]+', feature_text.lower()) if len(w) > 3]
    return bool(words) and any(all(w in f['fact']['text'].lower() for w in words[:2]) for f in facts)


def grounded_look(answer: dict, response: dict, resolve=None) -> tuple[dict, list[dict]]:
    """Keep each feature only when a grounded fact (deep_research.grounded_facts) states it."""
    from . import deep_research
    facts = deep_research.grounded_facts(answer, response, resolve=resolve or deep_research._resolve)
    look = {}
    for k in FEATURES:
        v = str((answer.get('look') or {}).get(k) or '').strip()
        if v and _supported(v, facts):
            look[k] = v
    sources = []
    for f in facts:
        for s in f['sources']:
            if s['url'] not in {x['url'] for x in sources}:
                sources.append(s)
    return look, sources[:6]


def research(name: str, club: str, era: str, season: str = '', log=print, call=None) -> dict:
    """Research one person's look; returns the book entry (features may be missing — then no order)."""
    import os
    if call is None:
        from . import gemini
        key = gemini.api_key()
        if not key:
            raise SystemExit('GEMINI_API_KEY is not set')

        def call(user):
            body = {'systemInstruction': {'parts': [{'text': SYSTEM}]}, 'contents': [{'role': 'user', 'parts': [{'text': user}]}],
                    'tools': [{'google_search': {}}], 'generationConfig': {'maxOutputTokens': 4000, 'temperature': 0.2}}
            r, _ = gemini.generate(key, body, wanted=os.environ.get('STORIES_RESEARCH_MODEL') or 'gemini-2.5-flash', budget_s=300, log=log)
            return r
    r = call(f'PLAYER: {name}\nCLUB: {club}\nERA: {era or "his career"}')
    text = ''.join(p.get('text', '') for c in r.get('candidates', []) for p in c.get('content', {}).get('parts', []))
    m = re.search(r'\{.*\}', text, re.S)
    try:
        answer = json.loads(m.group(0)) if m else {}
    except ValueError:
        answer = {}
    look, sources = grounded_look(answer, r)
    entry = {'name': name, 'club': club, 'era': era, 'season': season, **look, 'sources': sources}
    log(f"Look · {name}: {', '.join(f'{k}={v}' for k, v in look.items()) or 'nothing grounded'}")
    return entry


def collect(job_dirs: list[Path]) -> dict:
    orders = load(ORDERS)
    for jd in job_dirs:
        for o in load(Path(jd) / 'flow-people.json').get('people', []) if (Path(jd) / 'flow-people.json').exists() else []:
            orders.setdefault(slug(o['name']) + '-' + (o.get('era') or ''), o)
    save(orders, ORDERS)
    return orders


RETRY_DAYS = 30   # a person whose look the sources did not show is asked again a month later, not on every film


def after_film(job_dir: Path, log=print, call=None, commit=None) -> list[str]:
    """After a documentary is composed: research the look of every person it named with no picture of his own, and
    put the grounded ones on the Flow operator's list (cinema/flow_library.json). Runs in the studio worker, which may
    commit to main (as a CLASSIFIED file does: kinds._commit). Never fails the film. → the people now ordered."""
    import datetime as dt
    import os
    people = (load(Path(job_dir) / 'flow-people.json').get('people') or [])
    if not people:
        return []
    if call is None and not os.environ.get('GEMINI_API_KEY'):
        log(f"Looks: {len(people)} named with no picture of their own — no research key here, the cards hold")
        return []
    book, today, ordered = load(), dt.date.today(), []
    for o in people:
        k = slug(o['name']) + '-' + (o.get('era') or '')
        e = book.get(k)
        if ready(e):
            continue
        if e and e.get('asked') and (today - dt.date.fromisoformat(e['asked'])).days < RETRY_DAYS:
            continue
        try:
            e = research(o['name'], o.get('club') or '', o.get('era') or '', o.get('season') or '', log=log, call=call)
        except Exception as x:  # noqa: BLE001 — a quota, a network: the card holds, the film goes on
            log(f"Looks: {o['name']} not researched ({str(x)[:120]})")
            continue
        e['asked'] = today.isoformat()
        book[k] = e
        if ready(e):
            ordered.append(o['name'])
    save(book)
    if ordered:
        from .cinema import flow_library
        flow_library.main()
    if os.environ.get('GITHUB_WORKFLOW') == 'Football Stories worker' or commit:
        (commit or _commit_main)(['scripts/football-stories/studio/kit/people/looks.json',
                                  'scripts/football-stories/studio/cinema/flow_library.json'],
                                 f"Studio: looks researched ({', '.join(ordered) or 'none grounded'})", log)
    log(f"Looks: ordered in Flow — {', '.join(ordered)}" if ordered else 'Looks: nothing grounded enough to draw yet; the cards hold')
    return ordered


def _commit_main(paths, message, log):
    from .kinds import _commit
    return _commit(paths, message, log)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog='studio.looks')
    sub = ap.add_subparsers(dest='cmd', required=True)
    r = sub.add_parser('research')
    r.add_argument('--name', required=True)
    r.add_argument('--club', required=True)
    r.add_argument('--era', default='')
    r.add_argument('--season', default='')
    sub.add_parser('research-orders')
    c = sub.add_parser('collect')
    c.add_argument('jobs', nargs='+')
    a = ap.parse_args(argv)
    book = load()
    if a.cmd == 'collect':
        print(f'{len(collect([Path(x) for x in a.jobs]))} open orders')
        return 0
    todo = [{'name': a.name, 'club': a.club, 'era': a.era, 'season': a.season}] if a.cmd == 'research' else \
           [o for o in load(ORDERS).values() if not ready(book.get(slug(o['name']) + '-' + (o.get('era') or '')))]
    for o in todo:
        e = research(o['name'], o['club'], o.get('era') or '', o.get('season') or '')
        book[slug(o['name']) + '-' + (o.get('era') or '')] = e
        save(book)
    from .cinema import flow_library
    flow_library.main()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

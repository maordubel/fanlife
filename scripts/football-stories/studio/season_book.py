"""THE SEASON BOOK — what a season added up to, from the club's own season article on Wikipedia (free, cited).

Owner, 28.11.2026: "a script that sticks to the facts … that knows how to use the huge encyclopedia of information we
have, smartly." Measured the same day on Celtic 2016/17: the archive holds the club's matches (59 of them, scorers and
minutes for most) but nothing that says what the season WAS — no league position, no cup won, no manager, no top
scorer. The story block had no honours, so the film's big night became a 3–0 over Lincoln Red Imps in a season Celtic
won the treble. A documentary writer opens the season's page first; this module does the same.

    attach(ledger, brief, cache, log)   in place: honour claims, season-book claims and the article's lead as context

What becomes a claim (each cites the article and its revision):
    honour       {competition, result: 'won' | 'runner-up' | position | stage reached}   — the infobox's result rows
    season_book  {field: 'manager' | 'top_scorer' | 'attendance' | 'league', …}

The lead paragraph is ORIENTATION, like deep research's editorial notes: the writer may read it, never print a number or
a name from it that no claim carries. Nothing is guessed: a row the parser does not understand is left out and listed in
`ledger['season_book']['skipped']`. Without network (this machine) or without an article, the film goes on from the
archive and the ledger says so (`season_book.status`).
"""
from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from pathlib import Path

from .common import read_json, write_json

API = 'https://en.wikipedia.org/w/api.php'
UA = 'FanLifeStudio/1.0 (https://fanlife.dubelteam.com; studio research)'
VERSION = 1


# ── fetching (GitHub Actions: this machine's network refuses Wikipedia) ────────────────────────────────────────────

def _get(params: dict) -> dict:
    q = urllib.parse.urlencode({'format': 'json', 'formatversion': '2', **params})
    req = urllib.request.Request(f'{API}?{q}', headers={'User-Agent': UA, 'Api-User-Agent': UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)


def season_label(season: str) -> str:
    """'2016/17' → '2016–17' (the article's own en dash); '2023' stays."""
    m = re.fullmatch(r'(\d{4})\s*[/–-]\s*(\d{2,4})', season.strip())
    return f'{m.group(1)}–{m.group(2)[-2:]}' if m else season.strip()


def _title_fits(title: str, label: str, words: list[str]) -> bool:
    t = title.lower()
    return t.startswith(label.lower()) and 'season' in t and all(w in t for w in words)


def find_article(club_names: list[str], season: str) -> str | None:
    """The club's season article: '2016–17 Celtic F.C. season'. Searched, never assumed."""
    label = season_label(season)
    for name in club_names:
        words = [w for w in re.findall(r'[a-zà-ÿ]{3,}', name.lower()) if w not in ('the', 'club', 'football')][:2]
        try:
            hits = _get({'action': 'query', 'list': 'search', 'srsearch': f'{label} {name} season', 'srlimit': '8'})['query']['search']
        except Exception:  # noqa: BLE001
            return None
        for h in hits:
            if _title_fits(h['title'], label, words):
                return h['title']
    return None


def fetch(title: str) -> dict:
    p = _get({'action': 'parse', 'page': title, 'prop': 'wikitext|revid', 'section': '0', 'redirects': '1'})['parse']
    lead = ''
    try:
        pages = _get({'action': 'query', 'prop': 'extracts', 'exintro': '1', 'explaintext': '1', 'redirects': '1', 'titles': p['title']})['query']['pages']
        lead = (pages[0].get('extract') or '').strip()
    except Exception:  # noqa: BLE001 — the lead is context only
        pass
    return {'title': p['title'], 'revid': p.get('revid'), 'wikitext': p.get('wikitext') or '', 'lead': lead}


# ── reading the infobox ────────────────────────────────────────────────────────────────────────────────────────────

def _template(wikitext: str, name: str) -> str | None:
    m = re.search(r'\{\{\s*' + name, wikitext, re.I)
    if not m:
        return None
    depth, i = 0, m.start()
    while i < len(wikitext) - 1:
        two = wikitext[i:i + 2]
        if two == '{{':
            depth += 1
            i += 2
            continue
        if two == '}}':
            depth -= 1
            i += 2
            if depth == 0:
                return wikitext[m.start():i]
            continue
        i += 1
    return None


def clean(v: str) -> str:
    """Wikitext → the words a reader sees. Links keep their label, references and flags go, line breaks become '; '."""
    v = re.sub(r'<ref[^>]*/>', '', v)
    v = re.sub(r'<ref[^>]*>.*?</ref>', '', v, flags=re.S)
    v = re.sub(r'<!--.*?-->', '', v, flags=re.S)
    v = re.sub(r'<br\s*/?>', '; ', v, flags=re.I)
    v = re.sub(r'<[^>]+>', '', v)
    for _ in range(4):   # inner templates first
        v = re.sub(r'\{\{\s*(?:nowrap|small|nobold|abbr)\s*\|([^{}|]*)(?:\|[^{}]*)?\}\}', r'\1', v, flags=re.I)
        v = re.sub(r'\{\{\s*(?:flagicon|flag icon|fb|fbaicon|flagdeco|ref|efn|refn|sfn|cn|citation needed|cite[^|]*)[^{}]*\}\}', '', v, flags=re.I)
        v = re.sub(r'\{\{\s*(?:sortname)\s*\|([^{}|]*)\|([^{}|]*)[^{}]*\}\}', r'\1 \2', v, flags=re.I)
        v = re.sub(r'\{\{[^{}]*\}\}', '', v)
    v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', v)
    v = re.sub(r"'{2,}", '', v)
    v = re.sub(r'&nbsp;', ' ', v)
    return re.sub(r'\s+', ' ', v).strip(' ;,')


def infobox(wikitext: str) -> dict[str, str]:
    box = _template(wikitext, r'Infobox football club season')
    if not box:
        return {}
    body = box[2:-2]
    parts, depth, cur = [], 0, ''
    i = 0
    while i < len(body):   # split on '|' at depth 0 only (links and templates keep theirs)
        two = body[i:i + 2]
        if two in ('{{', '[['):
            depth += 1
            cur += two
            i += 2
            continue
        if two in ('}}', ']]'):
            depth -= 1
            cur += two
            i += 2
            continue
        if body[i] == '|' and depth == 0:
            parts.append(cur)
            cur = ''
        else:
            cur += body[i]
        i += 1
    parts.append(cur)
    out = {}
    for p in parts[1:]:
        if '=' in p:
            k, v = p.split('=', 1)
            k, v = k.strip().lower(), clean(v)
            if k and v:
                out[k] = v
    return out


ORDINAL = re.compile(r'^(\d{1,2})(st|nd|rd|th)\b', re.I)
WON = re.compile(r'^(winners?|champions?)\b', re.I)
SCORER = re.compile(r'^(.+?)\s*\((\d{1,3})\)$')


def _result(v: str) -> str | None:
    v = v.strip()
    if WON.match(v):
        return 'won'
    if re.match(r'^runners?[- ]up\b', v, re.I):
        return 'runner-up'
    m = ORDINAL.match(v)
    if m:
        return 'won' if m.group(1) == '1' else f'{m.group(1)}{m.group(2).lower()}'
    m = re.match(r'^(final|semi[- ]finals?|quarter[- ]finals?|round of \d+|group stage|league phase|play-?off round|'
                 r'(?:first|second|third|fourth|fifth) (?:qualifying )?round|round \d+|last \d+)\b', v, re.I)
    return m.group(1).lower() if m else None


def facts(box: dict[str, str]) -> tuple[list[dict], list[str]]:
    """The infobox's rows as facts, and the rows not understood (named, never guessed)."""
    out, skipped = [], []
    league = box.get('league')
    if league and box.get('league result'):
        r = _result(box['league result'])
        if r:
            out.append({'kind': 'honour', 'competition': league, 'result': r, 'stage': box['league result'], 'row': 'league'})
        else:
            skipped.append(f'league result: {box["league result"]}')
    for n in range(1, 8):
        comp, res = box.get(f'cup{n}'), box.get(f'cup{n} result')
        if comp and res:
            r = _result(res)
            if r:
                out.append({'kind': 'honour', 'competition': comp, 'result': r, 'stage': res, 'row': f'cup{n}'})
            else:
                skipped.append(f'cup{n}: {comp} — {res}')
    if box.get('manager'):
        out.append({'kind': 'season_book', 'field': 'manager', 'name': box['manager'].split(';')[0].strip()})
    for k, scope in (('league topscorer', 'league'), ('season topscorer', 'all')):
        for one in (box.get(k) or '').split(';'):
            one = one.replace('League:', '').replace('All:', '').strip()
            m = SCORER.match(one)
            if m:
                out.append({'kind': 'season_book', 'field': 'top_scorer', 'scope': scope, 'name': m.group(1).strip(), 'goals': int(m.group(2))})
            elif one:
                skipped.append(f'{k}: {one}')
    for k, which in (('highest attendance', 'highest'), ('lowest attendance', 'lowest'), ('average attendance', 'average')):
        v = box.get(k)
        m = re.match(r'^([\d,]{3,9})\b(.*)$', v or '')
        if m:
            out.append({'kind': 'season_book', 'field': 'attendance', 'which': which, 'count': int(m.group(1).replace(',', '')),
                        'note': clean(m.group(2)).strip(' ()vs.')[:80] or None})
        elif v:
            skipped.append(f'{k}: {v}')
    return out, skipped


# ── into the ledger ────────────────────────────────────────────────────────────────────────────────────────────────

def claims(book: dict, season: str, club: str) -> list[dict]:
    url = 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(book['title'].replace(' ', '_'))
    if book.get('revid'):
        url += f'?oldid={book["revid"]}'
    src = [{'id': f'wikipedia-{re.sub(r"[^a-z0-9]+", "-", book["title"].lower())}', 'title': f'Wikipedia: {book["title"]}', 'url': url}]
    out = []
    for i, f in enumerate(book['facts']):
        key = f.get('competition') or f.get('field')
        cid = f'season-book:{re.sub(r"[^a-z0-9]+", "-", str(key).lower()).strip("-")}-{f.get("scope") or f.get("which") or i}'
        fact = {**{k: v for k, v in f.items() if k != 'row'}, 'season': season, 'club': club}
        out.append({'id': cid, 'type': f['kind'], 'fact': fact, 'sources': src, 'confidence': 2, 'status': 'season-book', 'conflicts': []})
    return out


def attach(ledger: dict, brief: dict, cache: Path, log=print) -> dict:
    """In place. Cached per club and season in the job's cache (one fetch per film, never per retry)."""
    if os.environ.get('STORIES_SEASON_BOOK') == '0' or brief.get('kind') not in (None, 'season', 'match', 'tie'):
        return ledger
    season, club = ledger.get('season') or brief.get('season'), ledger.get('club_name') or brief.get('club_name')
    if not season or not club or not re.match(r'^\d{4}', str(season)):
        return ledger
    ck = Path(cache) / 'season-book' / f'v{VERSION}-{re.sub(r"[^a-z0-9]+", "-", (brief.get("club_id") or club).lower())}-{re.sub(r"[^0-9]+", "-", season)}.json'
    if ck.exists():
        book = read_json(ck)
    else:
        try:
            from .research import _club_names
            names = list(dict.fromkeys([club, *(_club_names(brief.get('club_id') or '') or [])]))
            title = find_article(names, season)
            if not title:
                ledger['season_book'] = {'status': 'no article'}
                log(f'Season book: no Wikipedia season article for {club} {season}')
                return ledger
            raw = fetch(title)
        except Exception as e:  # noqa: BLE001 — never fails the film
            ledger['season_book'] = {'status': f'unreachable ({type(e).__name__})'}
            log(f'Season book: Wikipedia unreachable ({type(e).__name__}) — the film goes on from the archive')
            return ledger
        box = infobox(raw['wikitext'])
        fs, skipped = facts(box)
        if os.environ.get('STORIES_SEASON_BOOK_DEBUG') == '1':
            print('SEASON BOOK infobox fields:', json.dumps(box, ensure_ascii=False)[:4000])
            print('SEASON BOOK wikitext head:', raw['wikitext'][:5000])
        book = {'title': raw['title'], 'revid': raw['revid'], 'lead': raw['lead'][:2400], 'facts': fs, 'skipped': skipped}
        ck.parent.mkdir(parents=True, exist_ok=True)
        write_json(ck, book)
    cl = claims(book, season, club)
    have = {c['id'] for c in ledger.get('claims') or []}
    ledger.setdefault('claims', []).extend(c for c in cl if c['id'] not in have)
    ledger['season_book'] = {'status': 'ok', 'title': book['title'], 'revid': book.get('revid'), 'lead': book.get('lead') or '',
                             'skipped': book.get('skipped') or [], 'claims': [c['id'] for c in cl],
                             'note': 'The lead is orientation: never print a number or name from it that no claim carries.'}
    won = [f['competition'] for f in book['facts'] if f['kind'] == 'honour' and f['result'] == 'won']
    log(f'Season book: {book["title"]} — {len(cl)} claims' + (f'; won: {", ".join(won)}' if won else ''))
    return ledger

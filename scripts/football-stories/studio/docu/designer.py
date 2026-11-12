"""The graphic designer in DOCU (owner, 12.11.2026: the hand-written films are "the graphic minimum — and I want even more").

The automatic adapter knew sixteen devices; the films written by hand (docu/films/*.py) also use the city split, the
league table, the chalk board, the verdict split, stamps, the typed rule card, the press cutting and cut-out figures.
This module decides when a beat's DATA earns one of those — and only then. Every function here returns the device's
dict for build.Film (the same implementations the hand-written films call) or None, and None always means "draw it the
way the adapter always did".

Facts carry a source (rules 2, 11): a device prints a name, a number or a place only when it is in the film's research
block — a claim of the ledger, the place book the maps already use (dossiers/places.json), or the beat's own words, which
the script check passed. `sourced()` is that rule as code and every device goes through it; a device that fails it is
dropped, never trimmed.
"""
from __future__ import annotations

import html
import json
import re

from ..script import RESULT_CUES, _fold, numbers_in_text

# The only words a device may print that come from no claim: its own labels. Fixed here, never composed from a model's text.
LABELS = ('WON', 'OUT', 'CHAMPIONS', 'WON THE NIGHT', 'LOST THE NIGHT', 'DREW ON THE NIGHT', 'WENT THROUGH', 'WENT OUT',
          'WON ON PENALTIES', 'LOST ON PENALTIES', 'THE RULE', 'FREE KICK', 'CORNER', 'HOME', 'AWAY', 'THE HEADLINE')
SHOWN = ('text', 'name', 'small', 'title', 'label', 'mid', 'us', 'them', 'us_line', 'them_line', 'translation', 'line_label')
RULE_TALK = re.compile(r'\b(rule|away goals?|golden goal|silver goal|on aggregate|replay|points for a win|two legs|two-legged|'
                       r'extra time|promotion|relegat\w+|seeded|seeding|coefficient)\b', re.I)
SET_PIECE = (('freekick', re.compile(r'free[ -]?kick', re.I)), ('corner', re.compile(r'\bcorner\b', re.I)))
PRESS_ART = re.compile(r'press|newspaper|cutting|clipping|headline|front[ -]page', re.I)
TIE_TOLD = re.compile(r'\b(through|knocked out|went out|go(es|ing)? out|eliminat\w+|qualif\w+|advanc\w+)\b', re.I)
PENS_TOLD = re.compile(r'(penalt\w+|shoot-?out)', re.I)
MAX_TABLE = 16   # the rows the table device has room for (build.Film.table: 46 px a row)


def words_of(v) -> set[str]:
    return {w for w in _fold(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)).split() if len(w) > 2 or w.isdigit()}


def shown(dev: dict) -> list[str]:
    """Every string a device puts on screen."""
    out = [str(dev[k]) for k in SHOWN if isinstance(dev.get(k), (str, int))]
    out += [str(r) for r in dev.get('rows') or [] if isinstance(r, str)]
    for side in ('a', 'b'):
        if isinstance(dev.get(side), dict):
            out += [str(dev[side].get(k) or '') for k in ('name', 'small')]
    if dev.get('minute') is not None:
        out.append(str(dev['minute']))
    return [re.sub(r'<br>', ' ', x) for x in out if x]


class Designer:
    def __init__(self, ad):
        self.ad = ad
        from ..maps import PLACES
        led = ad.led
        self.vocab = words_of([c.get('fact') for c in led.get('claims') or []]) | words_of(ad.club) | words_of(' '.join(LABELS))
        # a city is on record when the place book ties it to a club this ledger names
        clubs = {ad.club} | {str((c.get('fact') or {}).get(k) or '') for c in led.get('claims') or [] for k in ('opponent', 'home', 'away')}
        self.vocab |= words_of(' '.join(PLACES['clubs'][c] for c in clubs if c in PLACES['clubs']))
        self.numbers = set()
        for c in led.get('claims') or []:
            self.numbers |= {int(x) for x in re.findall(r'\d+', json.dumps(c.get('fact'), ensure_ascii=False))}

    # ── the rule ────────────────────────────────────────────────────────────────────────────────────────────────────
    def sourced(self, dev: dict | None, s: dict) -> dict | None:
        """The device, or None when it would print a word or a number the research block and the beat's own checked words
        do not hold."""
        if not dev:
            return None
        own = words_of(s.get('visual') or {}) | words_of(s.get('narration') or '')
        own_n = numbers_in_text(json.dumps(s.get('visual') or {}) + ' ' + (s.get('narration') or ''))
        for text in shown(dev):
            for w in words_of(text):
                if w.isdigit():
                    if int(w) not in self.numbers and int(w) not in own_n:
                        return None
                elif w not in self.vocab and w not in own:
                    return None
        return dev

    def match_row(self, cid) -> dict:
        return next((m for m in (self.ad.led.get('story') or {}).get('matches') or [] if m.get('id') == cid), {})

    # ── the devices ─────────────────────────────────────────────────────────────────────────────────────────────────
    def cities(self, s: dict, facts: list[dict]) -> dict | None:
        """A journey: the club's city | the city the match was played in, the bolt between them. Only when the place book
        knows both and they differ — a home match, or a ground nobody has placed, keeps the picture and its lower third."""
        from ..maps import city_of, place_of
        home = city_of(self.ad.club)
        for f in facts:
            if f.get('kind') != 'match' or f.get('side') != 'away':
                continue
            placed = isinstance(f.get('venue'), dict) and f['venue'].get('name') or isinstance(f.get('venue'), str) and f['venue']
            if not placed and re.search(r'final', str(f.get('stage') or ''), re.I):
                continue   # a final or a semi-final with no ground on record may have been played anywhere: no city is claimed
            there = place_of(f, self.ad.club)
            if not home or not there or there[0] == home[0]:
                continue
            return self.sourced({'kind': 'cities', 'mid': (f.get('competition') or '').upper() or None, 'mid_at': 1.3,
                                 'a': {'name': home[0].upper(), 'small': self.ad.club.upper(), 'crest': self.ad.crest_of(self.ad.club)},
                                 'b': {'name': there[0].upper(), 'small': (f.get('opponent') or '').upper(),
                                       'crest': self.ad.crest_of(f.get('opponent')), 'bg': '#2B2A33'}}, s)
        return None

    def table(self, s: dict, f: dict) -> dict | None:
        """The league table as the record has it: every row in its place, the club's own lit. No line is drawn across it —
        where the drop or the title sat is a claim the table rows do not make."""
        rows = sorted((r for r in f.get('rows') or [] if isinstance(r, dict)), key=lambda r: r.get('pos') or r.get('position') or 0)
        names = [str(r.get('club') or r.get('team') or '') for r in rows]
        if not 4 <= len(rows) <= MAX_TABLE or not all(names) or [r.get('pos') or r.get('position') for r in rows] != list(range(1, len(rows) + 1)):
            return None
        hl = next((i for i, n in enumerate(names) if n == self.ad.club), None)
        return self.sourced({'kind': 'table', 'rows': names, 'cut': False, 'highlight': hl}, s)

    def chalk(self, s: dict, f: dict, who: dict, ids: list[str]) -> dict | None:
        """The move on the chalk board — only for a goal the record DESCRIBES as a free kick or a corner (a goal-detail
        claim of this match that names this scorer or is the match's only one). The ledger holds no line-ups, so the
        board never draws one."""
        cid = next((i for i in ids if (self.ad.by.get(i) or {}).get('fact') is f), None)
        det = [c['fact'] for c in self.ad.led.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'goal-detail' and c['fact'].get('match_id') == cid]
        name = str(who.get('name') or '')
        mine = [d for d in det if name and _fold(str(d.get('scorer') or '')) and _fold(str(d.get('scorer'))).strip() in _fold(name)] or (det if len(det) == 1 else [])
        if not mine or not name:
            return None
        blob = ' '.join(str(mine[0].get(k) or '') for k in ('title', 'description')) + ' ' + json.dumps(mine[0].get('documented_contacts') or [])
        play = next((p for p, rx in SET_PIECE if rx.search(blob)), None)
        if not play:
            return None
        ours = any(isinstance(x, dict) and x.get('name') == name for x in f.get('scorers') or [])
        return self.sourced({'kind': 'chalk', 'play': play, 'attack': 'us' if ours else 'them', 'go': -1.2,
                             **({'minute': who['minute']} if isinstance(who.get('minute'), int) else {}),
                             'label': f'{name.upper()} · {"FREE KICK" if play == "freekick" else "CORNER"}'}, s)

    def verdict(self, s: dict, f: dict, cid) -> dict | None:
        """The split screen for a result that is two results: a second leg (the night | the tie) or a shoot-out. Shown
        only when this beat's own narration tells it — the editor never shows a fact the narrator has not reached."""
        text = s.get('narration') or ''
        row = self.match_row(cid)
        pens = next((c['fact'] for c in self.ad.led.get('claims') or [] if (c.get('fact') or {}).get('kind') == 'penalties'
                     and c['fact'].get('date') == f.get('date') and c['fact'].get('winner')), None)
        if pens and PENS_TOLD.search(text) and RESULT_CUES.search(text):
            won = pens['winner'] == self.ad.club
            lines = ('WON ON PENALTIES', 'LOST ON PENALTIES') if won else ('LOST ON PENALTIES', 'WON ON PENALTIES')
        elif isinstance(row.get('through'), bool) and TIE_TOLD.search(text):
            night = {'win': 'WON THE NIGHT', 'loss': 'LOST THE NIGHT', 'draw': 'DREW ON THE NIGHT'}.get(f.get('outcome'))
            paradox = night and (f.get('outcome') == 'win') != row['through']
            lines = (night if paradox else 'WENT THROUGH' if row['through'] else 'WENT OUT', 'WENT OUT' if row['through'] else 'WENT THROUGH')
        else:
            return None
        opp = f.get('opponent') or ''
        dev = self.sourced({'kind': 'verdict', 'us': self.ad.club, 'them': opp, 'us_line': lines[0], 'them_line': lines[1],
                            'us_crest': self.ad.crest_of(self.ad.club), 'them_crest': self.ad.crest_of(opp), 'them_at': 1.2}, s)
        return {**dev, 'us': html.escape(dev['us']), 'them': html.escape(dev['them'])} if dev else None   # the device prints the names as markup

    def stamp(self, s: dict, f: dict, cid) -> dict | None:
        """One stamp over the picture when the record decides something and the line says a result: the title, a final won,
        a tie lost."""
        if not RESULT_CUES.search(s.get('narration') or ''):
            return None
        row = self.match_row(cid)
        final = 'final' in str(f.get('stage') or '').lower() and not re.search(r'semi|quarter', str(f.get('stage') or ''), re.I)
        text = ('CHAMPIONS' if f.get('title_decided') and f.get('outcome') == 'win' else
                'WON' if final and f.get('outcome') == 'win' else 'OUT' if row.get('through') is False else None)
        return {'kind': 'stamp', 'text': text, 'side': 'us', 'x': 200, 'y': 640, 'size': 200} if text else None

    def rule(self, s: dict) -> dict | None:
        """A competition rule typed on its own card — when the fact card the writer wrote IS a rule."""
        v = s['visual']
        head, text = str(v.get('heading') or ''), str(v.get('text') or '')
        if not text or not RULE_TALK.search(f'{head} {text}'):
            return None
        return self.sourced({'kind': 'rule', 'small': 'THE RULE', 'title': head.upper() or 'THE RULE', 'text': text}, s)

    def press(self, s: dict, src: str | None, key: str | None) -> dict | None:
        """The cutting itself, the camera on its headline — only when the press claim is sourced and the beat's picture is
        the cutting (its key or its index entry says so). A headline with no page stays a typed card."""
        from ..paper import piece_meta
        v = s['visual']
        c = self.ad.by.get(v.get('claim')) or {}
        f = c.get('fact') or {}
        meta = piece_meta(key) if key else {}
        about = f'{key or ""} {meta.get("description") or ""} {" ".join(meta.get("tags") or [])}'
        if f.get('kind') != 'press' or not c.get('sources') or not src or not PRESS_ART.search(about) or not (f.get('headline') or '').strip():
            return None
        return self.sourced({'kind': 'press', 'src': src, 'small': (f.get('outlet') or '').upper(), 'translation': f['headline']}, s)

    def cutout(self, s: dict) -> dict | None:
        """A cut-out the writer asked for by key (`figure: cut:<set>/<slug>`) rises in front of the picture — when the
        owner's cut-out exists. No figure is ever chosen here for a named person."""
        from ..paper import cut_path
        p = cut_path(s['visual'].get('figure'))
        src = self.ad.asset(p, 'cut') if p else None
        return {'kind': 'cutout', 'src': src, 'x': 1180, 'h': 940, 'y': 140, 'dt': 0.5} if src else None

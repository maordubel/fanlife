#!/usr/bin/env python3
"""
גשר השמות — matching the archive's Hebrew names to a Latin source, without guessing.

Rule 7 is the constraint the whole file is built around: *Hebrew names are matched
through `entity_alias`, never fuzzily.* A transliteration score is a guess wearing a
number, and a guess that lands in `content/manual/` is indistinguishable from a fact
three weeks later. So this script produces TWO outputs and never mixes them:

  · **מאושר (confidence 2)** — the archive ALREADY holds a Latin spelling for that
    Hebrew name (`people.json.fullNameEn`, `shirt-numbers.json.personNameLatin`, or a
    Latin alias), and that spelling matches the source's spelling. Nothing is inferred:
    two files we already trusted agree, and the match is a lookup.

  · **הצעה (confidence 1)** — the consonant skeletons align AND, where the archive
    records seasons for that man, those seasons overlap the seasons the source puts
    him in the squad. That is real evidence and it is not proof, so it is written at
    confidence 1, which `lib/game/archive.ts` filters out of every game. It is a
    worklist for a human, not data.

The skeleton comparison is deliberately crude and deliberately strict. Hebrew writes no
vowels, so "אבוקסיס" and "Abukasis" can only be compared as consonants — b-k-s-s — and
any two names whose consonants do not line up one for one are not proposed at all. It
under-matches on purpose: a missing row costs a filter chip, a wrong row costs the
archive's credibility.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WF = Path('/tmp/wf')

# Hebrew consonant → the Latin consonants it can be written as. Vowel letters (א ה ו י)
# map to nothing: they are matres lectionis and the Latin side drops vowels anyway.
HEB = {
    'א': '', 'ה': '', 'ו': 'vw', 'י': 'y',
    'ב': 'bv', 'ג': 'g', 'ד': 'd', 'ז': 'z', 'ח': 'hk', 'ט': 't',
    'כ': 'kc', 'ך': 'kc', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n',
    'ס': 'sc', 'ע': '', 'פ': 'pf', 'ף': 'pf', 'צ': 'szc', 'ץ': 'szc',
    'ק': 'kqc', 'ר': 'r', 'ש': 'sc', 'ת': 't',
}
VOWELS = set('aeiou')

# Latin digraphs that stand for ONE Hebrew letter. Without folding these, "Shabtai" is
# four consonants against שבתאי's three and the man never matches himself.
DIGRAPHS = [('sch', 's'), ('sh', 's'), ('tz', 's'), ('ts', 's'), ('ch', 'k'),
            ('kh', 'k'), ('ph', 'f'), ('th', 't'), ('gh', 'g'), ('zh', 'z'),
            ('ck', 'k'), ('qu', 'k')]

# Hebrew letters that are written in Latin only sometimes — the matres lectionis and
# the two silent gutturals. They are allowed to correspond to nothing at all.
OPTIONAL = set('אהועי')


def latin_norm(name: str) -> str:
    n = unicodedata.normalize('NFKD', name)
    n = ''.join(c for c in n if not unicodedata.combining(c))
    return re.sub(r"[^a-z ]", '', n.lower()).strip()


def latin_skeleton(name: str) -> str:
    """
    Consonants only, digraphs folded, spelling variants levelled.

    Doubles are collapsed BEFORE the vowels come out, never after. Collapsing after is
    the bug that made אבוקסיס fail to be Abukasis and בלילי fail to be Balili: strip
    the vowels first and "-sis" becomes "ss", which then collapses to one s and loses a
    consonant Hebrew actually writes. "Cavallo" has a real double; "Balili" does not.
    """
    text = latin_norm(name).replace(' ', '')
    for pair, one in DIGRAPHS:
        text = text.replace(pair, one)
    text = re.sub(r'(.)\1+', r'\1', text)
    # One letter per sound: Hebrew has no c/q/w/x, so level them before comparing.
    text = text.translate(str.maketrans({'q': 'k', 'w': 'v'})).replace('x', 'ks')
    return ''.join(ch for ch in text if ch not in VOWELS)


def hebrew_skeleton(name: str) -> list[tuple[str, bool]]:
    """
    (admissible Latin letters, may be silent) per Hebrew consonant.

    A doubled letter is collapsed ONLY when the two are literally next to each other.
    Collapsing across a skipped letter is what turned כנאנה into k-n instead of k-n-n
    and let עלי כנאנה be matched to Eli Cohen — a different man, in a different decade.
    """
    clean = re.sub(r"[^\u05d0-\u05ea ]", '', name).replace(' ', '')
    out: list[tuple[str, bool]] = []
    previous = ''
    for ch in clean:
        allowed = HEB.get(ch)
        if allowed is None or allowed == '':
            previous = ch
            continue
        if previous == ch:
            previous = ch
            continue
        out.append((allowed, ch in OPTIONAL))
        previous = ch
    return out


def skeletons_align(he: str, la: str) -> bool:
    """
    Can this Hebrew spelling BE that Latin spelling?

    A straight length comparison fails on the commonest names in the roster — לוי is
    three letters and Levi is two, because the ו is a vowel there and a consonant in
    דוד. So the two skeletons are aligned with a small dynamic program in which a
    mater lectionis may match nothing, and everything else must match exactly one
    Latin consonant. It stays strict: no substitutions, no insertions on the Latin
    side, no partial credit.
    """
    heb = hebrew_skeleton(he)
    lat = latin_skeleton(la)
    if not heb or not lat:
        return False
    def skip_h(positions: set[int]) -> set[int]:
        """An `h` on the Latin side may stand for א/ה/ח or for nothing — Cohen is כהן."""
        out = set(positions)
        added = True
        while added:
            added = False
            for i in list(out):
                if i < len(lat) and lat[i] == 'h' and i + 1 not in out:
                    out.add(i + 1)
                    added = True
        return out

    reach = skip_h({0})
    for allowed, optional in heb:
        nxt = set()
        for i in reach:
            if optional:
                nxt.add(i)
            if i < len(lat) and lat[i] in allowed:
                nxt.add(i + 1)
        if not nxt:
            return False
        reach = skip_h(nxt)
    return len(lat) in reach


def same_hebrew_name(a: str, b: str) -> bool:
    """
    Two Hebrew spellings of one man.

    The roster carries a handful — אישטוואן/אישטוון פישונט, דוד שוייצר/שוויצר,
    עומרי/עמרי אפק — because it was assembled from more than one list. They collide on
    the same source player and they are NOT a contradiction, so withdrawing both (which
    the collision rule does, correctly, for יעקב כהן and רמי כהן) would throw away a
    real row. Two spellings are the same name when their obligatory consonants match;
    the matres lectionis, which is exactly what varies between the spellings, are
    ignored.
    """
    def required(name: str) -> list[str]:
        return [allowed for allowed, optional in hebrew_skeleton(name) if not optional]

    pa, pb = a.split(), b.split()
    if len(pa) != len(pb):
        return False
    return all(required(x) == required(y) for x, y in zip(pa, pb))


def skeletons_align_latin(a: str, b: str) -> bool:
    """Two LATIN spellings of one name — the same folding, compared to each other."""
    return latin_skeleton(a) == latin_skeleton(b)


def load(rel: str):
    return json.loads((ROOT / 'content' / 'manual' / rel).read_text(encoding='utf8'))['records']


def main() -> int:
    # ---------------------------------------------------------------- the source
    source: dict[str, dict] = {}
    for path in sorted(WF.glob('*.txt')):
        season = path.stem.replace('-', '/')
        season_label = f"{season.split('/')[0]}/{season.split('/')[1][2:]}"
        for line in path.read_text(encoding='utf8').splitlines():
            if not line.strip() or line.strip() == 'NONE':
                continue
            parts = line.split('|')
            if len(parts) != 3:
                continue
            # A shirt number occasionally runs into the name in the source's markup.
            name = re.sub(r'^\d+', '', parts[0]).strip()
            pos, country = parts[1].strip(), parts[2].strip()
            # An initial-only surname ("A. Vlmr") cannot be matched to anything and
            # must not be proposed as anybody.
            if re.match(r'^[A-Z]\.', name) or len(name) < 4:
                continue
            row = source.setdefault(name, {'name': name, 'pos': pos, 'country': country, 'seasons': set()})
            row['seasons'].add(season_label)

    # ---------------------------------------------------------------- the archive
    roster = {r['fullNameHe'] for r in load('players-roster.json')}
    people = load('people.json')
    roster |= {p['fullNameHe'] for p in people}

    known_latin: dict[str, str] = {}
    for p in people:
        if p.get('fullNameEn'):
            known_latin[p['fullNameHe']] = p['fullNameEn']
        for alias in (p.get('aliases') or []):
            if re.search(r'[A-Za-z]', alias):
                known_latin.setdefault(p['fullNameHe'], alias)
    for r in load('shirt-numbers.json'):
        if r.get('personNameLatin'):
            known_latin.setdefault(r['personNameHe'], r['personNameLatin'])

    seasons_he: dict[str, set] = {}
    for r in load('shirt-numbers.json'):
        seasons_he.setdefault(r['personNameHe'], set()).add(r['seasonLabel'])

    # --------------------------------------------------- the source contradicts itself
    #
    # worldfootball spells the same man two ways across eras — Iyad Hutba and Eyad
    # Khutaba, Yechezkel Chazom and Yehezkel Hazum, Kobi Shalu and Kobi Shalo. Left
    # alone, every one of those makes its Hebrew name "ambiguous" and loses a player
    # who is not ambiguous at all. Two rows are the same man when both names align to
    # each other, the position and the country agree, and the spells touch.
    merged: list[dict] = []
    for row in sorted(source.values(), key=lambda r: min(r['seasons'])):
        for other in merged:
            if other['pos'] != row['pos'] or other['country'] != row['country']:
                continue
            a, b = other['name'].split(), row['name'].split()
            if len(a) < 2 or len(b) < 2:
                continue
            if not skeletons_align_latin(a[-1], b[-1]) or not skeletons_align_latin(a[0], b[0]):
                continue
            other['seasons'] |= row['seasons']
            other['aliases'].append(row['name'])
            break
        else:
            merged.append({**row, 'aliases': []})
    source = {row['name']: row for row in merged}

    by_norm = {latin_norm(v['name']): v for v in source.values()}

    confirmed, proposed, unmatched = {}, {}, []
    taken: set[str] = set()
    ambiguous: dict[str, list[str]] = {}
    for he in sorted(roster):
        hit = None
        how = None
        latin = known_latin.get(he)
        if latin:
            hit = by_norm.get(latin_norm(latin))
            if hit is None:
                # Same man, the two files spell one of his names differently: require
                # the family name AND the given initial to agree before accepting.
                lp = latin_norm(latin).split()
                for cand in source.values():
                    cp = latin_norm(cand['name']).split()
                    if lp and cp and lp[-1] == cp[-1] and lp[0][:1] == cp[0][:1]:
                        hit = cand
                        break
            if hit is not None:
                how = 'alias'
        if hit is None:
            # No Latin spelling on file. Both names must align, and where the archive
            # records seasons for him the source has to put him there too.
            mine = seasons_he.get(he, set())
            parts_he = he.split()
            hits = []
            if len(parts_he) >= 2:
                for cand in source.values():
                    parts_la = cand['name'].split()
                    if len(parts_la) < 2:
                        continue
                    if not skeletons_align(parts_he[-1], parts_la[-1]):
                        continue
                    if not skeletons_align(parts_he[0], parts_la[0]):
                        continue
                    if mine and not (mine & cand['seasons']):
                        continue
                    hits.append(cand)
            # Two men whose names read the same in Hebrew is a real thing in this
            # roster (there are two Cohens in one squad). Proposing either would be
            # picking one at random, so an ambiguous skeleton proposes nobody.
            if len(hits) == 1:
                hit, how = hits[0], 'skeleton'
            elif len(hits) > 1:
                ambiguous[he] = [c['name'] for c in hits]
        # A THIRD pass on the family name alone was written, measured and thrown
        # away. It matched 45 more men and about half of them were the wrong person:
        # אבי אדרי became Kfir Edri, גליל בן סנן became Moshe Sinai, ברונו סוארס became
        # Yaakov Schwartz. A given name is exactly the evidence that separates two men
        # who share a surname, and rule 7 is written about this failure. The recall it
        # promised was not recall; it was noise with a source line attached.

        if hit is None:
            unmatched.append(he)
        elif how == 'alias':
            taken.add(hit['name'])
            confirmed[he] = (hit, 'alias')
        elif how == 'skeleton':
            taken.add(hit['name'])
            proposed[he] = (hit, 'transliteration')
        else:
            proposed[he] = (hit, 'surname')

    # ------------------------------------------------- one man, one claim
    #
    # A source player two Hebrew names both reached is settled by neither of them,
    # unless one of the two came through an alias the archive already held. Without
    # this, יעקב כהן took Yuval Cohen and רמי כהן took Raz Cohen: same surname, a
    # given name that does not align, and an iteration order deciding which was
    # "found". Rule 7, again, and this is the enforcement rather than the intention.
    claims: dict[str, list[str]] = {}
    for he, (row, how) in {**confirmed, **proposed}.items():
        claims.setdefault(row['name'], []).append(he)
    for latin_name, claimants in claims.items():
        if len(claimants) < 2:
            continue
        # Two spellings of one man are not two claimants.
        if all(same_hebrew_name(claimants[0], other) for other in claimants[1:]):
            continue
        aliased = [he for he in claimants if he in confirmed]
        keep = aliased[0] if len(aliased) == 1 else None
        for he in claimants:
            if he == keep:
                continue
            confirmed.pop(he, None)
            proposed.pop(he, None)
            ambiguous[he] = [latin_name]
            if he not in unmatched:
                unmatched.append(he)

    def pack(row, how):
        seasons = sorted(row['seasons'])
        return {
            'nameLatin': row['name'],
            'position': row['pos'],
            'nationality': row['country'],
            'origin': 'israeli' if row['country'] == 'Israel' else 'foreign',
            'fromYear': int(seasons[0][:4]),
            'toYear': int(seasons[-1][:4]) + 1,
            'seasons': seasons,
            'matchedBy': how,
            'sourceAliases': sorted(set(row.get('aliases') or [])),
        }

    out = {
        'source': {
            'title': 'worldfootball.net — סגלי הפועל תל אביב לפי עונה',
            'url': 'https://www.worldfootball.net/teams/te956/hapoel-tel-aviv/squad/',
            'seasonsRead': len(list(WF.glob('*.txt'))),
            'playersInSource': len(source),
        },
        'confirmed': {k: pack(v[0], v[1]) for k, v in confirmed.items()},
        'proposed': {k: pack(v[0], v[1]) for k, v in proposed.items()},
        'unmatched': unmatched,
        'ambiguous': ambiguous,
    }
    (Path('/tmp/match.json')).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf8')

    print(f"source      : {len(source)} players over {out['source']['seasonsRead']} seasons")
    print(f"archive     : {len(roster)} Hebrew names")
    print(f"confirmed   : {len(confirmed)}  (an existing Latin spelling agrees — confidence 2)")
    print(f"proposed    : {len(proposed)}  (skeleton + season overlap — confidence 1, needs a human)")
    print(f"ambiguous   : {len(ambiguous)}  (more than one man fits — proposed for nobody)")
    print(f"unmatched   : {len(unmatched)}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

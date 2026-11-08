"""The archive's own names, said the way their own people say them (owner, 8.11.2026: "much more accurate — every
club, player and city said right").

The hand lexicon (kit/pronounce/lexicon.json) holds the names a person checked. Everything else the narrator might meet
— every player, every opponent and every ground in the club packs — is written here, ONCE, by rules rather than by the
English G2P guessing: a South Slavic name goes through espeak's Croatian, a German one through German, a Brazilian one
through Portuguese, and a Greek one (written in Latin letters in the archive) through a Greek reading with the stress the
name's own ending puts on it (-ópoulos, -ákis, -ídis, -íou …). The result is anglicised the way a British commentator
would say it — no rolled r; the Greek χ kept as x (owner, 8.11.2026: "exact") — and kept to the sounds the voice knows (pronounce.VOCAB).

    python3 -m studio.namebook            # writes kit/pronounce/archive.json from content/compiled/*.json

A name the rules cannot place is left to the English G2P and listed in the report, never guessed. The hand lexicon
always wins over this file.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from .common import ROOT
from . import pronounce

OUT = Path(__file__).resolve().parent / 'kit' / 'pronounce' / 'archive.json'
COMPILED = ROOT / 'content' / 'compiled'
CLUB_LANG = {'olympiacos': 'el', 'panathinaikos': 'el', 'aek-athens': 'el', 'zrinjski-mostar': 'hr', 'st-pauli': 'de'}

# ── Greek, written in Latin letters ───────────────────────────────────────────────────────────────────────────────
GREEK_FIRST = {  # the first names an archive writes most, with their stress (IPA, anglicised)
    'giorgos': 'ˈjɒrɡɒs', 'georgios': 'ˈjɒrjɒs', 'dimitris': 'diˈmitris', 'dimitrios': 'diˈmitriɒs', 'nikos': 'ˈnikɒs',
    'nikolaos': 'niˈkɒlaɒs', 'kostas': 'ˈkɒstas', 'konstantinos': 'kɒnstanˈdinɒs', 'giannis': 'ˈjanis', 'ioannis': 'iɒˈanis',
    'vasilis': 'vaˈsilis', 'vasileios': 'vaˈsiliɒs', 'christos': 'ˈxristɒs', 'panagiotis': 'panaˈjɒtis', 'stelios': 'ˈstɛliɒs',
    'stylianos': 'stiliaˈnɒs', 'thanasis': 'θaˈnasis', 'athanasios': 'aθaˈnasiɒs', 'michalis': 'miˈxalis', 'sotiris': 'sɒˈtiris',
    'alexandros': 'alɛˈksandrɒs', 'antonis': 'anˈdɒnis', 'manolis': 'maˈnɒlis', 'petros': 'ˈpɛtrɒs', 'pavlos': 'ˈpavlɒs',
    'spyros': 'ˈspirɒs', 'stavros': 'ˈstavrɒs', 'theodoros': 'θɛˈɒðɒrɒs', 'thodoris': 'θɒˈðɒris', 'lefteris': 'lɛfˈtɛris',
    'kyriakos': 'kiriˈakɒs', 'angelos': 'ˈanjɛlɒs', 'apostolos': 'aˈpɒstɒlɒs', 'grigoris': 'ɡriˈɡɒris', 'ilias': 'iˈlias',
    'takis': 'ˈtakis', 'mimis': 'ˈmimis', 'sakis': 'ˈsakis', 'babis': 'ˈbabis', 'lakis': 'ˈlakis', 'tasos': 'ˈtasɒs',
    'zisis': 'ˈzisis', 'fotis': 'ˈfɒtis', 'charis': 'ˈxaris', 'evangelos': 'ɛˈvanjɛlɒs', 'vangelis': 'vanˈjɛlis',
    'anastasios': 'anaˈstasiɒs', 'traianos': 'traiaˈnɒs', 'savvas': 'ˈsavas', 'andreas': 'anˈdrɛas', 'marinos': 'maˈrinɒs',
}
GREEK_END = re.compile(r'(opoulos|poulos|akis|akos|idis|idou|iadis|ides|atos|itos|ou|os|is|as|es|eas|ys)$')
GREEK_END_FLAT = re.compile(r'_?(opoulos|poulos|akis|akos|idis|idou|iadis|ides|atos|itos|ou|os|is|as|es|eas|ys)$')
NOT_GREEK = re.compile(r'[cqw]|ll$|tt|ck|sch|ee|oo|(?<![sz])z$')
G_PAIRS = [('ou', 'u'), ('ai', 'ɛ'), ('ei', 'i'), ('oi', 'i'), ('ui', 'i'), ('th', 'θ'), ('ch', 'x'), ('kh', 'x'),
           ('ph', 'f'), ('ps', 'ps'), ('ks', 'ks'), ('gk', 'ŋɡ'), ('gg', 'ŋɡ'), ('mp', 'mb'), ('nt', 'nd'), ('tz', 'dz'),
           ('ts', 'ts'), ('ss', 's'), ('ll', 'l'), ('nn', 'n'), ('mm', 'm'), ('rr', 'r'), ('pp', 'p'), ('tt', 't'),
           ('a', 'a'), ('e', 'ɛ'), ('i', 'i'), ('o', 'ɒ'), ('u', 'u'), ('y', 'i'), ('x', 'ks'), ('h', 'x'), ('g', 'ɡ'),
           ('b', 'b'), ('d', 'd'), ('f', 'f'), ('k', 'k'), ('l', 'l'), ('m', 'm'), ('n', 'n'), ('p', 'p'), ('r', 'r'),
           ('s', 's'), ('t', 't'), ('v', 'v'), ('z', 'z'), ('j', 'j')]
G_VOWEL = set('aɛiɒu')


def _strip(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))


def greek_word(w: str) -> str | None:
    """One Greek name in Latin letters → anglicised IPA with its stress, or None if it does not read as Greek."""
    low = _strip(w).lower()
    if low in GREEK_FIRST:
        return GREEK_FIRST[low]
    if not re.fullmatch(r'[a-z]{3,}', low) or not GREEK_END.search(low) or NOT_GREEK.search(low):
        return None
    low = re.sub(r'([ao])i(dis|des|dou)$', r'\1_i\2', low)  # Nikolaidis = Ni-ko-la-Í-dis: the i is its own vowel
    units, i = [], 0
    while i < len(low):
        if low[i] == '_':
            i += 1
            continue
        # g before e, i or y is a y-sound; "gia"/"gio" drop the i
        if low[i] == 'g' and i + 1 < len(low) and low[i + 1] in 'eiy':
            nxt = low[i + 2] if i + 2 < len(low) else ''
            units.append('j')
            i += 2 if (low[i + 1] in 'iy' and nxt in 'aeou') else 1
            continue
        for a, b in G_PAIRS:
            if low.startswith(a, i):
                if a in ('mp', 'nt', 'gk') and i == 0:
                    b = b[-1]  # Mp- = B-, Nt- = D-, Gk- = G- at the start
                units.append(b)
                i += len(a)
                break
        else:
            i += 1
    vowels = [k for k, u in enumerate(units) if u and u[0] in G_VOWEL]
    if len(vowels) < 2:
        return None
    end = GREEK_END_FLAT.search(low).group(1)
    n = len(vowels)
    target = {'opoulos': n - 2, 'poulos': n - 2, 'akis': n - 2, 'akos': n - 2, 'idis': n - 2, 'iadis': n - 2, 'ides': n - 2,
              'idou': n - 1, 'ou': n - 1}.get(end, n - 2)
    target = max(0, min(n - 1, target))
    k = vowels[target]
    # the stress mark goes before the syllable: before the consonant that opens it, if any
    at = k - 1 if k > 0 and units[k - 1] and units[k - 1][0] not in G_VOWEL else k
    return ''.join(units[:at]) + 'ˈ' + ''.join(units[at:])


# ── other languages: espeak in the name's own language ─────────────────────────────────────────────────────────────
def lang_of(name: str, club_lang: str | None) -> str | None:
    s = name
    low = s.lower()
    flat = _strip(low)
    if re.search(r'[čćšžđ]', low) or re.search(r'(vić|ić|vic|ovic|evic)$', low.split()[-1] if low.split() else ''):
        return 'hr'
    if re.search(r'[ãõ]|nho\b|nha\b|\bão|ão\b|lh', low):
        return 'pt-br'
    if re.search(r'[ıışğ]', low):
        return 'tr'
    if re.search(r'[łśżźń]', low):
        return 'pl'
    if re.search(r'[őű]', low):
        return 'hu'
    if re.search(r'[øæå]', low):
        return 'da'
    if re.search(r'[řěů]', low):
        return 'cs'
    if re.search(r'[șțăâ]', low):
        return 'ro'
    if re.search(r'ñ|\b\w+ez\b', low) and not re.search(r'[äöüß]', low):
        return 'es-419'  # a Latin American s, not Castilian th: what most of football's Spanish names sound like
    if re.search(r'[äöüß]|sch|(mann|berg|burg|stein|meier|meyer)\b', low) and club_lang == 'de':
        return 'de'
    if re.search(r'[èêëî]|eau\b|ault\b|oux\b', low):
        return 'fr'
    if re.search(r'(ini|etti|ello|ucci|ozzi|elli|iero)\b', flat):
        return 'it'
    if re.search(r'\bvan (der |den )?|ij(?=[^aeiou]|$)', low):
        return 'nl'
    return None


_BACKENDS: dict = {}


def espeak_ipa(text: str, lang: str) -> str | None:
    try:
        pronounce._espeak_ready()
        from phonemizer.backend import EspeakBackend
        if lang not in _BACKENDS:
            _BACKENDS[lang] = EspeakBackend(lang, with_stress=True, preserve_punctuation=False)
        out = _BACKENDS[lang].phonemize([text])[0].strip()
        return out or None
    except Exception:  # noqa: BLE001 — no espeak, or not that language: the English G2P reads it
        return None


# a British commentator's English sounds for what the voice would mumble (VOCAB has them, the voice barely trained on them)
ANGLICISE = [('dʑ', 'ʤ'), ('tɕ', 'ʧ'), ('ɕ', 'ʃ'), ('ʑ', 'ʒ'), ('d͡ʒ', 'ʤ'), ('t͡ʃ', 'ʧ'), ('t͡s', 'ts'),
             ('χ', 'x'), ('ɣ', 'ɡ'), ('β', 'b'), ('ʎ', 'lj'), ('ɲ', 'nj'), ('ʏ', 'ʊ'), ('y', 'ʊ'), ('ø', 'ɜː'), ('œ', 'ɜː'),
             ('ɐ', 'ə'), ('ʁ', 'r'), ('ɾ', 'r'), ('ɫ', 'l'), ('ç', 'ʃ'), ('ɟ', 'ʤ'), ('c', 'ʧ'), ('ɨ', 'ɪ'), ('ɯ', 'u'),
             ('ʉ', 'u'), ('ɞ', 'ɜː'), ('ɘ', 'ə'), ('ɵ', 'ɜː'), ('ɤ', 'ʌ'), ('ʋ', 'v'), ('ɦ', 'h'), ('ɬ', 'l'), ('ɱ', 'm'),
             ('ʔ', ''), ('̃', ''), ('ʰ', ''), ('ʲ', 'j'), ('ˑ', ''), ('ʊ̯', 'ʊ'), ('ɪ̯', 'ɪ'), ('̯', '')]
ALLOWED = pronounce.VOCAB | set('ˈˌːr ')


def anglicise(ipa: str) -> str:
    s = ipa.replace('æ', 'a')  # espeak's Croatian and Dutch a, not the English "cat"
    for a, b in ANGLICISE:
        s = s.replace(a, b)
    s = re.sub(r'ɜ\b', 'ə', s)  # German final -er
    return ''.join(c for c in s if c in ALLOWED).strip()


def say(name: str, club_lang: str | None) -> tuple[str, str] | None:
    """(ipa, how) for one name, or None when the rules cannot place it."""
    words = name.split()
    if club_lang == 'el' and words:
        parts = [greek_word(w) for w in words]
        if parts[-1] is not None and all(p is not None for p in parts):
            return ' '.join(parts), 'greek'
    lang = lang_of(name, club_lang)
    if lang:
        text = re.sub(r'(?<=[a-z])ic\b', 'ić', name) if lang == 'hr' else name  # Milojevic is written without its ć
        ipa = espeak_ipa(text, lang)
        if ipa:
            return anglicise(ipa), lang
    return None


def names_of(pack: dict) -> list[str]:
    d = pack.get('data') or pack
    out: list[str] = []
    for p in d.get('players') or []:
        v = p.get('value') or {}
        out += [v.get('name') or '', *(v.get('aliases') or [])]
    for m in d.get('matches') or []:
        v = m.get('value') or {}
        out += [s.get('name') or '' for s in v.get('scorers') or []]
        out += [x.get('name') if isinstance(x, dict) else str(x) for x in (v.get('lineup') or []) + (v.get('bench') or [])]
    for g in d.get('goals') or []:
        v = g.get('value') or {}
        out.append(v.get('scorer') or v.get('player') or '')
    return [n.strip() for n in out if isinstance(n, str) and 2 < len(n.strip()) < 60 and not re.search(r'\d', n)]


def build(log=print) -> dict:
    hand = set(pronounce.lexicon())
    names: dict[str, str] = {}
    how: dict[str, str] = {}
    left: dict[str, int] = {}
    for f in sorted(COMPILED.glob('*.json')):
        club = f.stem
        club_lang = CLUB_LANG.get(club)
        try:
            pack = json.loads(f.read_text())
        except (OSError, ValueError):
            continue
        for n in sorted(set(names_of(pack))):
            if n in hand or n in names:
                continue
            r = say(n, club_lang)
            if not r:
                left[club] = left.get(club, 0) + 1
                continue
            ipa, h = r
            if pronounce.unknown_symbols(ipa) - {' '}:
                continue
            names[n] = ipa
            how[n] = h
            # the surname alone is how a narrator says him the second time
            sur = n.split()[-1]
            if len(n.split()) > 1 and len(sur) > 3 and sur not in hand and sur not in names:
                names[sur] = ipa.split()[-1]
                how[sur] = h
    counts: dict[str, int] = {}
    for h in how.values():
        counts[h] = counts.get(h, 0) + 1
    log(f'Namebook: {len(names)} names ({", ".join(f"{k} {v}" for k, v in sorted(counts.items()))}); '
        f'left to the English reading: {sum(left.values())}')
    return {'version': 1, 'rule': 'Generated by studio/namebook.py from the club packs. The hand lexicon wins over it.',
            'names': dict(sorted(names.items())), 'how': dict(sorted(how.items())), 'left': left}


def main() -> int:
    OUT.write_text(json.dumps(build(), ensure_ascii=False, indent=0) + '\n', encoding='utf-8')
    print(f'wrote {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

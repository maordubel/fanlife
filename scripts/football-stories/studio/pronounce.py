"""Pronunciation: every name said the way a prepared commentator says it.

Text becomes phonemes in two steps:
  1. the lexicon (kit/pronounce/lexicon.json, plus a film's own overrides) puts each listed name in as IPA;
  2. everything else goes through misaki, the G2P Kokoro was trained on (British lexicon, stress, the voice's own
     diphthong letters). Without misaki the espeak path the voice used before still works, with the names spliced in.
The written text never changes: captions keep 'Mbappé', the voice says /ˌɛmbaˈpeɪ/.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

LEXICON = Path(__file__).resolve().parent / 'kit' / 'pronounce' / 'lexicon.json'

# The symbols Kokoro v1.0 knows (kokoro_onnx Tokenizer.vocab). A phoneme outside it is dropped silently by the
# tokenizer, which turns a name into a mumble — so a lexicon entry that needs one fails the tests instead.
VOCAB = set(' !"(),.:;?AIOQSTWYabcdefhijklmnopqrstuvwxyzæçðøŋœɐɑɒɔɕɖəɚɛɜɟɡɣɤɥɨɪɯɰɲɳɴɸɹɻɽɾʁʂʃʈʊʋʌʎʒʔʝʣʤʥʦʧʨʰʲˈˌː̃βθχᵊᵝᵻ—“”…')
VOWELS = set('aeiouyæɐɑɒɔəɚɛɜɤɨɪɯʊʌœøAIOQWYᵊ')
DIPHTHONGS = (('eɪ', 'A'), ('aɪ', 'I'), ('aʊ', 'W'), ('ɔɪ', 'Y'), ('əʊ', 'Q'), ('oʊ', 'Q'))
IPA_HINT = re.compile(r'[ˈˌːəɪʊɛɒɔæʃʒθðŋɹɡʧʤ]')


def _move_stress(s: str) -> str:
    """'ziˈdan' → 'zidˈan': Kokoro's data marks stress right before the stressed vowel, not before the syllable."""
    out, pending = [], ''
    for ch in s:
        if ch in 'ˈˌ':
            pending = ch
            continue
        if pending and ch in VOWELS:
            out.append(pending)
            pending = ''
        if ch == ' ' and pending:  # a mark with no vowel after it in its word is dropped
            pending = ''
        out.append(ch)
    return ''.join(out)


def to_kokoro(ipa: str, diphthongs: bool = True) -> str:
    """Standard IPA from the lexicon → the voice's phonemes. `diphthongs=False` keeps espeak's two-letter form."""
    s = ipa.strip().strip('/').replace('g', 'ɡ').replace('tʃ', 'ʧ').replace('dʒ', 'ʤ')
    s = s.replace('r', 'ɹ').replace('ɾ', 'ɹ').replace('ʀ', 'ɹ')
    if diphthongs:
        for a, b in DIPHTHONGS:
            s = s.replace(a, b)
    else:
        s = s.replace('ʧ', 'tʃ').replace('ʤ', 'dʒ')
    return _move_stress(s)


def unknown_symbols(ipa: str) -> set[str]:
    return {c for c in to_kokoro(ipa) if c not in VOCAB}


@lru_cache(maxsize=1)
def lexicon() -> dict[str, str]:
    return json.loads(LEXICON.read_text())['names']


@lru_cache(maxsize=1)
def lexicon_version() -> str:
    """Changes whenever an entry changes, so a cached beat is said again with the new pronunciation."""
    import hashlib
    return hashlib.sha256(LEXICON.read_bytes()).hexdigest()[:12]


# IPA → an English respelling ('ziˈdan' → 'zee-DAHN'), for voices that take text only (ElevenLabs, auditions).
_RV = [('aɪ', 'eye'), ('aʊ', 'ow'), ('ɔɪ', 'oy'), ('əʊ', 'oh'), ('oʊ', 'oh'), ('eɪ', 'ay'), ('iː', 'ee'), ('uː', 'oo'),
       ('ɑː', 'ah'), ('ɔː', 'aw'), ('ɜː', 'ur'), ('ɛː', 'air'), ('aː', 'ah'), ('i', 'ee'), ('ɪ', 'i'), ('e', 'eh'),
       ('ɛ', 'eh'), ('æ', 'a'), ('a', 'ah'), ('ɐ', 'uh'), ('ɒ', 'o'), ('ɔ', 'o'), ('o', 'oh'), ('u', 'oo'), ('ʊ', 'u'),
       ('ʌ', 'u'), ('ə', 'uh'), ('y', 'ew'), ('ɨ', 'i')]
_RC = [('tʃ', 'ch'), ('dʒ', 'j'), ('ʧ', 'ch'), ('ʤ', 'j'), ('ts', 'ts'), ('ʃ', 'sh'), ('ʒ', 'zh'), ('θ', 'th'),
       ('ð', 'th'), ('ŋ', 'ng'), ('x', 'kh'), ('j', 'y'), ('ɡ', 'g'), ('ɹ', 'r'), ('ʎ', 'ly'), ('ɲ', 'ny')]


def respell(ipa: str) -> str:
    s = ipa.strip().strip('/').replace('g', 'ɡ').replace('ɾ', 'r')
    out = []
    for word in s.split():
        units, i = [], 0
        while i < len(word):
            for a, b in (('ˈ', 'ˈ'), ('ˌ', ''), *_RV, *_RC):
                if word.startswith(a, i):
                    units.append((b, (a, b) in _RV))
                    i += len(a)
                    break
            else:
                if word[i] != 'ː':
                    units.append((word[i], False))
                i += 1
        # syllables: a vowel ends one; a single consonant before a vowel opens the next
        cur, stress, sylls = '', False, []
        for n, (u, vowel) in enumerate(units):
            if u == 'ˈ':
                stress = True
                continue
            if not u:
                continue
            cur += u
            if vowel:
                nxt = [x for x in units[n + 1:] if x[0] not in ('ˈ', '')]
                if len(nxt) >= 2 and not nxt[0][1] and not nxt[1][1]:
                    cur += nxt[0][0]
                    units[n + 1 + units[n + 1:].index(nxt[0])] = ('', False)
                sylls.append(cur.upper() if stress else cur)
                cur, stress = '', False
        if cur:
            if sylls:
                sylls[-1] += cur.upper() if sylls[-1].isupper() else cur
            else:
                sylls.append(cur)
        out.append('-'.join(sylls))
    return ' '.join(out)


def is_ipa(value: str) -> bool:
    """A film's override is IPA when it is wrapped in slashes or uses IPA letters; otherwise it is a respelling."""
    v = value.strip()
    return (v.startswith('/') and v.endswith('/')) or bool(IPA_HINT.search(v))


def _possessive(ph: str) -> str:
    return ph + ('ɪz' if ph.rstrip('ː')[-1:] in 'szʃʒ' or ph.endswith(('ʧ', 'ʤ')) else 'z')


class Pronouncer:
    def __init__(self, extra: dict | None = None):
        self.ipa: dict[str, str] = dict(lexicon())
        self.respell: dict[str, str] = {}
        for k, v in (extra or {}).items():
            if is_ipa(v):
                self.ipa[k] = v.strip().strip('/')
            else:
                self.respell[k] = v
                self.ipa.pop(k, None)
        names = sorted(set(self.ipa) | set(self.respell), key=len, reverse=True)
        self.rx = re.compile(r'(?<![\w’\'])(' + '|'.join(re.escape(n) for n in names) + r')([’\']s)?(?![\w])') if names else None

    def _say(self, name: str, poss: bool, diphthongs: bool) -> tuple[str, str]:
        """('ipa', phonemes) or ('text', respelling) for one matched name."""
        if name in self.respell:
            return 'text', self.respell[name] + ("'s" if poss else '')
        ph = to_kokoro(self.ipa[name], diphthongs)
        return 'ipa', _possessive(ph) if poss else ph

    def markup(self, text: str) -> str:
        """Names as misaki links: '[Mbappé](/ˌɛmbapˈA/) scored'."""
        if not self.rx:
            return text

        def sub(m):
            kind, say = self._say(m.group(1), bool(m.group(2)), True)
            return f'[{m.group(0)}](/{say}/)' if kind == 'ipa' else say
        return self.rx.sub(sub, text)

    def pieces(self, text: str) -> list[tuple[str, str]]:
        """The text cut into ('text', …) and ('ipa', …) runs, for the espeak path."""
        if not self.rx:
            return [('text', text)]
        out, at = [], 0
        for m in self.rx.finditer(text):
            if m.start() > at:
                out.append(('text', text[at:m.start()]))
            out.append(self._say(m.group(1), bool(m.group(2)), False))
            at = m.end()
        if at < len(text):
            out.append(('text', text[at:]))
        return out

    def respelled(self, text: str) -> str:
        """The text with every listed name respelled for a text-only voice."""
        if not self.rx:
            return text
        return self.rx.sub(lambda m: (self.respell[m.group(1)] if m.group(1) in self.respell else respell(self.ipa[m.group(1)]))
                           + ("'s" if m.group(2) else ''), text)

    def names_in(self, text: str) -> list[str]:
        return [m.group(1) for m in self.rx.finditer(text)] if self.rx else []


# ── text → phonemes ──────────────────────────────────────────────────────────────────────────────────────────────────
_G2P = None
_MISAKI_FAILED = False


def _espeak_ready() -> None:
    try:
        import espeakng_loader
        from phonemizer.backend.espeak.wrapper import EspeakWrapper
        EspeakWrapper.set_library(espeakng_loader.get_library_path())
        EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    except Exception:  # noqa: BLE001 — a system espeak works too
        pass


def misaki():
    """The British misaki G2P, or None when it is not installed (the espeak path is used then)."""
    global _G2P, _MISAKI_FAILED
    if _G2P is None and not _MISAKI_FAILED:
        try:
            _espeak_ready()
            from misaki import en, espeak
            _G2P = en.G2P(trf=False, british=True, fallback=espeak.EspeakFallback(british=True))
        except Exception:  # noqa: BLE001 — missing package or spaCy model: fall back, and say so in the voice meta
            _MISAKI_FAILED = True
    return _G2P


def phonemes(text: str, pr: Pronouncer, kokoro=None) -> tuple[str, str]:
    """(phonemes, engine) for one sentence or clause. `kokoro` is the loaded model, used for its espeak tokenizer."""
    g = misaki()
    if g is not None:
        ps, _ = g(pr.markup(text))
        return ''.join(c for c in ps if c in VOCAB).strip(), 'misaki'
    if kokoro is None:
        raise RuntimeError('neither misaki nor a Kokoro tokenizer is available')
    parts = []
    for kind, s in pr.pieces(text):
        if kind == 'ipa':
            parts.append(s)
        elif s.strip():
            parts.append(kokoro.tokenizer.phonemize(s, 'en-gb'))
    return ' '.join(p.strip() for p in parts if p.strip()), 'espeak'


# ── what the lexicon does not know ───────────────────────────────────────────────────────────────────────────────────
COMMON = set('''The A An In It He She They We You I But And Or On At Of For To From By With His Her Their Its One Two Three
Four Five Six Seven Eight Nine Ten Eleven Twelve Then When What Who Why How This That These Those There Here If As Not
No So Yes Now After Before First Second Third Last Every Some All Each Both Only Even Just Still Over Under Into Out Up
Down Off Again Once Twice Never Always Today Tonight Tomorrow Yesterday Europe European Cup League Champions Final
Greek Greece Spain Spanish English England Scotland Scottish Ireland Irish Wales Welsh Britain British France French
Germany German Italy Italian Portugal Portuguese Netherlands Dutch Belgium Israel Israeli Turkey Turkish Serbia Serbian
Bosnia Bosnian Croatia Croatian Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April
May June July August September October November December Football Stories Stadium Park Arena Avenue Street City United
Athens Piraeus Seville London Glasgow Liverpool Manchester Birmingham Istanbul Belgrade Budapest Warsaw Munich Rome
Milan Paris Lisbon Porto Amsterdam Jerusalem Christmas Day Award Fair Play State Super Youth Conference Cup Winners
Olympic Rovers Villa Rangers Hampden Anfield Bloomfield Chelsea Barcelona Juventus Ajax Legend Over Nil Sports Times
Voice Mediterranean Malta FC Penalties Relegated Thousands Semi finalists Aston Robbie Shaun Henrik Armenia Lithuania Lithuanian Switzerland Moroccan Gaza White Hill Wit Thema'''.split())


def unknown_names(text: str, pr: Pronouncer) -> list[str]:
    """Capitalised words in a narration that the lexicon does not list and that do not look like plain English.
    Every one is a guess by the voice; the QA report names them so a person can add them before the next film."""
    covered = set()
    if pr.rx:
        for m in pr.rx.finditer(text):
            covered.update(range(m.start(), m.end()))
    g = misaki()
    known = set(g.lexicon.golds) | set(g.lexicon.silvers) if g is not None else set()
    out = []
    for m in re.finditer(r"[A-ZÀ-ÞĀ-ž][\w’'À-ž-]*", text):
        if m.start() in covered:
            continue
        w = re.sub(r"[’']s$", '', m.group(0)).strip("-’'")
        if not w or w in COMMON or w.isupper() and len(w) <= 4 and w in known:
            continue
        foreign = any(ord(c) > 127 for c in w)
        parts = [x for x in w.split('-') if x]
        if foreign or any(x not in known and x.lower() not in known and x not in COMMON for x in parts):
            out.append(w)
    return sorted(set(out))

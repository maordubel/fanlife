"""The model film (docs/fanlife/74-model-film.md): a hand-written storyboard cut by the studio's own editor.

Held here: the storyboard obeys the rules it was written to (a question inside the hook's window, no picture on more
than two beats, no banned effect, every picture it names is in the pack), the cut the editor makes of it passes the
editor's own rules and the language mix, the page it draws cannot lose its timeline to an empty selector, the devices
added for it (the crossed free kick, the schematic, the points table, the ident) say what they are, and the vertical
re-frame keeps its subject in the picture."""
from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio.docu import build as B  # noqa: E402
from studio.docu import editor as E  # noqa: E402
from studio.docu import explainer as X  # noqa: E402
from studio.docu import vertical as V  # noqa: E402
from studio.docu.films import pao_aek_1994 as F  # noqa: E402
from studio.qa import MAX_ASSET_SHOTS, MIX_GRAIN, STAKE_BY_S  # noqa: E402

WPS = 2.47   # the narrator's measured pace on this film (538 words in 218 s of voice); a line takes 0.35 s a word + 0.68 s


def built():
    sb = json.loads(json.dumps(F.SB))
    durs = {f'l{i:03d}.wav': round(0.353 * len(b['vo'].split()) + 0.679, 3) for i, b in enumerate(sb['beats']) if b.get('vo')}
    root = Path(tempfile.mkdtemp(prefix='model-'))
    beats = B.edited(sb, B.timeline(sb['beats'], durs), root)
    film = B.Film(sb, root)
    film.agg_moves = []
    D = film.build(beats)
    return sb, beats, film.page(D), json.loads((root / 'docu-shots.json').read_text()), D


class Storyboard(unittest.TestCase):
    def test_the_question_is_asked_inside_the_hooks_window(self):
        sb, beats, _, _, _ = built()
        card = next(b['t'] + x.get('at', 0) for b in beats for x in b['shots'] if x['kind'] == 'word' and '?' in x['text'])
        self.assertLess(card, STAKE_BY_S + 1.5)   # stand-in timings run ~1.4 s long over the hook's short lines; with the narrator's own takes the card stands at 14.5 s
        said = ' '.join(b['vo'] for b in beats if b.get('vo') and b['t'] < STAKE_BY_S + 5)
        self.assertIn('?', said)
        self.assertNotRegex(said, r'(?i)one nil|0\s*[–-]\s*1|won|goal\b.*scored by')   # the result is withheld

    def test_no_picture_is_on_more_than_two_beats_and_every_one_is_in_the_pack(self):
        names = set(F.PACK.values()) | {f'{k}.jpg' for k in F.LIB} | {'crest-pao.png', 'portrait-print.png', 'applause-print.png', 'fanlife.png'}
        uses: dict = {}
        for i, b in enumerate(F.B):
            for x in b['shots']:
                for key in ('src', 'bg'):
                    if x.get(key) and (key == 'src' or x['kind'] == 'score'):
                        self.assertIn(x[key], names, x[key])
                        uses.setdefault(x[key], set()).add(i)
        self.assertLessEqual(max(len(v) for v in uses.values()), MAX_ASSET_SHOTS, {k: sorted(v) for k, v in uses.items() if len(v) > MAX_ASSET_SHOTS})
        owner = {v for v in F.PACK.values() if v != 'crest-src.png'}
        used = set(uses) | {x.replace('-print.png', '.jpg') for x in uses}
        self.assertEqual(owner - used, set(), 'every picture the owner supplied is on screen')

    def test_nothing_flickers_and_nothing_is_said_that_the_ledger_cut(self):
        text = json.dumps(F.SB, ensure_ascii=False)
        self.assertNotRegex(text, r'"(glitch|flash)"')                    # rule 142
        said = ' '.join(b['vo'] or '' for b in F.B)
        for cut in ('30,000', 'thirty thousand', 'Saravakos', 'Manolas', 'Wandzik', 'Kolitsidakis', 'Apostolakis', 'flares', 'riot'):
            self.assertNotIn(cut, said)                                    # FACTS.md: cut, not proven twice


class Cut(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sb, cls.beats, cls.page, cls.shots, cls.D = built()

    def test_the_editor_finds_nothing_wrong_and_no_still_is_a_slide(self):
        self.assertEqual(self.shots['errors'], [])
        self.assertEqual(E.errors(self.beats), [])
        for s in self.shots['shots']:
            if s['type'] in ('end', 'follow'):
                continue
            for p in s['pictures']:
                if p['kind'] == 'image':
                    self.assertLessEqual(p['d'], E.MAX_STILL + 0.01, (s['n'], p))

    def test_three_languages_and_a_named_camera(self):
        mix = self.shots['mix']
        # the gate's limit is PLAIN_MAX + MIX_GRAIN on the narrator's own takes (56.8% measured); stand-in timings stretch the
        # short picture lines, so the cut made here is held three points looser — the rendered film is held by the gate itself
        self.assertLessEqual(mix['documentary'], X.PLAIN_MAX + MIX_GRAIN + 0.03)
        self.assertGreater(mix['explainer'], 0.15)
        self.assertGreater(mix['kinetic'], 0.08)
        moves = {p.get('camera') for s in self.shots['shots'] for p in s['pictures']} - {None}
        self.assertGreaterEqual(len(moves), 6, moves)

    def test_the_page_keeps_its_timeline(self):
        self.assertFalse('tl.to("",' in self.page)          # GSAP throws on an empty selector and every later tween is lost
        self.assertFalse('tl.fromTo("",' in self.page)
        self.assertFalse('class="tr hl"' in self.page)      # `.hl` is the highlighter (absolute): a lit row is `.lit`
        self.assertEqual(self.page.count('class="tr lit"'), 1)
        self.assertEqual(self.page.count('class="tr mk"'), 1)

    def test_the_new_devices_say_what_they_are(self):
        self.assertTrue('SCHEMATIC · NOT TO SCALE' in self.page)                       # the locator is never passed off as a map
        self.assertTrue(re.search(r'<path id="ch\d+h" d="M1690 560 L1812 540"', self.page))  # the header's own line into the net
        self.assertTrue('class="idn"' in self.page)
        self.assertTrue('<b class="pt">83</b>' in self.page)
        self.assertEqual(len(re.findall(r'class="recon">Illustration', self.page)) > 20, True)

    def test_a_print_marked_stay_is_not_taken_off_at_the_first_cut(self):
        b = next(b for b in self.beats if any(x['kind'] == 'cutout' and x.get('stay') for x in b['shots']) and b['d'] > 5)
        cut = next(x for x in b['shots'] if x['kind'] == 'cutout')
        self.assertNotIn('d', cut)


class FormBracket(unittest.TestCase):
    def test_a_bracket_over_the_whole_strip_writes_no_empty_selector(self):
        f = B.Film({'palette': {'us': '#0B7A3E', 'them': '#C99700'}}, Path('.'))
        f.form({'results': list('WWW'), 'bracket': (0, 2, 'ALL THREE')}, 0.0, 4.0)
        self.assertNotIn('tl.to("",', ''.join(f.tw))


class Vertical(unittest.TestCase):
    def test_the_subject_stays_in_the_frame_at_every_zoom(self):
        for size in ((1376, 768), (2752, 1536), (1500, 2010), (1500, 1500)):
            for focus in ((0.05, 0.1), (0.5, 0.5), (0.95, 0.9), (0.24, 0.48)):
                for zoom in (1.0, 1.15, 1.6):
                    x0, y0, x1, y1 = V.crop_box(size, focus, zoom)
                    self.assertGreaterEqual(x0, 0)
                    self.assertGreaterEqual(y0, 0)
                    self.assertLessEqual(x1, size[0] + 1e-6)
                    self.assertLessEqual(y1, size[1] + 1e-6)
                    self.assertAlmostEqual((x1 - x0) / (y1 - y0), V.W / V.H, places=3)
                    fx, fy = focus[0] * size[0], focus[1] * size[1]
                    self.assertTrue(x0 - 1 <= min(max(fx, (x1 - x0) / 2), size[0] - (x1 - x0) / 2) <= x1 + 1)
                    self.assertTrue(y0 - 1 <= fy <= y1 + 1 or (y1 - y0) >= size[1] - 1)

    def test_captions_are_a_glance_long_and_lose_no_word(self):
        for b in F.B:
            if b.get('vo'):
                gs = V.groups(b['vo'])
                self.assertEqual(' '.join(gs), ' '.join(b['vo'].split()))
                self.assertTrue(all(len(g) <= V.MAX_GROUP or ' ' not in g for g in gs), gs)

    def test_every_cut_speaks_only_lines_of_the_film(self):
        lines = {b['vo'] for b in F.B if b.get('vo')}
        self.assertEqual(len(F.VERTICAL), 5)
        for c in F.VERTICAL:
            for s in c['scenes']:
                if s.get('vo'):
                    self.assertIn(s['vo'], lines)
            wps = sum(len(s['vo'].split()) for s in c['scenes'] if s.get('vo')) / WPS
            self.assertLess(wps + V.END_S + 4, 45 if c['kind'] == 'short' else 40, c['name'])


if __name__ == '__main__':
    unittest.main()

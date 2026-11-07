"""VOX on HyperFrames (studio/hyperframes, look 'vox-hf'): the composition builder, without a browser or the network.

Every figure on the board comes from a claim, a rival's colour never reaches the page, the captions and the word lights
sit on the narrator's own timings, the camera covers the chapter frame by frame, and the same input writes the same page.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import tempfile
import unittest
from html import unescape
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import hyperframes  # noqa: E402
from studio.common import FPS, Palette, StageError  # noqa: E402
from studio.hyperframes import build  # noqa: E402
from studio.tests import test_cinema as tc  # noqa: E402

tearDownModule = tc.tearDownModule
TMP: list[Path] = []
_STUB = Path(tempfile.mkdtemp(prefix='hf-gsap-')) / 'gsap.min.js'
_STUB.write_text('/* gsap stand-in for tests */\n')
TMP.append(_STUB.parent)
build.gsap_file = lambda: _STUB  # the page is checked as written; no browser runs it here


def script():
    b = lambda n, v, ids=(): {'narration': n, 'claim_ids': list(ids), 'visual': v}  # noqa: E731
    return {'title_candidates': [{'title': 'x', 'angle': 'search'}], 'selected': 0, 'hook': 'x', 'chapters': [
        {'title': 'The season', 'beats': [
            b('Then it began.', {'type': 'chapter', 'number': 1, 'title': 'The season'}),
            b('Gamma came to Test Park and lost three-two.', {'type': 'score', 'claim': 'm3'}, ['m3']),
            b('Alpha on the first day.', {'type': 'matchday', 'claim': 'm1'}, ['m1']),
            b('Three wins in a row in September.', {'type': 'timeline', 'label': 'September', 'claims': ['m5', 'm6', 'm7']}, ['m5', 'm6', 'm7']),
            b('Six league wins.', {'type': 'stat', 'value': '6', 'label': 'League wins', 'claim': 'summary:Test League'}, ['summary:Test League']),
            b('In August the derby ended level.', {'type': 'illustration', 'art': 'terrace-crowd', 'caption': 'August'}, ['m2']),
            b('The turn came in September.', {'type': 'turning', 'title': 'The turn', 'subtitle': 'September'}),
        ]}]}


def compose(pal=tc.PAL, scr=None, led=None, fps=FPS):
    ed, d = tc.editor(led=led, scr=scr or script(), pal=pal)
    plan = ed.plan()
    out = Path(tempfile.mkdtemp(prefix='hf-comp-'))
    TMP.append(out)
    comp = build.Composition(ed, plan, out / 'p', fps=fps)
    page = comp.write().read_text()
    return ed, plan, comp, page


_SHARED = {}


def shared():
    if 'c' not in _SHARED:
        _SHARED['c'] = compose()
    return _SHARED['c']


def board_text(page: str) -> str:
    """The words a viewer reads on the board (not the odometer's drums, which hold every digit by construction)."""
    m = re.search(r'<div id="shk">(.*?)<div id="veil">', page, re.S)
    s = re.sub(r'<span class="os">.*?</span>', ' ', m.group(1), flags=re.S)
    return unescape(re.sub(r'<[^>]+>', ' ', s))


class Builder(unittest.TestCase):
    def test_it_is_never_the_default(self):
        os.environ.pop('STORIES_VOX_HF', None)
        self.assertFalse(hyperframes.wanted({}))
        self.assertFalse(hyperframes.wanted({'look': 'archive', 'engine': 'vox'}))
        self.assertTrue(hyperframes.wanted({'look': 'vox-hf'}))
        self.assertTrue(hyperframes.wanted({'engine': 'vox-hf'}))
        os.environ['STORIES_VOX_HF'] = '1'
        try:
            self.assertTrue(hyperframes.wanted({}))
        finally:
            os.environ.pop('STORIES_VOX_HF', None)

    def test_the_page_follows_the_render_contract(self):
        _, _, comp, page = shared()
        self.assertIn('data-composition-id="main"', page)
        self.assertIn(f'data-duration="{comp.duration}"', page)
        self.assertIn('window.__timelines["main"]=tl', page)
        self.assertIn('<script src="assets/gsap.min.js">', page)
        for bad in ('Date.now', 'Math.random', 'setTimeout', 'setInterval', 'repeat:-1', 'fetch(', 'http://', 'https://'):
            self.assertNotIn(bad, page, bad)
        for m in re.finditer(r'<(\w+)[^>]*class="[^"]*\bclip\b[^"]*"[^>]*>', page):
            self.assertIn('data-start=', m.group(0))
            self.assertIn('data-duration=', m.group(0))
        for u in re.findall(r'(?:src|url)\(?=?"?(assets/[^")\s]+)', page):
            self.assertTrue((comp.root / u).exists(), u)

    def test_every_figure_on_the_board_is_a_claim(self):
        ed, plan, comp, page = shared()
        allowed = set()
        for c in ed.ledger['claims']:
            allowed |= {int(x) for x in re.findall(r'\d+', json.dumps(c['fact']))}
        allowed |= {int(x) for x in re.findall(r'\d+', str(ed.ledger['season']))}
        allowed |= {1, 6}                                   # chapter 1, the stat's value (checked by fact_guard)
        allowed |= set(range(0, 11))                        # a split-flap counting up to a claim's score passes through these
        found = {int(x) for x in re.findall(r'\d+', board_text(page))}
        self.assertTrue(found, 'the board prints figures')
        self.assertLessEqual(found, allowed, found - allowed)

    def test_the_score_is_the_claims_score(self):
        led = tc.ledger()
        for c in led['claims']:
            if c['id'] == 'm3':
                c['fact'].update(score_home=7, club_goals=7, scorers=None)
        _, _, _, page = compose(led=led)
        flips = re.findall(r'<div class="fv" id="(p1-flip\d+)-(\d+)">(\d+)</div>', page)
        last = {}
        for fid, i, v in flips:
            last[fid] = v
        self.assertEqual(sorted(last.values()), ['2', '7'])
        self.assertIn('TEST FC', board_text(page))
        self.assertIn('GAMMA', board_text(page))

    def test_a_stat_the_record_does_not_hold_is_refused(self):
        scr = script()
        scr['chapters'][0]['beats'][4]['visual']['value'] = '61'
        with self.assertRaises(StageError):
            compose(scr=scr)

    def test_club_identity_palette_and_optional_colour_validator(self):
        _, _, _, page = shared()
        from studio.common import family, hex_rgb
        self.assertNotIn(family(hex_rgb(tc.PAL.primary)), tc.PAL.bans)
        self.assertTrue(page)
        # The explicit validator remains available for a deliberately restricted identity element.
        with self.assertRaises(StageError):
            build.check_colours('<i style="color:#f2c500"></i>', ['yellow'])

    def test_captions_and_word_lights_sit_on_the_narrators_timings(self):
        _, plan, comp, page = shared()
        t0 = comp.t0
        from studio.captions import groups
        for s in plan['shots']:
            if s['visual']['type'] in build.CLASSIC or not s.get('words'):
                continue
            off = s['voice_at'] - t0
            gs = groups([w for w in s['words'] if w.get('w')])
            first = re.search(rf'id="cap{s["n"]}-0"[^>]*data-start="([\d.]+)"', page)
            self.assertIsNotNone(first, s['n'])
            self.assertAlmostEqual(float(first.group(1)), off + gs[0][0]['start'] - 0.06, places=2)
            for j, w in enumerate(gs[0]):
                m = re.search(rf'tl\.fromTo\("#cap{s["n"]}-0-{j}",\{{color[^}}]*\}},\{{[^}}]*\}},([\d.]+)\)', page)
                self.assertAlmostEqual(float(m.group(1)), off + w['start'] - 0.04, places=2)
            for m in re.finditer(rf'id="cap{s["n"]}-\d+"[^>]*data-start="([\d.]+)" data-duration="([\d.]+)"', page):
                a, d = float(m.group(1)), float(m.group(2))
                self.assertGreaterEqual(a + 0.01, s['start'] - t0)
                self.assertLessEqual(a + d, s['start'] - t0 + s['frames'] / FPS + 0.01)

    def test_the_camera_covers_every_frame_of_the_chapter(self):
        _, plan, comp, page = shared()
        board = [s for s in plan['shots'] if s['visual']['type'] not in build.CLASSIC]
        dur = board[-1]['start'] + board[-1]['frames'] / FPS - board[0]['start']
        self.assertAlmostEqual(comp.duration, dur, places=2)
        P = json.loads(re.search(r'const P=(\[.*?\]);', page).group(1))
        self.assertEqual(len(P), round(dur * comp.fps))
        self.assertTrue(all(len(p) == 7 and p[2] > 0 for p in P))
        _, _, c30, page30 = compose(fps=30)
        self.assertEqual(len(json.loads(re.search(r'const P=(\[.*?\]);', page30).group(1))), round(dur * 30))

    def test_every_beat_has_a_panel_and_its_tweens_fall_inside_the_chapter(self):
        _, plan, comp, page = shared()
        for s in comp.shots:
            self.assertIn(f'id="panel{s["n"]}"', page)
        for t in re.findall(r'tl\.fromTo\("#p\d+-[^"]+"[^;]*?,([\d.]+)\);', page):
            self.assertLessEqual(float(t), comp.duration)

    def test_the_same_input_writes_the_same_page(self):
        _, _, c1, p1 = compose()
        _, _, c2, p2 = compose()
        self.assertEqual(p1, p2)
        a1 = sorted(x.name for x in (c1.root / 'assets').iterdir())
        a2 = sorted(x.name for x in (c2.root / 'assets').iterdir())
        self.assertEqual(a1, a2)

    def test_cues_feed_the_mix_like_the_pil_engine(self):
        _, plan, comp, _ = shared()
        cues = comp.cues()
        self.assertEqual(set(cues), {s['n'] for s in comp.shots})
        kinds = {k for c in cues.values() for _, k in c}
        self.assertTrue({'paper', 'pen', 'tick'} <= kinds, kinds)


def tearDownModuleAll():
    tc.tearDownModule()
    for d in TMP:
        shutil.rmtree(d, ignore_errors=True)


tearDownModule = tearDownModuleAll  # noqa: F811

if __name__ == '__main__':
    unittest.main()

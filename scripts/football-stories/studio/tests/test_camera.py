"""The camera grammar (studio/camera.py): every move is calm by construction — eased, bounded in speed and acceleration,
never dead — at every length and intensity; the director chooses by the beat's emotion and never repeats a move three
times; the page gets the same curves that were measured; and DOCU films every still with it."""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import camera as C  # noqa: E402
from studio.docu import build as B  # noqa: E402
from studio.docu import editor as E  # noqa: E402

LENGTHS = (1.4, 2.0, 2.6, 3.4, 4.0, 6.0, 9.0)


class Curves(unittest.TestCase):
    def test_every_move_is_bounded_and_never_dead(self):
        for m in C.MOVES:
            for d in LENGTHS:
                for i in (0.0, 0.5, 1.0):
                    for way in (1, -1):
                        self.assertEqual(C.problems(m, d, intensity=i, way=way), [], (m, d, i))
                        f = C.flow(m, d, intensity=i, way=way)
                        self.assertEqual(f['dead_frames'], 0)
                        self.assertGreaterEqual(f['slowest'], 0.05)

    def test_only_the_snap_is_fast_and_it_only_slows_down(self):
        for d in LENGTHS:
            f = C.flow('snap', d, intensity=1.0)
            self.assertLessEqual(max(f['first_frame'], f['max_speed']), C.SNAP_SPEED_MAX)
            ps = [C.pose('snap', d, i / 25, 'fore', intensity=1.0)['scale'] for i in range(int(d * 25) + 1)]
            t1 = int(min(C.SNAP_S, d * 0.5) * 25)
            self.assertTrue(all(a >= b for a, b in zip(ps[:t1], ps[1:t1 + 1])))          # in, in, in — it never comes back out
            self.assertTrue(all(b >= a for a, b in zip(ps[t1 + 1:], ps[t1 + 2:])))        # then the breath, one way
        for m in C.MOVES:
            if m != 'snap':
                self.assertLessEqual(C.flow(m, 1.4, intensity=1.0)['max_speed'], C.SPEED_MAX, m)

    def test_no_plane_shows_its_edge(self):
        """A plane is always larger than the frame by more than it has travelled (centre origin, the wide framing)."""
        for m in C.MOVES:
            for d in LENGTHS:
                for s in C.spec(m, d, intensity=1.0):
                    for end in (s['a'], s['b']):
                        if s['plane'] == 'vig':
                            continue
                        self.assertGreaterEqual((end['scale'] - 1) * C.W / 2 + 0.6, abs(end['x']), (m, d, s))
                        self.assertGreaterEqual((end['scale'] - 1) * C.H / 2 + 0.6, abs(end['y']), (m, d, s))

    def test_the_near_plane_travels_further_than_the_far_one(self):
        for m in ('dolly', 'crane', 'track', 'orbit', 'rack', 'pull'):
            sp = {s['plane']: s for s in C.spec(m, 3.4, intensity=0.6)}
            def trav(s):   # noqa: E306
                return abs(s['b']['scale'] - s['a']['scale']) * C.W / 2 + abs(s['b']['x'] - s['a']['x']) + abs(s['b']['y'] - s['a']['y'])
            self.assertGreater(trav(sp['fore']), trav(sp['back']) * 1.3, m)

    def test_intensity_is_distance_not_shake(self):
        lo, hi = C.flow('dolly', 3.4, intensity=0.0), C.flow('dolly', 3.4, intensity=1.0)
        self.assertGreater(hi['max_speed'], lo['max_speed'] * 1.5)
        self.assertLess(hi['worst_jerk'], C.JERK_MAX)

    def test_the_page_plays_the_curves_that_were_measured(self):
        js = C.gsap(C.spec('snap', 3.0, 0.8), {'back': '#a', 'fore': '#b', 'vig': '#c'}, 12.5)
        self.assertEqual(len(js), 5)                                          # three planes in, two planes breathing after
        self.assertTrue(all(x.startswith('tl.fromTo("#') for x in js))
        self.assertIn('ease:settle', js[0])                                   # the page's own function, defined once …
        self.assertIn('var settle=function', C.EASES_JS)
        self.assertIn('immediateRender:false', js[3])                         # a plane's second tween never jumps ahead
        self.assertNotIn('immediateRender', js[0])
        self.assertNotRegex(' '.join(js), r'back\.out|elastic|bounce|yoyo|repeat')   # nothing overshoots or comes back (rule 142)
        for name in ('glide', 'settle', 'none', 'power2.out', 'sine.inOut'):
            self.assertEqual((C.ease(name, 0), round(C.ease(name, 1), 9)), (0, 1.0), name)
        self.assertEqual(C.gsap(C.spec('breath', 2.0), {'back': '#a'}, 0)[0].count('fromTo'), 1)   # a plane the page lacks is skipped

    def test_the_pil_engines_get_the_same_move(self):
        from PIL import Image
        im = Image.new('RGB', (2000, 1200), (90, 90, 90))
        a, b = C.pose('dolly', 3.0, 0.0), C.pose('dolly', 3.0, 3.0)
        self.assertEqual((a['scale'], b['scale']), (C.spec('dolly', 3.0)[0]['a']['scale'], C.spec('dolly', 3.0)[0]['b']['scale']))
        self.assertEqual(C.frame_pil(im, 'track', 3.0, 1.5, (960, 540)).size, (960, 540))


class Director(unittest.TestCase):
    def test_the_emotion_chooses_the_move(self):
        self.assertEqual(C.choose('tension', []), 'dolly')
        self.assertEqual(C.choose('release', []), 'snap')
        self.assertEqual(C.choose('grief', []), 'pull')
        self.assertEqual(C.choose('defiance', []), 'track')
        self.assertEqual(C.choose('pride', [], subjects=['stadium']), 'crane')
        self.assertEqual(C.choose('tension', [], subjects=['crowd']), 'track')     # a crowd under tension: the track tells both
        self.assertEqual(C.choose('grief', [], subjects=['crowd']), 'pull')        # … but grief does not travel along a crowd
        self.assertEqual(C.choose('joy', [], under_card=True), 'breath')
        self.assertTrue(all(C.PURPOSE[m] for m in C.MOVES))

    def test_never_the_same_move_three_times(self):
        hist = []
        for _ in range(40):
            hist.append(C.choose('tension', hist))
        self.assertTrue(all(not (a == b == c) for a, b, c in zip(hist, hist[1:], hist[2:])))
        self.assertGreaterEqual(len(set(hist)), 2)

    def test_the_editor_films_every_still_and_a_card_only_breathes(self):
        img = lambda **kw: {'kind': 'image', 'src': 'a.webp', 'move': 'push', **kw}   # noqa: E731
        beats = [{'t': 0, 'd': 9, 'shots': [img()], 'meta': {'n': 0, 'type': 'illustration', 'emotion': 'tension', 'intensity': 0.9, 'subjects': ['crowd']}},
                 {'t': 9, 'd': 8, 'shots': [img(veil=0.55), {'kind': 'score', 'us': 'A', 'them': 'B', 'us_goals': 1, 'them_goals': 0}], 'meta': {'n': 1, 'type': 'score', 'emotion': 'joy', 'intensity': 1.0}},
                 {'t': 17, 'd': 7, 'shots': [img(move='slam')], 'meta': {'n': 2, 'type': 'goal'}}]
        out = E.cut(beats)
        pics = [x for b in out for x in b['shots'] if x['kind'] == 'image']
        self.assertTrue(all(x.get('cam') in C.MOVES for x in pics))
        self.assertEqual(out[0]['shots'][0]['cam'], 'track')                    # tension over a crowd
        self.assertEqual(out[0]['shots'][0]['ci'], 0.9)
        self.assertEqual({x['cam'] for x in out[1]['shots'] if x['kind'] == 'image'} - {'breath', 'dolly'}, set())   # under the scoreboard
        self.assertEqual(out[2]['shots'][0]['cam'], 'snap')                     # no sheet: the old slam is the snap
        self.assertEqual([e for e in E.errors(out) if 'camera' in e], [])
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}, 'silent': True}, Path('/tmp'))
        f.agg_moves = []
        D = f.build(out)
        page = f.page(D)
        self.assertEqual(len(f.cams), len(pics))
        self.assertIn('class="phi fore"', page)                                 # the near plane …
        self.assertIn('mask-image:linear-gradient', page)
        self.assertIn('class="vig"', page)                                      # … and the vignette plane
        self.assertIn('var glide=function', page)
        for c in f.cams:                                                        # every move as laid is calm at its own length
            self.assertEqual(C.problems(c['move'], c['d'], intensity=c['ci']), [], c)
        self.assertNotRegex(page, r'yoyo|repeat:|elastic|bounce')

    def test_a_storyboard_written_by_hand_is_drawn_as_before(self):
        f = B.Film({'palette': {'us': '#c00', 'them': '#222'}, 'silent': True}, Path('/tmp'))
        f.agg_moves = []
        f.build([{'t': 0, 'd': 4, 'shots': [{'kind': 'image', 'src': 'a.webp', 'move': 'panl'}]}])
        self.assertEqual(f.cams, [])
        self.assertNotIn('fore', ''.join(f.clips))
        self.assertTrue(re.search(r'scale:1\.14,x:60', ''.join(f.tw)))


if __name__ == '__main__':
    unittest.main()

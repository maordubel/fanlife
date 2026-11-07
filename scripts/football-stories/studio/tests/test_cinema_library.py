"""The moving-art library (studio/cinema/library.py, studio/cinema/animate.py): names are classified, pieces on paper are
cut out (cream inside a figure stays), the club's colour replaces the signal red and no banned colour prints, the choice
follows the beat's meaning and the record (weather, kick-off, honours), no piece plays twice running, every element
moves in and out, the owner's transition art is the cut — and a film without the library renders exactly as before.
No network: the pieces are drawn here.
"""
from __future__ import annotations

import io
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio.cinema import animate as A, library as L, look  # noqa: E402
from studio.common import FPS  # noqa: E402
from studio.motion import ShotRenderer, blend_entry  # noqa: E402
from studio.tests import test_cinema as TC  # noqa: E402

RED = (200, 16, 46)
INK = (24, 22, 20)


def jpeg(im: Image.Image) -> bytes:
    b = io.BytesIO()
    im.convert('RGB').save(b, 'JPEG', quality=92)
    return b.getvalue()


def figure(paper=(250, 250, 248), w=420, h=560, seed=0) -> Image.Image:
    """A paper figure on flat paper: an ink body, a signal-red scarf, cream shorts inside the outline, a gap under one arm."""
    im = Image.new('RGB', (w, h), paper)
    d = ImageDraw.Draw(im)
    cx = w // 2 + (seed % 3 - 1) * 10
    d.ellipse([cx - 40, 40, cx + 40, 120], fill=INK)                    # head
    d.rectangle([cx - 90, 120, cx + 90, 330], fill=INK)                 # coat
    d.rectangle([cx - 70, 300, cx + 70, 380], fill=(232, 224, 204))    # cream shorts, enclosed by ink
    d.rectangle([cx - 90, 370, cx + 90, 384], fill=INK)
    d.rectangle([cx - 60, 384, cx - 15, 520], fill=INK)                # legs
    d.rectangle([cx + 15, 384, cx + 60, 520], fill=INK)
    d.rectangle([cx - 95, 150, cx + 95, 185], fill=RED)                 # scarf
    d.rectangle([cx + 95, 130, cx + 140, 330], fill=INK)                # arm, with a paper gap beside the coat
    d.rectangle([cx + 92, 200, cx + 95, 300], fill=paper)
    return im


def scene(seed: int, red: bool = True, w=640, h=360) -> Image.Image:
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype('float32')
    base = np.stack([60 + 80 * xx / w, 70 + 60 * yy / h, 80 + 40 * np.sin(xx / 37 + seed)], -1)
    base += rng.normal(0, 12, base.shape)
    if red:
        base[h // 2:h // 2 + 30] = RED
    return Image.fromarray(np.clip(base, 0, 255).astype('uint8'), 'RGB')


def mp4(path: Path, colour='0xC8102E') -> bool:
    if not shutil.which('ffmpeg'):
        return False
    r = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f'color=c={colour}:s=320x180:d=1.2:r=25',
                        '-vf', 'drawbox=x=40+t*80:y=40:w=60:h=60:c=0x181614:t=fill', '-pix_fmt', 'yuv420p', str(path)])
    return r.returncode == 0


PIECES = {
    'pup-striker-pose-kr': lambda: figure(seed=1), 'pup-keeper-pose-n': lambda: figure(seed=2),
    'pup-old-man-pose-kr': lambda: figure(seed=3), 'pup-striker-kr': lambda: figure(seed=4),
    'ppl-ultras-capo-kr': lambda: figure(seed=5), 'ppl-riot-line-n': lambda: figure(seed=6),
    'sup-walk-kr': lambda: figure((238, 230, 212), seed=7), 'sup-sit-step-kr': lambda: figure(seed=8),
    'sup-rain-kr': lambda: figure(seed=9), 'sup-scarf-up-kr': lambda: figure(seed=10), 'sup-hug-kr': lambda: figure(seed=11),
    'obj-ball-old-n': lambda: figure(w=300, h=300, seed=12), 'obj-trophy-plain-n': lambda: figure(w=300, h=300, seed=13),
    'obj-flag-stick-kr': lambda: figure(w=300, h=300, seed=14),
    'sky-floodlit-night-n': lambda: scene(1, False), 'sky-golden-hour-n': lambda: scene(2, False), 'sky-storm-n': lambda: scene(3, False),
    'ground-1950s-int-kr': lambda: scene(4), 'ground-1990s-int-kr': lambda: scene(5), 'ground-1990s-ext-kr': lambda: scene(6),
    'layer-europe-night-kr-bg': lambda: scene(7), 'layer-europe-night-kr-fg': lambda: figure((246, 240, 228), 640, 360, 15),
    'layer-rain-stand-kr-bg': lambda: scene(8), 'layer-rain-stand-kr-fg': lambda: figure((246, 240, 228), 640, 360, 16),
    'tr-scarf-whip-kr': lambda: scene(9), 'tr-ticket-tear-n': lambda: figure(w=500, h=320, seed=17),
    'cl-dossier-n': lambda: scene(10), 'thumb-x-kr': lambda: scene(11),
}


def build_lib(root: Path, with_clips: bool = True) -> dict:
    files, data = [], {}
    for i, (stem, make) in enumerate(PIECES.items()):
        fid = f'id{i:03d}'
        files.append({'id': fid, 'name': f'{stem}.png_{i:08x}.jpg'})
        data[fid] = jpeg(make())
    if with_clips:
        for j, stem in enumerate(('clip-goal-net-ripple-kr', 'clip-empty-after-n')):
            p = root.parent / f'{stem}.mp4'
            if mp4(p):
                fid = f'clip{j}'
                files.append({'id': fid, 'name': f'{stem}_{j:08x}.mp4'})
                data[fid] = p.read_bytes()
    files.append({'id': 'notes', 'name': 'README.md'})
    return L.sync(files, root, log=lambda m: None, getter=lambda fid: data[fid])


TMP: list[Path] = []


def setUpModule():
    global LIBDIR
    d = Path(tempfile.mkdtemp(prefix='cinema-lib-test-'))
    TMP.append(d)
    LIBDIR = d / 'lib'
    build_lib(LIBDIR)


def tearDownModule():
    for d in TMP:
        shutil.rmtree(d, ignore_errors=True)
    TC.tearDownModule()


class WithLib:
    def setUp(self):
        self._env = os.environ.get(L.ENV)
        os.environ[L.ENV] = str(LIBDIR)

    def tearDown(self):
        if self._env is None:
            os.environ.pop(L.ENV, None)
        else:
            os.environ[L.ENV] = self._env


# ------------------------------------------------------------------ the loader
class Names(unittest.TestCase):
    def test_drive_names_become_stems(self):
        self.assertEqual(L.stem_of('pup-striker-kr.png_d0f7bcf2.jpg'), 'pup-striker-kr')
        self.assertEqual(L.stem_of('clip-goal-net-ripple-kr_ce5398b9.mp4'), 'clip-goal-net-ripple-kr')
        self.assertEqual(L.stem_of('layer-rain-stand-kr-full.png_4919ef46.jpg'), 'layer-rain-stand-kr-full')
        self.assertIsNone(L.stem_of('README.md'))

    def test_the_prefix_says_what_a_piece_is(self):
        c = L.classify
        self.assertEqual(c('pup-striker-pose-kr')['cls'], 'puppet')
        self.assertEqual(c('pup-striker-pose-kr')['figure'], 'striker')
        self.assertEqual(c('pup-striker-kr')['cls'], 'sheet')
        self.assertEqual(c('sup-walk-kr')['colour'], 'kr')
        self.assertEqual(c('pup-keeper-pose-n')['colour'], 'n')
        self.assertEqual((c('layer-rain-stand-kr-fg')['group'], c('layer-rain-stand-kr-fg')['part']), ('layer-rain-stand-kr', 'fg'))
        self.assertEqual(c('layer-tunnel-n')['part'], 'full')
        self.assertEqual(c('ground-1950s-int-kr')['era'], 1950)
        self.assertEqual(c('ground-1950s-int-kr')['side'], 'int')
        self.assertEqual(c('tr-scarf-whip-kr')['cls'], 'transition')
        for skip in ('cl-dossier-n', 'f01-panel-03', 'iwt-tape-piece', 'map-europe-n', 'tex-paper-n', 'zzz-x'):
            self.assertEqual(c(skip)['cls'], 'skip', skip)
        # a thumbnail hero is kept for studio/thumbs (5.11.2026) — as its own class, which no film shot ever takes
        self.assertEqual(c('thumb-x-kr')['cls'], 'thumb')
        self.assertEqual(c('thumb-hero-derby-kr')['colour'], 'kr')


class Cutting(unittest.TestCase):
    def test_a_figure_on_paper_is_cut_out_and_the_cream_inside_it_stays(self):
        for paper in ((250, 250, 248), (238, 230, 212)):
            im = figure(paper)
            piece, keyed = L.cut_out(Image.open(io.BytesIO(jpeg(im))))
            self.assertTrue(keyed)
            a = np.asarray(piece.getchannel('A'))
            self.assertLess(piece.width, im.width)            # cropped to the ink
            self.assertEqual(a[0, 0], 0)                       # the paper is gone
            if paper[0] == 250:   # cream shorts on white paper are part of the figure (on cream paper they ARE the paper)
                self.assertGreater(a[int(a.shape[0] * 0.6), piece.width // 2], 200)
            self.assertGreater(a[int(a.shape[0] * 0.35), piece.width // 2], 200)   # the coat

    def test_a_full_scene_is_not_cut(self):
        _, keyed = L.cut_out(scene(1))
        self.assertFalse(keyed)

    def test_a_vignetted_paper_is_still_one_paper(self):
        im = np.asarray(figure((240, 232, 214))).astype('float32')
        h, w = im.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        im *= (1 - 0.09 * (((xx - w / 2) / w) ** 2 + ((yy - h / 2) / h) ** 2) * 4)[..., None]
        piece, keyed = L.cut_out(Image.fromarray(im.clip(0, 255).astype('uint8')))
        self.assertTrue(keyed)
        a = np.asarray(piece.getchannel('A'))
        self.assertEqual(a[0, 0], 0)
        self.assertEqual(a[-1, -1], 0)


    def test_the_fast_painter_of_a_clip_frame_holds_the_same_line(self):
        for acc, bans in (('#007A3D', ['red', 'yellow']), ('#C8102E', ['green', 'blue', 'yellow'])):
            for im in (scene(3), scene(8), figure()):
                a = np.asarray(im.convert('RGB'))
                fast = L.paint_fast(a, 'kr', acc, bans)
                exact = np.asarray(L.paint(im.convert('RGB'), 'kr', acc, bans))
                self.assertEqual(TC.banned_share(fast, bans), 0.0)
                self.assertLess(np.abs(fast.astype(int) - exact.astype(int)).mean(), 3.0)


class Sync(unittest.TestCase):
    def test_the_index_holds_what_the_documentaries_use(self):
        lib = L.load(LIBDIR)
        self.assertIsNotNone(lib)
        self.assertIn('sup-walk-kr', lib.by)
        self.assertTrue(lib.by['sup-walk-kr']['keyed'])
        self.assertFalse(lib.by['ground-1950s-int-kr']['keyed'])
        self.assertTrue(lib.by['layer-rain-stand-kr-fg']['keyed'])
        self.assertFalse(lib.by['layer-rain-stand-kr-bg']['keyed'])
        self.assertEqual(lib.by['layer-rain-stand-kr-fg']['w'], lib.by['layer-rain-stand-kr-bg']['w'])  # registered, not cropped
        self.assertNotIn('cl-dossier-n', lib.by)
        self.assertEqual(lib.by['thumb-x-kr']['cls'], 'thumb')        # kept for the thumbnails, not cut out of its paper
        self.assertFalse(lib.by['thumb-x-kr']['keyed'])

    def test_a_second_sync_downloads_nothing(self):
        d = Path(tempfile.mkdtemp(prefix='cinema-lib-sync-'))
        TMP.append(d)
        listing = [{'id': 'a', 'name': 'sup-walk-kr.png_00000001.jpg'}, {'id': 'b', 'name': 'obj-ball-old-n.png_00000002.jpg'},
                   {'id': 'c', 'name': 'sup-hug-kr.png_00000003.jpg'}]
        calls = []

        def get(fid):
            calls.append(fid)
            if fid == 'c':
                raise OSError('Drive answered with a page, not the file')
            return jpeg(figure())
        r1 = L.sync(listing, d, log=lambda m: None, getter=get)
        self.assertEqual(sorted(r1['new']), ['obj-ball-old-n', 'sup-walk-kr'])
        self.assertEqual([f['name'] for f in r1['failed']], ['sup-hug-kr.png_00000003.jpg'])
        calls.clear()
        r2 = L.sync(listing, d, log=lambda m: None, getter=get)
        self.assertEqual(r2['kept'], 2)
        self.assertEqual(calls, ['c'])   # only the one that failed is asked for again

    def test_without_a_library_nothing_loads(self):
        self.assertIsNone(L.load(''))
        self.assertIsNone(L.load(Path(tempfile.gettempdir()) / 'no-such-library'))


class Colour(unittest.TestCase):
    def test_signal_red_becomes_the_club_colour_and_no_ban_prints(self):
        im = figure().convert('RGBA')
        out = L.paint(im, 'kr', '#007A3D', ['red', 'yellow'])
        fam = L.families(np.asarray(out.convert('RGB')))
        self.assertIn('green', fam)
        self.assertNotIn('red', fam)
        # an `-n` piece is never repainted, but still scrubbed of a banned family
        out = L.paint(scene(3), 'n', '#007A3D', ['red'])
        self.assertNotIn('red', L.families(np.asarray(out)))
        self.assertEqual(TC.banned_share(np.asarray(out), ['red']), 0.0)


# ------------------------------------------------------------------ the choice
def ctx(**k):
    base = {'kind': 'illustration', 'n': 3, 'mood': None, 'text': '', 'outcome': None, 'side': None, 'europe': False,
            'final': False, 'derby': False, 'tags': set(), 'year': 1995, 'weather': set(), 'night': False, 'day': False,
            'honour': False, 'pens': False, 'save': False, 'manager': False, 'chairman': False, 'press': False, 'memory': False,
            'goal_kind': False, 'late': False, 'away_city': None, 'explicit': False, 'claims': True}
    base.update(k)
    return base


class Meaning(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lib = L.load(LIBDIR)

    def take(self, c, role, n=1):
        pk = A.Picker(self.lib, ['yellow'], 'test')
        return [p['stem'] for p in pk.take(A.wants(c)[role], c, role, n, set())]

    def test_a_goal_brings_the_striker_and_the_net(self):
        c = ctx(kind='goal', outcome='win', goal_kind=True)
        self.assertEqual(self.take(c, 'actor'), ['pup-striker-pose-kr'])
        if 'clip-goal-net-ripple-kr' in self.lib.by:
            self.assertEqual(self.take(c, 'scene'), ['clip-goal-net-ripple-kr'])

    def test_penalties_bring_the_keeper(self):
        self.assertEqual(self.take(ctx(kind='score', outcome='win', pens=True), 'actor'), ['pup-keeper-pose-n'])

    def test_a_derby_brings_the_terrace(self):
        self.assertIn(self.take(ctx(kind='score', outcome='draw', derby=True), 'actor')[0],
                      {'ppl-ultras-capo-kr', 'sup-scarf-up-kr'})
        self.assertIn('ppl-ultras-capo-kr', self.take(ctx(kind='score', outcome='draw', derby=True), 'actor', 2))

    def test_rain_only_when_a_claim_records_it(self):
        dry = self.take(ctx(kind='score', outcome='loss'), 'actor', 3)
        self.assertNotIn('sup-rain-kr', dry)
        self.assertIn('sup-sit-step-kr', dry)
        self.assertNotIn('layer-rain-stand-kr', self.take(ctx(kind='score', outcome='loss'), 'scene', 3))
        wet = ctx(kind='score', outcome='loss', weather={'rain'})
        self.assertEqual(self.take(wet, 'actor'), ['sup-rain-kr'])
        self.assertEqual(self.take(wet, 'scene'), ['layer-rain-stand-kr'])
        self.assertNotIn('sky-storm-n', self.take(ctx(kind='chapter'), 'scene', 5))

    def test_a_night_sky_needs_an_evening_kick_off(self):
        self.assertNotIn('sky-floodlit-night-n', self.take(ctx(kind='chapter'), 'scene', 6))
        self.assertIn('sky-floodlit-night-n', self.take(ctx(kind='chapter', night=True), 'scene', 6))

    def test_silverware_only_on_a_final_won_or_an_honour(self):
        self.assertNotIn('obj-trophy-plain-n', self.take(ctx(kind='score', outcome='win'), 'object', 4))
        self.assertIn('obj-trophy-plain-n', self.take(ctx(kind='score', outcome='win', final=True), 'object', 4))

    def test_the_ground_is_of_the_era(self):
        self.assertEqual(self.take(ctx(kind='race', year=1958), 'scene'), ['ground-1950s-int-kr'])
        self.assertEqual(self.take(ctx(kind='race', year=1996), 'scene'), ['ground-1990s-int-kr'])

    def test_european_nights_get_their_layer(self):
        self.assertEqual(self.take(ctx(kind='versus', outcome='win', europe=True, side='away'), 'scene'), ['layer-europe-night-kr'])

    def test_no_incident_the_record_does_not_hold(self):
        for c in (ctx(derby=True), ctx(kind='score', outcome='loss'), ctx(kind='chapter')):
            self.assertNotIn('ppl-riot-line-n', self.take(c, 'actor', 6))

    def test_a_puppet_sheet_is_never_shown_as_a_picture(self):
        for role in ('actor', 'object', 'scene'):
            self.assertNotIn('pup-striker-kr', self.take(ctx(kind='goal', goal_kind=True, outcome='win'), role, 6))


class Film(WithLib, unittest.TestCase):
    def plan(self, led=None):
        ed, d = TC.editor(led)
        return ed, d, ed.plan()

    def test_every_shot_records_its_pieces_and_none_plays_twice_running(self):
        ed, d, plan = self.plan()
        prev, all_used = set(), []
        moving = 0
        for s in plan['shots']:
            els = (s.get('cinema') or {}).get('lib') or []
            keys = {e['key'] for e in els if e['role'] != 'transition'}
            self.assertFalse(keys & prev, f"shot {s['n']} repeats {keys & prev}")
            prev = keys
            all_used += list(keys)
            if any(e['role'] in ('actor', 'object') for e in els):
                moving += 1
            if s['visual']['type'] in ('end', 'follow', 'map'):
                self.assertEqual(els, [])
            for e in els:
                self.assertIn(e['role'], ('actor', 'object', 'scene', 'transition'))
        self.assertGreaterEqual(moving, len(plan['shots']) - 2)
        self.assertGreaterEqual(len(set(all_used)), 6)
        self.assertTrue(any(str((s.get('cinema') or {}).get('entry', '')).startswith('tr:') for s in plan['shots']))

    def test_the_weather_on_screen_is_the_records(self):
        ed, d, plan = self.plan()
        for s in plan['shots']:
            for e in (s.get('cinema') or {}).get('lib') or []:
                self.assertNotIn('rain', e['key'])
                self.assertNotIn('storm', e['key'])
            self.assertNotIn('rain', str((s.get('cinema') or {}).get('broll') or ''))
        led = TC.ledger()
        for c in led['claims']:
            if c['id'] == 'm4':
                c['fact']['conditions'] = 'heavy rain'
        ed, d, plan = self.plan(led)
        score = next(s for s in plan['shots'] if s['visual']['type'] == 'score')
        self.assertEqual(score['cinema']['broll'], 'lib:layer-rain-stand-kr')
        form = next(s for s in plan['shots'] if s['visual']['type'] == 'form')   # m4 is in the strip: one wet night of five
        self.assertNotIn('rain', str(form['cinema'].get('broll')))

    def test_the_recurring_supporter_is_never_in_a_frame_twice(self):
        ed, d, plan = self.plan()
        for s in plan['shots']:
            sups = [e['key'] for e in (s['cinema'].get('lib') or []) if e['key'].startswith('sup-')]
            self.assertLessEqual(len(sups), 1, sups)

    def test_elements_enter_move_and_leave(self):
        ed, d, plan = self.plan()
        sp = TC.StubSprites(d / 'sprites')
        checked = 0
        for s in plan['shots']:
            els = [e for e in (s['cinema'].get('lib') or []) if e['role'] in ('actor', 'object')]
            if not els or s['frames'] / FPS < 3.2:
                continue
            shot = ed.build(sp, s)
            mine = [l for l in shot.layers if isinstance(l._cache, A.Angles)]
            self.assertTrue(mine, s['visual']['type'])
            dur = shot.duration
            for l in mine:
                early, mid, late = l.pose(0.05), l.pose(dur * 0.5), l.pose(dur - 0.02)
                self.assertTrue(early is None or not (0 <= early.x <= 1920), 'an element starts off the frame')
                self.assertIsNotNone(mid)
                self.assertTrue(late is None or late.x < 0 or late.x > 1920 or late.y > 1080 or late.alpha < 0.2
                                or abs(late.x - mid.x) > 200, 'an element leaves before the cut')
            r = ShotRenderer(shot)
            a, b = r.frame(int(0.3 * FPS)), r.frame(int(1.2 * FPS))
            self.assertGreater(np.abs(a.astype(int) - b.astype(int)).mean(), 1.0)
            self.assertEqual(b.shape, (1080, 1920, 3), s['visual']['type'])
            checked += 1
        self.assertGreaterEqual(checked, 3)

    def test_the_transition_art_is_the_cut(self):
        ed, d, plan = self.plan()
        sp = TC.StubSprites(d / 'sprites')
        s = next(s for s in plan['shots'] if str(s['cinema'].get('entry', '')).startswith('tr:'))
        shot = ed.build(sp, s)
        self.assertIn('tr_fn', shot.meta)
        ps = ed.build(sp, plan['shots'][s['n'] - 1])
        prev = ShotRenderer(ps).frame(ps.frames - 1)
        r = ShotRenderer(shot)
        f0 = r.frame(int(0.25 * FPS))
        mid = blend_entry(shot, int(0.25 * FPS), f0, prev, (0, 122, 61))
        self.assertGreater(np.abs(mid.astype(int) - f0.astype(int)).mean(), 5)
        self.assertGreater(np.abs(mid.astype(int) - prev.astype(int)).mean(), 5)
        after = r.frame(int(1.0 * FPS))
        self.assertTrue((blend_entry(shot, int(1.0 * FPS), after, prev, (0, 122, 61)) == after).all())
        self.assertEqual(mid.shape, (1080, 1920, 3))

    def test_a_plan_made_with_the_library_renders_without_it(self):
        ed, d, plan = self.plan()
        os.environ[L.ENV] = ''
        sp = TC.StubSprites(d / 'sprites')
        for s in plan['shots'][:6]:
            shot = ed.build(sp, s)
            self.assertFalse(str(shot.entry).startswith('tr:'))
            ShotRenderer(shot).frame(min(shot.frames - 1, 10))


class WithoutLibrary(unittest.TestCase):
    def test_the_film_is_exactly_the_house_edit(self):
        env = os.environ.pop(L.ENV, None)
        try:
            ed, d = TC.editor()
            plan = ed.plan()
            for s in plan['shots']:
                c = s.get('cinema') or {}
                self.assertNotIn('lib', c)
                self.assertFalse(str(c.get('entry', '')).startswith('tr:'))
                self.assertFalse(str(c.get('broll') or '').startswith('lib:'))
        finally:
            if env is not None:
                os.environ[L.ENV] = env

    def test_the_house_b_roll_keeps_dry_without_a_record_of_rain(self):
        for salt in range(20):
            k = look.pick(['loss'], [], f's{salt}')
            if k:
                self.assertNotIn('rain', k)


if __name__ == '__main__':
    unittest.main()

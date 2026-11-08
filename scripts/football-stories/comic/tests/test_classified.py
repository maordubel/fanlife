"""CLASSIFIED composer: manifest, beat clock, depth layers, the renderer's output, and the rule that the owner's
panels never live in the repository. Runs on dummy panels drawn in code — CI never needs the owner's art."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

os.environ.setdefault('CLASSIFIED_WORKERS', '1')

from comic import compose, dummy, drive_fetch, episode, layers, manifest  # noqa: E402

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parents[2]
DEMO = HERE / 'episodes' / 'file01-demo.json'


class Manifest(unittest.TestCase):
    def test_shape(self):
        man = manifest.load_manifest()
        self.assertEqual(man['series'], 'CLASSIFIED')
        self.assertEqual(set(man['tones']), {'LAUGH', 'WAR', 'HEART'})
        for t in man['tones'].values():
            self.assertRegex(t['color'], r'^#[0-9A-F]{6}$')
        all_e = manifest.entries(man)
        ids = [e['id'] for e in all_e]
        files = [e['file'] for e in all_e]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(files), len(set(files)))
        for e in all_e:
            for k in ('id', 'role', 'kind', 'name', 'drive_id', 'file'):
                self.assertTrue(e.get(k), f'{e.get("id")}: {k}')
            self.assertRegex(e['drive_id'], r'^[A-Za-z0-9_-]{20,}$')
            self.assertIn(e['kind'], ('panel', 'photo', 'sheet', 'cutout'))
        for k, f in man['files'].items():
            self.assertIn(f['tone'], man['tones'])
            # a FILE drafted before its drawings exist says so, with the date and where the drawing brief is (8.11.2026)
            self.assertTrue(f['panels'] or f.get('awaiting_panels'), k)

    def test_missing_roles_are_reported(self):
        man = manifest.load_manifest()
        miss = manifest.missing_roles(man, 'file01')
        for r in ('P03', 'P06', 'P09', 'P11', 'P18'):
            self.assertIn(r, miss)
        self.assertNotIn('P01', miss)
        self.assertNotIn('P05', miss)   # covered (uncertainly) by a P05/P15 panel
        self.assertIn('P16', manifest.missing_roles(man, 'file02'))

    def test_demo_panels_are_in_the_manifest(self):
        man = manifest.load_manifest()
        ids = {e['id'] for e in manifest.entries(man, 'file01')}
        ep, beats = episode.load(DEMO)
        for b in beats:
            self.assertIn(b.panel, ids)


class Clock(unittest.TestCase):
    def test_demo_timing(self):
        ep, beats = episode.load(DEMO)
        T = episode.total(beats)
        self.assertGreaterEqual(T, 12)
        self.assertLessEqual(T, 15)
        self.assertEqual(episode.frames(beats, 25), round(T * 25))
        for a, b in zip(beats, beats[1:]):
            self.assertAlmostEqual(a.start + a.dur, b.start)
            self.assertLess(b.tdur, b.dur)
        self.assertEqual(beats[0].transition, 'cut')

    def test_voice_sync(self):
        ep = {'tone': 'LAUGH', 'beats': [{'panel': 'a', 'voice': 'l1', 'pad': .2}, {'panel': 'b', 'voice': 'l2', 'dur': 9},
                                        {'panel': 'c', 'dur': 1.5, 'transition': 'whip'}]}
        _, beats = episode.load(ep, {'l1': [1.0, 3.5], 'l2': 2.0})
        self.assertAlmostEqual(beats[0].dur, 2.7)
        self.assertAlmostEqual(beats[1].dur, 2.0)
        self.assertAlmostEqual(beats[2].start, 4.7)
        with self.assertRaises(episode.EpisodeError):
            episode.load({'beats': [{'panel': 'a', 'voice': 'nope'}]}, {})
        with self.assertRaises(episode.EpisodeError):
            episode.load({'beats': [{'panel': 'a', 'dur': 1}, {'panel': 'b', 'dur': .2, 'transition': 'turn'}]})
        with self.assertRaises(episode.EpisodeError):
            episode.load({'beats': [{'panel': 'a', 'dur': 1, 'fx': ['blood']}]})


class Layers(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        layers.CACHE = Path(self.tmp.name) / 'cache'
        self.p = Path(self.tmp.name) / 'panel.jpg'
        dummy.panel(480, 270, 3).save(self.p, quality=92)

    def tearDown(self):
        self.tmp.cleanup()

    def test_split_shape_and_alpha(self):
        L = layers.load(self.p, allow_model=False)
        H, W = 270, 480
        for a in (L.bg, L.sub, L.fg, L.rgb):
            self.assertEqual(a.shape, (H, W, 3))
            self.assertEqual(a.dtype, np.uint8)
        for a in (L.a_sub, L.a_fg, L.depth):
            self.assertEqual(a.shape, (H, W))
            self.assertGreaterEqual(float(a.min()), 0.0)
            self.assertLessEqual(float(a.max()), 1.0)
        self.assertTrue((L.a_fg <= L.a_sub + 1e-6).all())
        self.assertGreater(float(L.a_sub.mean()), .02)
        self.assertLess(float(L.a_sub.mean()), .9)
        self.assertEqual(L.method, 'fallback-saliency')

    def test_layers_recompose_to_the_picture(self):
        """At rest the owner's picture comes back as supplied: nothing blurred, nothing altered."""
        L = layers.load(self.p, allow_model=False)
        err = np.abs(layers.recompose(L).astype(int) - L.rgb.astype(int))
        self.assertLess(float(err.mean()), 1.0)
        L2 = layers.load(self.p, allow_model=False)   # from the cache
        self.assertEqual(L2.sha, L.sha)
        self.assertLess(float(np.abs(layers.recompose(L2).astype(int) - L.rgb.astype(int)).mean()), 1.5)

    def test_missing_model_falls_back(self):
        os.environ['CLASSIFIED_DEPTH_MODEL'] = str(Path(self.tmp.name) / 'absent.onnx')
        try:
            from comic import depth
            d, how = depth.depth_map(np.asarray(Image.open(self.p).convert('RGB')))
            self.assertEqual(how, 'fallback-saliency')
            self.assertEqual(d.shape, (270, 480))
        finally:
            os.environ.pop('CLASSIFIED_DEPTH_MODEL')


def _ffprobe(p: Path) -> dict:
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
                          'stream=width,height,r_frame_rate,nb_read_frames,codec_name,pix_fmt', '-of', 'json', str(p)],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)['streams'][0]


class Render(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        t = Path(self.tmp.name)
        layers.CACHE = t / 'cache'
        self.panels = t / 'panels'
        self.panels.mkdir()
        man = manifest.load_manifest()
        for i, e in enumerate(manifest.entries(man, 'file01')[:6]):
            dummy.panel(448, 252, i + 1).save(self.panels / e['file'], quality=90)
        self.ep = {'file': 'file01', 'number': '01', 'title': 'THE BOTTLE', 'tone': 'LAUGH', 'fps': 25, 'beats': [
            {'panel': 's02-dossier', 'dur': .6, 'move': 'push', 'fx': [{'type': 'stamp', 't0': .1}, 'tab',
                                                                        {'type': 'caption', 'text': 'Friday.', 't0': .1}]},
            {'panel': 's03-laugh', 'dur': .6, 'move': 'dolly_r', 'transition': 'whip',
             'fx': [{'type': 'shards', 't0': .1}, 'droplets', 'glint', {'type': 'smash', 't0': .1}, 'speedlines', 'stars']},
            {'panel': 's04-abstract-a', 'dur': .7, 'move': 'pan_l', 'transition': 'slide', 'fx': ['smoke', 'embers', 'flare', 'rain']},
            {'panel': 'f01-missing-panel', 'dur': .8, 'move': 'hold', 'transition': 'turn'},
            {'panel': 's05-abstract-b', 'dur': .5, 'move': 'slowmo', 'transition': 'smash', 'fx': [{'type': 'title', 't0': .05}]}]}

    def tearDown(self):
        self.tmp.cleanup()

    def composer(self, wh=(320, 180)):
        _, beats = episode.load(self.ep)
        assets = manifest.scan_folder(self.panels, 'auto', manifest.load_manifest())
        return compose.Composer(self.ep, beats, assets, wh, allow_model=False, log=lambda m: None)

    def test_mp4_size_fps_frames(self):
        out = Path(self.tmp.name) / 'o.mp4'
        c = self.composer()
        rep = c.render(out)
        s = _ffprobe(out)
        self.assertEqual((s['width'], s['height']), (320, 180))
        self.assertEqual(s['r_frame_rate'], '25/1')
        self.assertEqual(s['codec_name'], 'h264')
        self.assertEqual(s['pix_fmt'], 'yuv420p')
        self.assertEqual(int(s['nb_read_frames']), round(3.2 * 25))
        self.assertEqual(rep['missing'], ['f01-missing-panel'])   # reported, and a slate stands in — never a guess

    def test_vertical(self):
        out = Path(self.tmp.name) / 'v.mp4'
        self.composer((180, 320)).render(out)
        s = _ffprobe(out)
        self.assertEqual((s['width'], s['height']), (180, 320))

    def test_deterministic(self):
        a, b = self.composer(), self.composer()
        for f in (3, 17, 31, 50):
            self.assertTrue(np.array_equal(a.frame(f), b.frame(f)), f'frame {f}')

    def test_frames_move(self):
        c = self.composer()
        self.assertGreater(float(np.abs(c.frame(2).astype(int) - c.frame(12).astype(int)).mean()), .5)

    def test_out_inside_repo_is_refused(self):
        rc = compose.main(['--episode', str(DEMO), '--panels', str(self.panels), '--out', str(REPO / 'tmp-render.mp4'), '--no-model'])
        self.assertEqual(rc, 2)
        self.assertFalse((REPO / 'tmp-render.mp4').exists())


class Pack(unittest.TestCase):
    def test_pack_folder_photos_and_cutouts(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            (d / '01_Scenes').mkdir()
            (d / '02_Editing_Assets').mkdir()
            (d / '03_Source_References').mkdir()
            dummy.panel(320, 180, 1).save(d / '01_Scenes' / 'Press Photo 1990.jpg')
            cut = np.zeros((100, 60, 4), np.uint8)
            cut[20:80, 10:50] = (200, 30, 30, 255)
            Image.fromarray(cut, 'RGBA').save(d / '02_Editing_Assets' / 'player cutout.png')
            dummy.panel(320, 180, 2).save(d / '03_Source_References' / 'ref.jpg')
            (d / 'credits.json').write_text(json.dumps({'*': 'Photo: agency archive'}))
            a = manifest.scan_folder(d)
            kinds = {k: v.kind for k, v in a.items()}
            self.assertEqual(kinds['press-photo-1990'], 'photo')
            self.assertEqual(kinds['player-cutout'], 'cutout')
            self.assertEqual(kinds['ref'], 'reference')
            self.assertEqual(a['press-photo-1990'].credit, 'Photo: agency archive')
            self.assertFalse(a['press-photo-1990'].drawn)   # a photograph is not boiled like ink

            layers.CACHE = d / 'cache'
            ep = {'tone': 'WAR', 'beats': [{'panel': 'press-photo-1990', 'dur': .4, 'move': 'push',
                                            'fx': [{'type': 'cutout', 'asset': 'player-cutout', 'at': [.5, .6]}]}]}
            _, beats = episode.load(ep)
            c = compose.Composer(ep, beats, a, (320, 180), allow_model=False, log=lambda m: None)
            fr = c.frame(3)
            self.assertEqual(fr.shape, (180, 320, 3))


class NoOwnerArtInRepo(unittest.TestCase):
    def test_no_panel_in_the_repository(self):
        man = manifest.load_manifest()
        names = {e['file'] for e in manifest.entries(man)}
        names |= {e['name'] for e in manifest.entries(man)}
        ids = {e['drive_id'] for e in manifest.entries(man)}
        try:
            tracked = subprocess.run(['git', 'ls-files'], cwd=REPO, capture_output=True, text=True, check=True).stdout.split('\n')
        except (OSError, subprocess.CalledProcessError):
            tracked = [str(p.relative_to(REPO)) for p in REPO.rglob('*') if p.is_file() and 'node_modules' not in p.parts]
        for f in tracked:
            base = Path(f).name
            self.assertNotIn(base, names, f)
            self.assertNotIn(Path(f).stem, ids, f)
            if f.startswith('scripts/football-stories/comic/'):
                self.assertNotRegex(base.lower(), r'\.(png|jpe?g|webp|mp4|mov)$', f)

    def test_fetch_refuses_repo_and_web_pages(self):
        with self.assertRaises(SystemExit):
            drive_fetch.fetch([], REPO / 'panels-here', 'x{id}')
        self.assertIsNotNone(drive_fetch.is_picture(b'<!DOCTYPE html><html>sign in</html>'))
        self.assertIsNotNone(drive_fetch.is_picture(b'not an image at all'))
        with tempfile.TemporaryDirectory() as d:
            buf = Path(d) / 'p.jpg'
            dummy.panel(64, 36, 1).save(buf)
            good = buf.read_bytes()
            self.assertIsNone(drive_fetch.is_picture(good))
            items = [{'id': 'a', 'name': 'A', 'drive_id': 'X' * 25, 'file': 'a.jpg'},
                     {'id': 'b', 'name': 'B', 'drive_id': 'Y' * 25, 'file': 'b.jpg'}]
            rep = drive_fetch.fetch(items, Path(d) / 'out', 'u/{id}', log=lambda m: None,
                                    getter=lambda u: good if 'X' in u else b'<html>quota</html>')
            self.assertEqual(rep['ok'], ['a'])
            self.assertEqual(rep['failed'][0]['id'], 'b')


if __name__ == '__main__':
    unittest.main()

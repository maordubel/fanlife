"""Paper puppets (rig.py): cutting the pieces off a white sheet, pinning them at the joints, posing them with easing,
and drawing them in a beat. Runs on a puppet sheet drawn here in code — the owner's sheets never enter CI."""
from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

os.environ.setdefault('CLASSIFIED_WORKERS', '1')

from comic import compose, episode, layers, manifest, rig  # noqa: E402

W, H = 1200, 800
# (name, box or circle, pivot, parent, attach) in sheet pixels — laid out apart, as the art brief asks
PARTS = [
    ('torso', ('rect', 150, 100, 270, 300), (210, 290), None, None, 0),
    ('head', ('circle', 420, 140, 45), (420, 180), 'torso', (210, 110), 2),
    ('upper_arm_l', ('rect', 560, 80, 600, 220), (580, 90), 'torso', (160, 120), -1),
    ('forearm_l', ('rect', 680, 80, 715, 200), (697, 90), 'upper_arm_l', (580, 210), -1),
    ('upper_arm_r', ('rect', 800, 80, 840, 220), (820, 90), 'torso', (260, 120), 1),
    ('forearm_r', ('rect', 920, 80, 955, 200), (937, 90), 'upper_arm_r', (820, 210), 1),
    ('thigh_l', ('rect', 150, 450, 195, 620), (172, 460), 'torso', (180, 290), -1),
    ('shin_l', ('rect', 300, 450, 340, 630), (320, 460), 'thigh_l', (172, 610), -1),
    ('thigh_r', ('rect', 450, 450, 495, 620), (472, 460), 'torso', (240, 290), 1),
    ('shin_r', ('rect', 600, 450, 640, 630), (620, 460), 'thigh_r', (472, 610), 1),
    ('ball', ('circle', 900, 550, 40), (900, 550), 'shin_r', (620, 625), 3),
]
COLOURS = [(215, 25, 32), (232, 162, 124), (35, 60, 143), (27, 154, 214)]


def sheet(path: Path) -> Path:
    im = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    for i, (_, shape, *_r) in enumerate(PARTS):
        col = COLOURS[i % len(COLOURS)]
        if shape[0] == 'rect':
            x0, y0, x1, y1 = shape[1:]
            d.rectangle([x0 + 7, y0 + 7, x1 + 7, y1 + 7], fill=(226, 226, 224))   # the soft paper shadow under it
            d.rectangle([x0, y0, x1, y1], fill=col, outline=(21, 19, 15), width=5)
        else:
            cx, cy, r = shape[1:]
            d.ellipse([cx - r + 7, cy - r + 7, cx + r + 7, cy + r + 7], fill=(226, 226, 224))
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col, outline=(21, 19, 15), width=5)
    im.save(path)
    return path


def spec() -> dict:
    parts = {}
    for name, shape, pivot, parent, attach, z in PARTS:
        cx, cy = ((shape[1] + shape[3]) / 2, (shape[2] + shape[4]) / 2) if shape[0] == 'rect' else shape[1:3]
        p = {'pick': [cx / W, cy / H], 'pivot': [pivot[0] / W, pivot[1] / H], 'z': z}
        if parent:
            p.update(parent=parent, attach=[attach[0] / W, attach[1] / H])
        parts[name] = p
    return {'name': 'pup-test', 'parts': parts}


class Cutting(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = sheet(Path(self.tmp.name) / 'pup-test.png')

    def tearDown(self):
        self.tmp.cleanup()

    def test_every_piece_cut_with_alpha_and_no_white_fringe(self):
        pieces = rig.cut(rig.read_sheet(self.p))
        self.assertEqual(len(pieces), len(PARTS))   # the shadows went with the paper
        for pc in pieces:
            a = pc.img[..., 3]
            self.assertGreater(int(a.max()), 250)
            self.assertEqual(int(a[0, 0]), 0)
            edge = (a > 40) & (a < 215)
            if edge.any():   # un-mixed from the white: an edge pixel is not paper-white
                self.assertLess(float(pc.img[..., :3][edge].astype(int).min(-1).mean()), 200)

    def test_real_alpha_sheet_is_used_as_is(self):
        rgba = np.zeros((200, 300, 4), np.uint8)
        rgba[40:120, 30:90] = (200, 30, 30, 255)
        rgba[60:150, 180:260] = (30, 30, 200, 255)
        self.assertEqual(len(rig.cut(rgba)), 2)


class Rigging(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.p = sheet(Path(self.tmp.name) / 'pup-test.png')
        self.r = rig.build(spec(), rig.read_sheet(self.p))

    def tearDown(self):
        self.tmp.cleanup()

    def test_tree(self):
        self.assertEqual(self.r.root, 'torso')
        self.assertEqual(set(self.r.parts), {p[0] for p in PARTS})
        order = self.r.order()
        self.assertLess(order.index('upper_arm_l'), order.index('torso'))   # z decides who is drawn first
        self.assertLess(order.index('torso'), order.index('head'))

    def test_joints_hold_in_any_pose(self):
        """A child's pivot always sits on the point of its parent it is pinned to: limbs never come apart."""
        for ang in ({}, {'thigh_r': 40, 'shin_r': 62, 'root': 30}, {'upper_arm_l': -160, 'forearm_l': -20, 'head': 24}):
            Ms = self.r.matrices(ang, .1, -.05)
            for n, p in self.r.parts.items():
                if p.parent is None:
                    continue
                a = Ms[n] @ np.array([*p.pivot, 1.0])
                b = Ms[p.parent] @ np.array([*p.attach, 1.0])
                self.assertTrue(np.allclose(a, b, atol=1e-6), (n, ang))

    def test_rotation_turns_the_child_about_its_pivot(self):
        Ms = self.r.matrices({'thigh_r': 90})
        p = self.r.parts['thigh_r']
        foot = Ms['thigh_r'] @ np.array([p.pivot[0], p.pivot[1] + 100, 1.0])
        hip = Ms['thigh_r'] @ np.array([*p.pivot, 1.0])
        # clockwise on screen (y down): a limb hanging down turns to point left
        self.assertAlmostEqual(foot[0] - hip[0], -100, places=4)
        self.assertAlmostEqual(foot[1] - hip[1], 0, places=4)

    def test_bad_rigs_are_refused(self):
        s = spec()
        s['parts']['head']['pick'] = s['parts']['torso']['pick']
        with self.assertRaises(rig.RigError):
            rig.build(s, rig.read_sheet(self.p))
        s = spec()
        s['parts']['torso']['parent'] = 'head'
        s['parts']['torso']['attach'] = [.35, .15]
        with self.assertRaises(rig.RigError):
            rig.build(s, rig.read_sheet(self.p))
        s = spec()
        s['parts']['head']['pick'] = [.99, .99]
        with self.assertRaises(rig.RigError):
            rig.build(s, rig.read_sheet(self.p))


class Poses(unittest.TestCase):
    def test_built_in_poses(self):
        for name in ('kick', 'dive', 'scarf_raise', 'head_turn'):
            p = rig.POSES[name]
            rig.validate_pose(p, name)
            for k in p['keys']:
                for part in k['a']:
                    self.assertIn(part, rig.HUMANOID + ('root', 'ball', 'scarf'), (name, part))

    def test_interpolation_hits_the_keys_and_eases_between(self):
        p = rig.POSES['kick']
        dur = p['dur']
        a0, _ = rig.pose_at(p, 0)
        self.assertTrue(all(abs(v) < 1e-9 for v in a0.values()))
        back = p['keys'][1]
        a1, _ = rig.pose_at(p, back['t'] * dur)
        self.assertAlmostEqual(a1['thigh_r'], back['a']['thigh_r'])
        series = [rig.pose_at(p, back['t'] * dur * u / 20)[0].get('thigh_r', 0) for u in range(21)]
        self.assertTrue(all(b >= a - 1e-9 for a, b in zip(series, series[1:])))     # winds back without a jolt
        mid = series[10] / back['a']['thigh_r']
        self.assertLess(abs(mid - .5), .05)                                           # ease in-out: half way at half time
        self.assertLess(series[2] / back['a']['thigh_r'], .1)                          # slow out of the rest
        end, _ = rig.pose_at(p, dur * 5)
        self.assertAlmostEqual(end['thigh_r'], p['keys'][-1]['a']['thigh_r'])        # holds the last key

    def test_dive_travels(self):
        _, m = rig.pose_at(rig.POSES['dive'], rig.POSES['dive']['dur'])
        self.assertGreater(m[0], .3)

    def test_bad_pose_is_refused(self):
        with self.assertRaises(rig.RigError):
            rig.validate_pose({'keys': [{'t': 0, 'a': {}}, {'t': .5, 'a': {}}]})
        with self.assertRaises(rig.RigError):
            rig.validate_pose({'keys': [{'t': 0, 'a': {}}, {'t': 1, 'a': {}, 'ease': 'bounce'}]})


class Drawing(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        t = Path(self.tmp.name)
        self.folder = t / 'panels'
        self.folder.mkdir()
        sheet(self.folder / 'pup-test.png')
        self.rigs = t / 'rigs'
        self.rigs.mkdir()
        (self.rigs / 'pup-test.json').write_text(json.dumps(spec()))
        layers.CACHE = t / 'cache'
        from comic import dummy
        dummy.panel(320, 180, 2).save(self.folder / 'scene.jpg')

    def tearDown(self):
        self.tmp.cleanup()

    def test_pose_moves_the_figure_and_flip_mirrors_it(self):
        r = rig.build(spec(), rig.read_sheet(self.folder / 'pup-test.png'))
        frames = []
        for t in (0, .5, .75):
            fr = np.full((360, 640, 3), 244, np.uint8)
            ang, mv = rig.pose_at(rig.POSES['kick'], t)
            r.draw(fr, ang, (.5, .6), .7, root_dx=mv[0], root_dy=mv[1])
            frames.append(fr)
        self.assertGreater(int((frames[0] != 244).any(-1).sum()), 2000)
        self.assertGreater(float(np.abs(frames[0].astype(int) - frames[1].astype(int)).mean()), .3)
        a = np.full((360, 640, 3), 244, np.uint8)
        b = a.copy()
        r.draw(a, {}, (.5, .6), .7)
        r.draw(b, {}, (.5, .6), .7, flip=True)
        ca = np.argwhere((a != 244).any(-1))[:, 1].mean()
        cb = np.argwhere((b != 244).any(-1))[:, 1].mean()
        self.assertLess(abs((ca - 320) + (cb - 320)), 30)       # mirrored about the root's pivot line

    def test_puppet_in_a_beat(self):
        ep = {'tone': 'LAUGH', 'beats': [{'panel': 'scene', 'dur': .8, 'move': 'hold',
                                          'fx': [{'type': 'puppet', 'rig': 'pup-test', 'pose': 'kick', 'at': [.5, .85], 'height': .6}]}]}
        _, beats = episode.load(ep)
        assets = manifest.scan_folder(self.folder)
        c = compose.Composer(ep, beats, assets, (320, 180), allow_model=False, log=lambda m: None)
        c.rig_dir = self.rigs
        bare = compose.Composer({**ep, 'beats': [{**ep['beats'][0], 'fx': []}]}, episode.load({**ep, 'beats': [{**ep['beats'][0], 'fx': []}]})[1],
                                assets, (320, 180), allow_model=False, log=lambda m: None)
        f1, f0 = c.frame(10), bare.frame(10)
        self.assertGreater(float(np.abs(f1.astype(int) - f0.astype(int)).mean()), 1.0)
        self.assertNotIn('puppet:pup-test', c.report['missing'])

    def test_missing_rig_is_reported_not_invented(self):
        ep = {'tone': 'LAUGH', 'beats': [{'panel': 'scene', 'dur': .4, 'fx': [{'type': 'puppet', 'rig': 'nobody'}]}]}
        _, beats = episode.load(ep)
        c = compose.Composer(ep, beats, manifest.scan_folder(self.folder), (320, 180), allow_model=False, log=lambda m: None)
        c.rig_dir = self.rigs
        c.frame(2)
        self.assertIn('puppet:nobody', c.report['missing'])


if __name__ == '__main__':
    unittest.main()

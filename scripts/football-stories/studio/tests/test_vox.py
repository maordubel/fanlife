"""VOX (owner, 4.11.2026: "VOX style, automatically"): one board per chapter, a continuous camera, counters that land on
the record, a pen that circles the right thing, no rival colour, captions kept, the classic edit still one switch away.
No network, no Chromium: every VOX panel is drawn in PIL."""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import audio, vox  # noqa: E402
from studio.common import FPS, Palette  # noqa: E402
from studio.tests import test_cinema as tc  # noqa: E402  (the cinema's fixture ledger and script)
from studio.vox import compose as C  # noqa: E402
from studio.vox import elements as E  # noqa: E402
from studio.vox.camera import CameraPath  # noqa: E402
from studio.vox.render import VoxFilm, place  # noqa: E402

tearDownModule = tc.tearDownModule


def every_type_script(director=None):
    """The cinema's script plus a beat of every classic visual type."""
    s = tc.script(director)
    b = lambda n, v, ids=(): {'narration': n, 'claim_ids': list(ids), 'visual': v}  # noqa: E731
    s['chapters'].append({'title': 'More', 'beats': [
        b('A new chapter.', {'type': 'chapter', 'number': 2, 'title': 'More'}),
        b('Gamma came and went.', {'type': 'score', 'claim': 'm3'}, ['m3']),
        b('Matchday against Alpha.', {'type': 'matchday', 'claim': 'm1'}, ['m1']),
        b('A ticket kept.', {'type': 'ticket', 'claim': 'm5'}, ['m5']),
        b('The record of it.', {'type': 'fact', 'heading': 'The record', 'text': 'Test FC won 6 of 10 matches in 2002/03.'}),
        b('One number.', {'type': 'stat', 'value': '6', 'label': 'Wins', 'claim': 'summary:Test League'}),
        b('The papers.', {'type': 'press', 'outlet': 'The Weekly', 'headline': 'Test FC win the derby', 'standfirst': 'Two goals.'}),
        b('He said it.', {'type': 'quote', 'text': 'We played for the people in the stand.', 'who': 'A supporter'}),
        b('Five nights.', {'type': 'timeline', 'label': 'Autumn', 'claims': ['m5', 'm6', 'm7', 'm8', 'm9']}),
        b('The turn.', {'type': 'turning', 'title': 'The turn', 'subtitle': 'September'}),
        b('The derby in the autumn.', {'type': 'illustration', 'art': 'terrace-crowd', 'caption': 'Autumn'}, ['m8']),
    ]})
    return s


def film(director=None, scr=None, pal=tc.PAL):
    ed, d = tc.editor(scr=scr or every_type_script(director), pal=pal)
    from studio.common import write_json
    write_json(d / 'ledger.json', ed.ledger)
    write_json(d / 'script.json', ed.script)
    write_json(d / 'voice.json', ed.voice)
    plan = ed.plan()
    plan['engine'] = 'vox'
    return ed, plan, VoxFilm(ed, plan, d)


FILM = {}


def shared(director=None):
    if director not in FILM:
        FILM[director] = film(director)
    return FILM[director]


def overlap(a, b) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    w = min(ax + aw, bx + bw) - max(ax, bx)
    h = min(ay + ah, by + bh) - max(ay, by)
    return max(0, w) * max(0, h)


class Engine(unittest.TestCase):
    def test_vox_is_the_default_and_classic_is_one_switch_away(self):
        self.assertEqual(vox.engine_for({}), 'vox')
        self.assertEqual(vox.engine_for({'visual_style': 'archive'}), 'vox')
        self.assertEqual(vox.engine_for({'engine': 'classic'}), 'classic')
        self.assertEqual(vox.engine_for({'visual_style': 'classic'}), 'classic')
        os.environ['STORIES_VOX'] = '0'
        try:
            self.assertEqual(vox.engine_for({}), 'classic')
        finally:
            del os.environ['STORIES_VOX']
        src = (HERE / 'studio' / 'pipeline.py').read_text()
        self.assertIn("plan['engine'] = vox.engine_for(brief)", src)
        self.assertIn("from .vox.render import render_film as render", src)

    def test_the_classic_edit_still_renders_a_frame(self):
        from studio.motion import ShotRenderer
        ed, _ = tc.editor()
        plan = ed.plan()
        sp = tc.StubSprites(ed.sprites_dir)
        for s in plan['shots'][:3]:
            fr = ShotRenderer(ed.build(sp, s)).frame(5)
            self.assertEqual(fr.shape, (1080, 1920, 3))


class Board(unittest.TestCase):
    def test_every_visual_type_composes_and_settles(self):
        ed, plan, f = shared()
        kinds = set()
        for s in plan['shots']:
            if f.where(s['n'])['engine'] != 'vox':
                continue
            P = f.panel(s['n'])
            kinds.add(P.kind)
            self.assertTrue(P.focus, s['visual']['type'])
            self.assertTrue(all(0 <= k[0] <= P.dur + 1e-6 for k in P.focus))
            for e in P.els:
                if e.kind == 'cutout' or e.settle >= 1e8:
                    continue
                self.assertLessEqual(e.settle, P.dur + 0.6, f"{P.kind}: {type(e).__name__} still moving at the cut")
        self.assertTrue({'trailer', 'versus', 'goal', 'form', 'race', 'run', 'record', 'score', 'chapter', 'matchday', 'ticket',
                         'fact', 'stat', 'press', 'quote', 'timeline', 'turning', 'illustration'} <= kinds, kinds)

    def test_a_cut_out_never_covers_a_data_card(self):
        for director in (None, 'terrace'):
            ed, plan, f = shared(director)
            for s in plan['shots']:
                if f.where(s['n'])['engine'] != 'vox':
                    continue
                P = f.panel(s['n'])
                for c in P.cutout_rects():
                    for d in P.data_rects():
                        self.assertLess(overlap(c, d), 0.04 * d[2] * d[3], f"{P.kind}: a cut-out over a card ({director})")

    def test_a_board_starts_at_every_chapter_and_panels_do_not_overlap(self):
        ed, plan, f = shared()
        lay = place(plan, f.style, 'x')
        for s in plan['shots']:
            if s['visual']['type'] == 'chapter':
                prev = [p for p in plan['shots'] if p['n'] < s['n'] and lay['shots'][p['n']]['engine'] == 'vox']
                if prev:
                    self.assertNotEqual(lay['shots'][s['n']]['board'], lay['shots'][prev[-1]['n']]['board'])
        for b in lay['boards']:
            rects = [(lay['shots'][n]['ox'], lay['shots'][n]['oy'], C.PW, C.PH) for n in b['panels']]
            for i in range(len(rects)):
                for j in range(i + 1, len(rects)):
                    self.assertEqual(overlap(rects[i], rects[j]), 0)


class Camera(unittest.TestCase):
    def test_the_path_is_continuous_except_through_a_chapter(self):
        for director in (None, 'broadcaster', 'terrace', 'trailer'):
            ed, plan, f = shared(director)
            cam = f.cam
            worst = max(d for _, d in cam.jumps())
            # a whip or a long glide is fast but eased; a jump is more than a third of the screen in one frame
            self.assertLess(worst, 640, f'{director}: the camera jumps {worst:.0f} px in a frame')
            # the board only changes where a chapter (or a shot off the board) begins
            prev = cam.pose(0.0)
            T, end = 0.0, plan['duration'] - 0.05
            starts = {round(p['start'], 3): p for p in cam.shots}
            while T < end:
                T += 1 / FPS
                p = cam.pose(T)
                if p.board != prev.board and p.board >= 0 and prev.board >= 0:
                    near = [s for s in cam.shots if abs(s['start'] - T) < 1.5 / FPS]
                    self.assertTrue(near, f'{director}: a board change at {T:.2f}s that is not a shot boundary')
                    kind = next(x for x in plan['shots'] if x['n'] == near[0]['n'])['visual']['type']
                    self.assertEqual(kind, 'chapter')
                prev = p

    def test_every_held_frame_still_moves(self):
        ed, plan, f = shared()
        cam = f.cam
        for s in cam.shots:
            if s['engine'] != 'vox':
                continue
            a, b = cam.pose(s['start'] + s['dur'] * 0.5), cam.pose(s['start'] + s['dur'] * 0.5 + 1.5)
            if b.board == a.board:
                self.assertGreater(abs(a.cx - b.cx) + abs(a.cy - b.cy) + abs(a.z - b.z) * 1000, 0.5)

    def test_directors_move_differently(self):
        st = {d: C.style_of(d) for d in ('broadcaster', 'terrace', 'trailer')}
        self.assertLess(st['broadcaster']['glide'], st['terrace']['glide'])
        self.assertLess(st['broadcaster']['count'], st['terrace']['count'])
        self.assertGreater(st['trailer']['bump'], st['broadcaster']['bump'])
        self.assertGreater(st['trailer']['push'], st['terrace']['push'])
        self.assertTrue(st['terrace']['warm'])
        self.assertGreater(st['terrace']['people'], st['broadcaster']['people'])


class Numbers(unittest.TestCase):
    def panel_of(self, kind, director=None):
        ed, plan, f = shared(director)
        s = next(s for s in plan['shots'] if s['visual']['type'] == kind)
        return ed, s, f.panel(s['n'])

    def test_record_counters_land_on_the_summary(self):
        from studio.cinema.shots import summary_for
        ed, s, P = self.panel_of('record')
        data = summary_for(ed.ledger, 'Test League')
        ods = {e.name: e for e in P.els if isinstance(e, E.Odometer)}
        for lab, key in (('WON', 'won'), ('DRAWN', 'drawn'), ('LOST', 'lost'), ('FOR', 'for'), ('AGAINST', 'against')):
            self.assertEqual(ods[lab].shown(P.dur), data[key], lab)
            self.assertEqual(P.targets[f'count_{lab}_value'], data[key])
            self.assertLess(ods[lab].shown(ods[lab].t0 + 0.05), data[key] + 1e-9)

    def test_the_score_flips_to_the_claim(self):
        ed, s, P = self.panel_of('score')
        f = ed.by[s['visual']['claim']]['fact']
        flips = {e.name: e for e in P.els if isinstance(e, E.Flip)}
        self.assertEqual(flips['home'].final, str(f['score_home']))
        self.assertEqual(flips['away'].final, str(f['score_away']))
        self.assertEqual([v for _, v in flips['home'].steps], [str(f['score_home'])])
        self.assertEqual([v for _, v in flips['away'].steps], [str(f['score_away'])])
        self.assertEqual(P.targets['score_value'], f"{f['score_home']}–{f['score_away']}")

    def test_the_form_number_rides_the_line_up_and_down_and_lands_on_the_story(self):
        from studio.cinema.story import story_of
        ed, s, P = self.panel_of('race')
        st = story_of(ed.ledger)
        ys = [m['form'] for m in st['matches']]
        fol = next(e for e in P.els if isinstance(e, C.Follower))
        self.assertEqual(fol.el.shown(P.dur), ys[-1])
        seen = [round(fol.el.shown(fol.el.t0 + k * 0.05), 2) for k in range(int((fol.el.settle - fol.el.t0) / 0.05))]
        rises = any(b > a for a, b in zip(seen, seen[1:]))
        falls = any(b < a for a, b in zip(seen, seen[1:]))
        self.assertTrue(rises and falls, 'the season goes up and down, and so does its number')

    def test_streak_and_tally(self):
        ed, s, P = self.panel_of('run')
        self.assertEqual(P.targets['streak_value'], len(s['visual']['claims']))
        od = next(e for e in P.els if isinstance(e, E.Odometer) and e.name == 'streak')
        self.assertEqual(od.shown(P.dur), len(s['visual']['claims']))
        ed, s, P = self.panel_of('form')
        out = [ed.by[c]['fact']['outcome'] for c in s['visual']['claims']]
        for key, o in (('W', 'win'), ('D', 'draw'), ('L', 'loss')):
            self.assertEqual(P.targets[f'tally_{key}_value'], out.count(o))
            od = next(e for e in P.els if isinstance(e, E.Odometer) and e.name == key)
            self.assertAlmostEqual(od.shown(P.dur), out.count(o))

    def test_the_goal_clock_stops_on_the_minute(self):
        ed, s, P = self.panel_of('goal')
        f = ed.by[s['visual']['claim']]['fact']
        m = f['scorers'][s['visual']['scorer']]['minute']
        od = next(e for e in P.els if isinstance(e, E.Odometer) and e.name == 'minute')
        self.assertEqual(od.shown(P.dur), m)
        self.assertEqual(P.targets['minute_value'], m)

    def test_odometer_digits_carry_like_a_meter(self):
        od = E.Odometer(lambda t: 0, 0, 0, size=40, res=1.0, digits=2)
        im19, im20 = np.asarray(od._img(19.0)), np.asarray(od._img(20.0))
        self.assertFalse(np.array_equal(im19, im20))


class Annotations(unittest.TestCase):
    def test_the_pen_circles_the_score_and_points_at_the_scorers(self):
        ed, plan, f = shared()
        s = next(s for s in plan['shots'] if s['visual']['type'] == 'score' and ed.by[s['visual']['claim']]['fact'].get('scorers'))
        P = f.panel(s['n'])
        marks = {m.name: m for m in P.els if isinstance(m, E.Marker)}
        flips = [e for e in P.els if isinstance(e, E.Flip)]
        x0 = min(e.rect[0] for e in flips)
        x1 = max(e.rect[0] + e.rect[2] for e in flips)
        self.assertEqual(marks['score'].target, P.targets['score'])
        self.assertAlmostEqual(P.targets['score'][0], x0)
        self.assertAlmostEqual(P.targets['score'][0] + P.targets['score'][2], x1)
        # the loop surrounds the score: every corner of the score's box is inside the path's box
        bx = marks['score'].box
        sx, sy, sw, sh = P.targets['score']
        self.assertTrue(bx[0] < sx and bx[1] < sy and bx[2] > sx + sw and bx[3] > sy + sh)
        if 'scorers' in marks:
            tw = next(e for e in P.els if isinstance(e, E.Typewriter) and e.rect == P.targets['scorers'])
            self.assertTrue(all(n.upper() in tw.s for n in {g['name'] for g in ed.by[s['visual']['claim']]['fact']['scorers']}))
            # the arrow ends at the scorers' line
            ex, ey = marks['scorers'].path[-1]
            self.assertLess(abs(ey - tw.rect[1]), 80)

    def test_the_winner_is_highlighted(self):
        ed, plan, f = shared()
        s = next(s for s in plan['shots'] if s['visual']['type'] == 'score' and ed.by[s['visual']['claim']]['fact']['outcome'] != 'draw')
        fa = ed.by[s['visual']['claim']]['fact']
        P = f.panel(s['n'])
        hl = next(e for e in P.els if isinstance(e, E.Highlight))
        names = [e for e in P.els if isinstance(e, E.Words)]
        win = fa['home'] if fa['score_home'] > fa['score_away'] else fa['away']
        w = next(e for e in names if ' '.join(it['s'] for it in e.items) == win.upper())
        self.assertEqual(P.targets['winner'], w.rect)
        self.assertGreater(overlap(hl.rect, w.rect), 0.5 * w.rect[2] * w.rect[3])

    def test_the_highlighter_goes_over_the_headline_and_the_number(self):
        ed, plan, f = shared()
        s = next(s for s in plan['shots'] if s['visual']['type'] == 'fact')
        P = f.panel(s['n'])
        self.assertIn('key', P.targets)
        s = next(s for s in plan['shots'] if s['visual']['type'] == 'press')
        P = f.panel(s['n'])
        self.assertIn('headline', P.targets)
        idx = C._keywords([('Test', 0, 0, 1, 1), ('won', 2, 0, 1, 1), ('6', 4, 0, 1, 1), ('of', 6, 0, 1, 1), ('10', 8, 0, 1, 1)])
        self.assertEqual(idx[0], 2)

    def test_a_beat_naming_a_match_it_does_not_print_gets_its_scoreline_on_a_slip(self):
        ed, plan, f = shared()
        for s in plan['shots']:
            lower = (s.get('cinema') or {}).get('lower') or []
            if lower and f.where(s['n'])['engine'] == 'vox':
                P = f.panel(s['n'])
                self.assertEqual(P.targets.get('slip_match'), ed.by[lower[0]]['fact']['date'], s['visual']['type'])


class Picture(unittest.TestCase):
    def frames(self, f, plan, kinds, fracs=(0.35, 0.95)):
        out = []
        for s in plan['shots']:
            if s['visual']['type'] in kinds and f.where(s['n'])['engine'] == 'vox':
                cache = f.dressing(s['n'])
                for k in fracs:
                    out.append((s['visual']['type'], f.frame(s['n'], int(s['frames'] * k) - 1, cache)))
        return out

    def test_board_renders_with_scene_colours(self):
        ed, plan, f = shared()
        for kind, fr in self.frames(f, plan, {'score', 'versus', 'race', 'press', 'record', 'chapter', 'illustration'}):
            self.assertEqual(fr.shape, (1080, 1920, 3))
            self.assertEqual(fr.dtype, np.uint8, kind)

    def test_hapoel_film_uses_its_own_primary_colour(self):
        pal = Palette('hapoel-tel-aviv', 'Test FC', '#E30613', '#FFFBF2', ['yellow'])
        for director in (None, 'terrace'):
            ed, plan, f = film(scr=tc.script(director), pal=pal)
            self.assertEqual(ed.pal.accent, pal.primary)
            for kind, fr in self.frames(f, plan, {'score', 'goal', 'form', 'record', 'trailer', 'race'}, (0.15, 0.9)):
                self.assertEqual(fr.shape, (1080, 1920, 3), f'{director} {kind}')

    def test_the_warm_paper_is_never_yellow(self):
        from studio.vox.render import paper_safe
        a = np.array([[[214, 182, 120], [240, 226, 196], [120, 90, 60]]], 'float32')
        out = paper_safe(a)
        self.assertEqual(tc.banned_share(out.astype('uint8'), ['yellow']), 0.0)

    def test_the_highlighter_and_pen_are_never_a_rival_colour(self):
        for pal in (tc.PAL, Palette('x', 'X', '#1F3A5F', '#FFFBF2', ['red', 'green']),
                    Palette('y', 'Y', '#202020', '#FFFBF2', ['red', 'green', 'blue', 'yellow'])):
            ink = C.Ink(pal)
            from studio.common import is_banned_pixel
            self.assertFalse(is_banned_pixel(tuple(ink.hl), pal.bans))
            self.assertFalse(is_banned_pixel(tuple(ink.pen), pal.bans))
            self.assertFalse(is_banned_pixel(tuple(ink.accent), pal.bans))

    def test_captions_stay_burned_in(self):
        from studio.captions import Captions
        ed, plan, f = shared()
        s = next(s for s in plan['shots'] if s.get('words') and f.where(s['n'])['engine'] == 'vox')
        self.assertTrue(any(isinstance(g, Captions) for g in f.dressing(s['n'])['glass']))
        os.environ['STORIES_BURN_CAPTIONS'] = '0'
        try:
            self.assertFalse(any(isinstance(g, Captions) for g in f.dressing(s['n'])['glass']))
        finally:
            del os.environ['STORIES_BURN_CAPTIONS']

    def test_a_glide_is_drawn_with_both_beats_on_the_paper(self):
        ed, plan, f = shared()
        shots = [s for s in plan['shots'] if f.where(s['n'])['engine'] == 'vox']
        for a, b in zip(shots, shots[1:]):
            if f.cam.win[f.order.index(b['n'])]['same']:
                mid = f.frame(b['n'], 3, f.dressing(b['n']))
                self.assertGreater(float(mid.std()), 12)  # the board is there, not a blank
                break


class Sound(unittest.TestCase):
    def test_the_pen_and_the_ticks_sit_under_the_voice(self):
        rng = np.random.default_rng(1)
        t = np.arange(audio.SR * 3) / audio.SR
        voice = (np.sin(2 * np.pi * 180 * t) * 0.12).astype('float32')
        vdb = audio.speech_db(voice)
        for kind in ('pen', 'tick'):
            a = audio.level_fx(kind, audio.fx(kind, rng), vdb, rng)
            w = int(0.12 * audio.SR)
            loudest = max(audio._rms_db(a[i:i + w]) for i in range(0, max(1, len(a) - w + 1), w // 4))
            self.assertLess(loudest, vdb - 8, kind)

    def test_a_vox_beat_cues_whooshes_pens_ticks_and_paper(self):
        ed, plan, f = shared()
        kinds = set()
        for s in plan['shots']:
            if f.where(s['n'])['engine'] == 'vox':
                kinds |= {k for _, k in f.cues(s['n'])}
        self.assertTrue({'whoosh', 'pen', 'tick', 'paper'} <= kinds, kinds)


class Shorts(unittest.TestCase):
    def test_a_vox_short_reframes_tighter_and_fits_the_page(self):
        from studio import shorts
        src = (HERE / 'studio' / 'shorts.py').read_text()
        self.assertIn("crop=1440:1080", src)
        self.assertLessEqual(shorts.TIGHT_Y + shorts.TIGHT_H + 50 + 480, 1920)
        import tempfile
        p = Path(tempfile.mkdtemp()) / 'o.png'
        shorts.overlay('A very long hook that needs several lines to fit', 'Test FC · 2002/03', '#007A3D', p,
                       shorts.TIGHT_Y, shorts.TIGHT_H)
        from PIL import Image
        im = np.asarray(Image.open(p))
        # the picture window is clear
        self.assertEqual(int(im[shorts.TIGHT_Y + 200: shorts.TIGHT_Y + 600, 100:900, 3].max()), 0)


if __name__ == '__main__':
    unittest.main()

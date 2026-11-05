"""The thumbnail hook engine (studio/thumbs, docs/fanlife/68-thumbnail-hooks.md): every hook from the record, three
different hooks a film, words readable at YouTube's smallest size, no rival colour, and every category writes its files.
PIL only — no browser, no network."""
from __future__ import annotations

import copy
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import director, thumbs  # noqa: E402
from studio.common import Palette  # noqa: E402
from studio.script import claim_numbers, numbers_in_text  # noqa: E402
from studio.thumbs import art, compose, hooks  # noqa: E402
from studio.thumbs.render import Board, legibility, line  # noqa: E402
from studio.tests.test_director import ledger, match  # noqa: E402

PAL = Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#B02D10', '#FFFBF2', ['yellow'])
AEK = Palette('aek-athens', 'AEK Athens', '#F2C400', '#15130F', ['red', 'green'])
TMP: list[tempfile.TemporaryDirectory] = []


def tmpdir() -> Path:
    t = tempfile.TemporaryDirectory(prefix='thumbs-')
    TMP.append(t)
    return Path(t.name)


def tearDownModule():
    for t in TMP:
        t.cleanup()


def a_season() -> dict:
    """Eight wins, the run stopped by the rival, a cup final won on the night, the title."""
    import datetime as dt
    cl = []
    d0 = dt.date(2001, 8, 4)
    for k in range(8):
        cl.append(match(f'm{k + 1:02d}', (d0 + dt.timedelta(days=7 * k)).isoformat(), f'Club {k + 1}', 2, 0))
    cl.append(match('m09', (d0 + dt.timedelta(days=56)).isoformat(), 'Rovers United', 0, 3, side='away'))
    for k in range(10, 14):
        cl.append(match(f'm{k:02d}', (d0 + dt.timedelta(days=7 * k)).isoformat(), f'Club {k}', 1, 0))
    cl.append(match('m20', '2002-05-18', 'Ironbridge Athletic', 3, 1, comp='Test Cup', stage='Final',
                    scorers=[{'name': 'Avi Cohen', 'minute': 12}, {'name': 'Avi Cohen', 'minute': 50}, {'name': 'Dan Levi', 'minute': 77}]))
    cl.append({'id': 'honour-cup', 'type': 'honour', 'fact': {'kind': 'honour', 'season': '2001/02', 'club': 'Testers',
                                                              'competition': 'Test Cup', 'result': 'won'}, 'sources': [], 'confidence': 2})
    L = ledger(cl)
    director.attach(L)
    return L


def a_night() -> dict:
    L = ledger([match('m1', '2002-10-02', 'Real Madrid', 3, 3, comp='UEFA Champions League',
                      scorers=[{'name': 'Vasilis Tsiartas', 'minute': 6}, {'name': 'Christos Maladenis', 'minute': 25},
                               {'name': 'Demis Nikolaidis', 'minute': 28}])])
    director.attach(L)
    return L


def yellow_share(im: Image.Image) -> float:
    a = np.asarray(im.convert('RGB')).astype('float32') / 255
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return float(((h >= 38) & (h <= 70) & (sat >= 0.35) & (mx >= 0.35)).mean())


class Hooks(unittest.TestCase):
    def test_three_hooks_three_kinds_three_different_lines(self):
        hs = hooks.film_hooks(None, a_season())
        self.assertEqual([h['kind'] for h in hs], ['score', 'emotion', 'question'])
        self.assertEqual(len({h['headline'] for h in hs}), 3)
        for h in hs:
            self.assertLessEqual(len(h['headline'].split()), hooks.MAX_WORDS, h)

    def test_every_number_and_name_on_a_hook_is_in_the_claims_it_cites(self):
        for L in (a_season(), a_night()):
            for h in hooks.film_hooks(None, L):
                self.assertEqual(hooks.check_hook(h, L), [], h)
                allowed = claim_numbers(L, h['claims'] + ['story'])
                self.assertTrue(numbers_in_text(hooks.hook_text(h)) <= allowed, h)
                self.assertTrue(h['claims'], h)

    def test_the_score_is_the_strongest_moment_and_reads_from_the_club(self):
        L = a_season()
        st = L['story']
        h = hooks.film_hooks(None, L)[0]
        self.assertEqual(h['moment'], st['moments'][0]['id'])
        f = next(c['fact'] for c in L['claims'] if c['id'] == h['moment'])
        self.assertEqual(h['chip'], f"{f['club_goals']}–{f['opponent_goals']}")
        self.assertIn(f['opponent'].upper(), h['label'])

    def test_a_writer_concept_that_the_record_does_not_hold_is_dropped(self):
        L = a_season()
        script = {'thumbnails': [{'text': 'Twelve Years Waiting', 'claim': 'not-a-claim'},
                                 {'text': 'Ironbridge Humbled', 'claim': 'm01'},       # a club the cited claim does not name
                                 {'text': 'Cohen Twice', 'claim': 'm20'}]}
        hs = hooks.film_hooks(script, L)
        lines = [h['headline'] for h in hs]
        self.assertNotIn('TWELVE YEARS WAITING', lines)
        self.assertNotIn('IRONBRIDGE HUMBLED', lines)
        self.assertIn('COHEN TWICE', lines)        # the writer's own line, true to its claim, comes first for the emotion
        self.assertTrue(hooks.check_hook({'headline': 'TWELVE YEARS WAITING', 'claims': ['m01']}, L))
        self.assertTrue(hooks.check_hook({'headline': 'IRONBRIDGE HUMBLED', 'claims': ['m01']}, L))
        self.assertEqual(hooks.check_hook({'headline': 'IRONBRIDGE HUMBLED', 'claims': ['m20']}, L), [])

    def test_a_question_is_asked_only_when_the_record_holds_its_answer(self):
        qs = [q for q, *_ in hooks.questions(a_season()['story'], {c['id']: c for c in a_season()['claims']})]
        self.assertEqual(qs[0], 'WHO STOPPED THEM?')        # eight wins, then the rival
        L = ledger([match(f'm{k}', f'2001-09-{k + 1:02d}', f'Club {k}', 1, 1) for k in range(1, 6)])
        director.attach(L)
        qs = [q for q, *_ in hooks.questions(L['story'], {c['id']: c for c in L['claims']})]
        self.assertNotIn('WHO STOPPED THEM?', qs)
        self.assertNotIn('HOW DID THEY COME BACK?', qs)

    def test_a_season_line_counts_from_the_story(self):
        lines = {l for l, *_ in hooks.season_lines(a_season()['story'])}
        self.assertIn('CUP WINNERS', lines)
        self.assertIn('8 IN A ROW', lines)

    def test_a_night_on_its_own(self):
        hs = hooks.film_hooks(None, a_night())
        self.assertEqual(hs[0]['headline'], 'REAL MADRID HELD')
        self.assertEqual(hs[0]['chip'], '3–3')
        self.assertEqual(len({h['headline'] for h in hs}), len(hs))
        self.assertGreaterEqual(len(hs), 3)

    def test_vlog_hooks_come_from_the_fixture(self):
        ep = json.loads((HERE / 'matchday' / 'episodes' / '2023-09-21-zrinjski-az.json').read_text())
        hs = hooks.vlog_hooks(ep)
        self.assertEqual(hs[0]['chip'], '4–3')
        self.assertEqual(hs[0]['headline'], 'FROM 0–3 DOWN')   # read off the goal list: three down, four scored
        self.assertEqual(hs[-1]['headline'], 'WERE YOU THERE?')
        for h in hs:
            self.assertEqual(hooks.vlog_numbers_ok(h, ep), [], h)
        bad = dict(hs[0], headline='FROM 0–97 DOWN')
        self.assertTrue(hooks.vlog_numbers_ok(bad, ep))

    def test_classified_hooks_are_the_approved_scripts(self):
        ep = json.loads((HERE / 'comic' / 'episodes' / 'file01-the-bottle.json').read_text())
        hs = hooks.classified_hooks(ep)
        self.assertEqual([h['lines'] for h in hs], [th['hook'] for th in ep['package']['thumbnails']])


class Legibility(unittest.TestCase):
    def test_small_type_fails_and_big_type_passes(self):
        B = Board(1280, 720)
        im, m = line('THE TITLE NIGHT', 'head', 30, (255, 251, 242))
        B.paste(im, (40, 40), m, 'headline', 'small')
        self.assertFalse(legibility(B)['ok'])
        B = Board(1280, 720)
        im, m = line('THE TITLE NIGHT', 'head', 150, (255, 251, 242))
        B.paste(im, (40, 40), m, 'headline', 'big')
        self.assertTrue(legibility(B)['ok'])

    def test_low_contrast_fails(self):
        B = Board(1280, 720)
        B.im = Image.new('RGBA', (1280, 720), (120, 120, 120, 255))
        im, m = line('GREY ON GREY', 'head', 150, (135, 135, 135))
        B.paste(im, (40, 40), m, 'headline', 'grey')
        r = legibility(B)
        self.assertFalse(r['ok'])
        self.assertLess(r['lines'][0]['contrast'], 3)


class Films(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.L = a_season()
        cls.out = tmpdir()
        cls.rows = thumbs.for_film(None, cls.L, PAL, cls.out)

    def test_three_variants_and_a_shorts_cover(self):
        files = [r['file'] for r in self.rows]
        self.assertEqual(files, ['thumbnail-1.jpg', 'thumbnail-2.jpg', 'thumbnail-3.jpg', 'thumbnail-short.jpg'])
        for r in self.rows:
            with Image.open(self.out / r['file']) as im:
                self.assertEqual(list(im.size), r['size'])
        self.assertEqual(json.loads((self.out / 'thumbnails.json').read_text()), json.loads(json.dumps(self.rows)))

    def test_every_hook_reads_at_168_by_94(self):
        for r in self.rows[:3]:
            self.assertTrue(r['legibility']['ok'], (r['file'], r['legibility']))
            self.assertEqual(r['legibility']['size'], [168, 94])

    def test_the_three_pictures_differ(self):
        keys = [art.base_key(r['picture']['key']) for r in self.rows[:3]]
        self.assertEqual(len(set(keys)), 3)

    def test_no_yellow_on_hapoel(self):
        for r in self.rows:
            with Image.open(self.out / r['file']) as im:
                self.assertLess(yellow_share(im), 0.004, r['file'])

    def test_a_yellow_picture_is_scrubbed_for_a_club_that_bans_it(self):
        pic = art.Picture(Image.new('RGB', (1280, 720), (240, 200, 20)), 'test-yellow', 'house')
        h = hooks.film_hooks(None, self.L)[0]
        B = compose.documentary(h, pic, PAL, None)
        p = thumbs._save(B, tmpdir() / 't.jpg', PAL.bans)
        with Image.open(p) as im:
            self.assertLess(yellow_share(im), 0.004)
        # a club whose own colour is yellow keeps it
        B = compose.documentary(h, pic, AEK, None)
        p = thumbs._save(B, tmpdir() / 'a.jpg', AEK.bans)
        with Image.open(p) as im:
            self.assertGreater(yellow_share(im), 0.1)

    def test_directors_keep_their_flavour(self):
        out = tmpdir()
        for d in ('broadcaster', 'terrace', 'trailer'):
            rows = thumbs.for_film(None, self.L, PAL, out / d, director=d)
            self.assertEqual(rows[0]['director'], d)
            self.assertTrue(all(r['legibility']['ok'] for r in rows[:3]), (d, [r['legibility'] for r in rows]))
        with Image.open(out / 'trailer' / 'thumbnail-1.jpg') as im:   # the letterbox: ink bars top and bottom
            a = np.asarray(im.convert('L'))
            self.assertLess(a[:60].mean(), 40)
            self.assertLess(a[-60:].mean(), 40)

    def test_the_package_lists_the_thumbnails(self):
        from studio import package
        rows = package.thumbnails(None, self.L, PAL, tmpdir())
        self.assertEqual(len(rows), 4)
        for r in rows[:3]:
            self.assertIn(r['kind'], ('score', 'emotion', 'question'))
            self.assertTrue(r['claims'])


class Categories(unittest.TestCase):
    def test_classified_writes_its_files_in_the_case_folder_look(self):
        from comic.dummy import panel
        ep = json.loads((HERE / 'comic' / 'episodes' / 'file01-the-bottle.json').read_text())
        d = tmpdir()
        panels = {}
        for k, th in enumerate(ep['package']['thumbnails']):
            p = d / f"{th['panel']}.jpg"
            panel(1792, 1008, k).save(p)
            panels[th['panel']] = p
        out = d / 'out'
        out.mkdir()
        (out / 'youtube.json').write_text(json.dumps({'title': 't'}))
        made = thumbs.for_classified(ep, panels, 'LAUGH', '#1B9AD6', out)
        self.assertEqual([p.name for p in made], ['thumbnail-1.jpg', 'thumbnail-2.jpg', 'thumbnail-3.jpg'])
        self.assertTrue((out / 'thumbnail-short.jpg').exists())
        with Image.open(out / 'thumbnail-short.jpg') as im:
            self.assertEqual(im.size, (1080, 1920))
        rows = json.loads((out / 'thumbnails.json').read_text())
        self.assertTrue(all(r['legibility']['ok'] for r in rows if not r.get('shorts_cover')), rows)
        self.assertEqual(len(json.loads((out / 'youtube.json').read_text())['thumbnails']), 4)
        # a missing panel still gives a thumbnail (the folder on the desk)
        made = thumbs.for_classified(ep, {}, 'WAR', '#D71920', d / 'none')
        self.assertEqual(len(made), 3)

    def test_vlog_writes_its_files_and_keeps_the_names(self):
        ep = json.loads((HERE / 'matchday' / 'episodes' / '2023-04-26-aek-paok.json').read_text())
        d = tmpdir()
        frame = d / 'frame.jpg'
        rng = np.random.default_rng(1)
        Image.fromarray((rng.random((720, 1280, 3)) * 255).astype('uint8')).save(frame)
        rows = thumbs.for_vlog(ep, 'film', frame, d / 'out', bans=['red', 'green'])
        names = [r['file'] for r in rows]
        self.assertEqual(names, ['thumbnail.jpg', 'thumbnail-2.jpg', 'thumbnail-3.jpg', 'thumbnail-short.jpg'])
        self.assertEqual(rows[0]['chip'], '4–0')
        self.assertIn('GATE 21 ON FIRE', [r['headline'] for r in rows])
        self.assertTrue(all(r['legibility']['ok'] for r in rows[:3]), [r['legibility'] for r in rows])

    def test_a_thumbnail_hero_is_kept_for_thumbnails_and_never_animated(self):
        from studio.cinema import animate, library as L
        self.assertEqual(L.classify('thumb-hero-derby-kr')['cls'], 'thumb')
        pk = animate.Picker.__new__(animate.Picker)
        self.assertFalse(animate.Picker.ok(pk, {'stem': 'thumb-hero-derby-kr', 'cls': 'thumb', 'words': ['hero', 'derby']}, {}))


if __name__ == '__main__':
    unittest.main()

"""The media index (studio/media_index.py): one record per picture from what its own files say, one picker for a beat,
one ledger across films, and a report of what is missing. Everything here runs on a kit made in a temp folder — the
owner's art is not needed and no model is asked."""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from PIL import Image  # noqa: E402

from studio import media_index as MI  # noqa: E402

RED, GREEN, GREY = (200, 20, 30), (20, 150, 60), (120, 120, 120)


def make_kit(root: Path) -> Path:
    """common (any club) · reds-1999-00 (club `reds`) · greens-2001 (club `greens`, the rival)."""
    kit = root / 'kit'
    sets = {
        'common': (None, None, [
            ('terrace-full-kr', 'A full terrace of supporters with scarves', 'supporter', ['red'], RED, (1600, 900), {'accent': 'key-red'}),
            ('celebration-pile-kr', 'Players in a celebration pile after the goal', None, [], GREY, (1600, 900), {}),
            ('despair-kneeling-kr', 'A player kneeling in despair in the rain', None, [], GREY, (1600, 900), {}),
            ('last-minute-clock-n', 'The stadium clock in the last minute', 'tension', [], GREY, (1600, 900), {}),
            ('pitch-green-wide', 'A wide green pitch under floodlights', None, ['green'], GREEN, (1600, 900), {}),
            ('small-old-photo', 'An old photo on a desk', 'archive', [], GREY, (640, 360), {}),
            ('tall-flag-pole', 'A flag on a pole', None, [], GREY, (700, 1400), {}),
        ]),
        'reds-1999-00': ('reds', '1999/00', [
            ('trophy-lift', 'The captain lifts the trophy, confetti', 'celebration', ['red'], RED, (1600, 900), {}),
            ('shootout-wall', 'The keeper waits on his line in the penalty shootout', 'penalties', [], GREY, (1600, 900), {}),
        ]),
        'greens-2001': ('greens', '2001/02', [
            ('green-stand', 'The green stand in full voice, a crowd celebrating', 'celebration', ['green'], GREEN, (1600, 900), {}),
        ]),
    }
    for set_id, (club, season, pieces) in sets.items():
        d = kit / 'beats' / set_id
        d.mkdir(parents=True)
        rows = []
        for slug, desc, mood, fam, colour, size, more in pieces:
            Image.new('RGB', (64, 36), colour).save(d / f'{slug}.webp')
            rows.append({'key': f'beat:{set_id}/{slug}', 'description': desc, 'families': fam, 'size': list(size), 'sha256': slug,
                         'source': f'{slug}.jpg', **({'mood': mood} if mood else {}), **more})
        (d / 'index.json').write_text(json.dumps({'set': set_id, 'club': club, 'season': season, 'origin': 'owner-upload', 'pieces': rows}))
    for f in ('clips', 'cutouts', 'art', 'props'):
        (kit / f).mkdir()
    inv = root / 'inventory.json'
    inv.write_text(json.dumps({'files': [
        {'id': 'D1', 'path': '01_Stories/Celtic', 'name': 'Celtic_Park_1967_crowd.png', 'mime': 'image/png', 'bytes': 10},
        {'id': 'D2', 'path': '02_Studio', 'name': 'terrace-full-kr.jpg', 'mime': 'image/jpeg', 'bytes': 10},     # already in the kit
        {'id': 'D3', 'path': '02_Studio', 'name': 'notes.md', 'mime': 'text/markdown', 'bytes': 10},
        {'id': 'D4', 'path': '02_Studio/Motion', 'name': 'corner_flag.mp4', 'mime': 'video/mp4', 'bytes': 10}]}))
    return kit


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(tempfile.mkdtemp(prefix='mi-'))
        cls.kit = make_kit(cls.root)
        cls.keep = {k: os.environ.pop(k, None) for k in (MI.ENV_LEDGER, MI.ENV_DIR, 'STORIES_CINEMA_LIB')}
        cls.idx = MI.build(cls.root / 'idx', cls.kit, cls.root / 'inventory.json')
        cls.by = {r['id']: r for r in cls.idx['records']}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.root, ignore_errors=True)
        for k, v in cls.keep.items():
            if v is not None:
                os.environ[k] = v

    def picker(self, **kw):
        return MI.Picker(self.idx, kw.pop('club', 'reds'), **kw)


class Tagging(Base):
    def test_a_record_says_only_what_its_files_say(self):
        r = self.by['beat:reds-1999-00/trophy-lift']
        self.assertEqual((r['source'], r['kind'], r['clubs'], r['era'], r['rights']), ('kit', 'still', ['reds'], '1990s', 'owner-made'))
        self.assertIn('trophy', r['subjects'])
        self.assertIn('joy', r['moods'])                               # the kit's own mood word `celebration`
        self.assertEqual((r['size'], r['orientation']), ([1600, 900], 'landscape'))
        self.assertTrue(r['colours'] and r['colours'][0].startswith('#C'))   # a red tile, read off the file
        c = self.by['beat:common/terrace-full-kr']
        self.assertEqual((c['clubs'], c['era']), ([], None))           # any club; no year written anywhere → no decade claimed
        self.assertEqual(self.by['beat:common/tall-flag-pole']['orientation'], 'portrait')
        self.assertIn('grief', self.by['beat:common/despair-kneeling-kr']['moods'])
        self.assertIn('tension', self.by['beat:common/last-minute-clock-n']['moods'])

    def test_drive_files_are_listed_not_guessed(self):
        d = self.by['drive:D1']
        self.assertEqual((d['source'], d['path'], d['size'], d['colours'], d['rights']), ('drive', None, None, [], 'needs-check'))
        self.assertEqual((d['clubs'], d['era']), (['celtic'], '1960s'))
        self.assertIn('crowd', d['subjects'])
        self.assertTrue(self.by['drive:D2'].get('in_kit'))             # the same file is already a kit piece
        self.assertNotIn('drive:D3', self.by)                          # a note is not a picture
        self.assertEqual(self.by['drive:D4']['kind'], 'clip')
        self.assertTrue(all(r.get('wanted') for r in self.idx['records'] if r['source'] == 'flow'))   # the Flow spec: listed, not on disk

    def test_the_saved_index_is_reused_until_a_source_changes(self):
        dest = self.root / 'idx2'
        a = MI.build(dest, self.kit, self.root / 'inventory.json')
        MI._MEMO.clear()
        calls = []
        keep, MI.dominant = MI.dominant, lambda p, n=3: (calls.append(p), keep(p, n))[1]
        try:
            b = MI.build(dest, self.kit, self.root / 'inventory.json')
            self.assertEqual((a['fingerprint'], calls), (b['fingerprint'], []))          # nothing opened
            p = self.kit / 'beats' / 'common' / 'index.json'
            j = json.loads(p.read_text())
            Image.new('RGB', (64, 36), GREY).save(p.parent / 'new-street-lamp.webp')
            j['pieces'].append({'key': 'beat:common/new-street-lamp', 'description': 'A street lamp', 'families': [], 'size': [1600, 900], 'sha256': 'n'})
            p.write_text(json.dumps(j))
            c = MI.build(dest, self.kit, self.root / 'inventory.json')
            self.assertNotEqual(c['fingerprint'], a['fingerprint'])
            self.assertEqual([x.stem for x in calls], ['new-street-lamp'])               # only the new piece was measured
        finally:
            MI.dominant = keep
            j['pieces'].pop()
            p.write_text(json.dumps(j))
            (p.parent / 'new-street-lamp.webp').unlink()
            MI._MEMO.clear()


class Picking(Base):
    def test_subject_mood_and_club_decide(self):
        pk = self.picker(era='1990s')
        joy = pk.pick({'n': 1, 'subjects': ['trophy'], 'said': ['trophy'], 'moods': ['joy']})
        self.assertEqual(joy['id'], 'beat:reds-1999-00/trophy-lift')
        self.assertEqual(pk.pick({'n': 2, 'subjects': ['despair'], 'moods': ['grief']})['id'], 'beat:common/despair-kneeling-kr')
        self.assertEqual(pk.pick({'n': 3, 'subjects': ['clock'], 'said': ['clock'], 'moods': ['tension']})['id'], 'beat:common/last-minute-clock-n')
        s_own, why = pk.score(self.by['beat:reds-1999-00/shootout-wall'], {'subjects': ['keeper'], 'moods': ['tension']})
        self.assertTrue({'club', 'era', 'subject:keeper', 'mood:tension'} <= set(why))
        self.assertEqual(s_own, MI.W_CLUB + MI.W_ERA + MI.W_SUBJECT + MI.W_MOOD)

    def test_a_rival_is_refused_by_club_and_by_colour(self):
        pk = self.picker(bans=['green'])
        self.assertEqual(pk.refused(self.by['beat:greens-2001/green-stand']), 'another club\'s art')
        self.assertEqual(pk.refused(self.by['beat:common/pitch-green-wide']), 'a rival\'s colour')
        got = {pk.pick({'n': n, 'subjects': ['stand', 'crowd', 'celebration', 'stadium'], 'moods': ['joy']})['id'] for n in range(6)}
        self.assertFalse(got & {'beat:greens-2001/green-stand', 'beat:common/pitch-green-wide'})
        # a piece in the signal red is repainted in the club's colour: it is not "red" to a club that bans red
        self.assertIsNone(self.picker(club='greens', bans=['red']).refused(self.by['beat:common/terrace-full-kr']))
        self.assertEqual(self.picker(club='greens', bans=['red']).refused(self.by['beat:reds-1999-00/trophy-lift']), 'another club\'s art')
        self.assertIsNone(self.picker(bans=[]).refused(self.by['beat:common/pitch-green-wide']))   # no ban passed → scenery stays
        self.assertEqual(pk.refused(self.by['drive:D1']), 'not on this machine')

    def test_fit_for_the_frame(self):
        pk = self.picker()
        small, _ = pk.score(self.by['beat:common/small-old-photo'], {})
        tall, why = pk.score(self.by['beat:common/tall-flag-pole'], {})
        self.assertEqual((small, tall), (-MI.W_TECH, -MI.W_TECH * 1.5))   # too small; too small AND upright
        self.assertIn('portrait', why)

    def test_freshness_inside_a_film_and_across_films(self):
        led = MI.Ledger(self.root / 'ledger.json')
        for film in ('f1', 'f2'):
            led.record(film, [{'asset': 'beat:common/celebration-pile-kr', 'shot': 1, 't': 3.0}], 'reds')
        q = {'subjects': ['celebration'], 'moods': ['joy']}
        base, _ = self.picker().score(self.by['beat:common/celebration-pile-kr'], q)
        pk = self.picker(film='f3', ledger=MI.Ledger(self.root / 'ledger.json'))
        seen, why = pk.score(self.by['beat:common/celebration-pile-kr'], q)
        self.assertAlmostEqual(base - seen, 2 * MI.W_RECENT)
        self.assertIn('in 2 of the last 5 films', why)
        first = pk.pick({**q, 'n': 1})
        again, _ = pk.score(first, q)
        self.assertLess(again, pk.score(first, q)[0] + MI.W_USED)       # marked down once it is in this film
        pk.use(first['id'], 2)
        self.assertEqual(pk.refused(first), 'already on 2 shots of this film')
        self.assertNotIn(first['id'], [r['id'] for _, r, _ in pk.ranked({**q, 'n': 3})])
        uses = pk.close()
        self.assertEqual([f['film'] for f in MI.Ledger(self.root / 'ledger.json').films], ['f1', 'f2', 'f3'])
        self.assertEqual(len(uses), 2)
        pk2 = self.picker(film='f3', ledger=MI.Ledger(self.root / 'ledger.json'))
        self.assertNotIn(first['id'], pk2.recent if first['id'] != 'beat:common/celebration-pile-kr' else {})   # a film never counts itself

    def test_the_same_film_picks_the_same_and_another_film_may_differ(self):
        q = [{'n': n, 'subjects': [], 'moods': []} for n in range(5)]
        a, b, c = ([pk.pick(x)['id'] for x in q] for pk in (self.picker(film='A'), self.picker(film='A'), self.picker(film='B')))
        self.assertEqual(a, b)
        self.assertNotEqual(a, c)

    def test_a_shot_asks_from_its_type_its_words_and_its_emotion(self):
        q = MI.beat_query({'n': 4, 'visual': {'type': 'matchday'}, 'narration': 'The keeper walks to the spot under the scoreboard clock.'}, 'dread', '1990s')
        self.assertEqual(q['moods'], ['tension'])
        self.assertTrue({'keeper', 'clock'} <= set(q['said']))
        self.assertEqual(q['subjects'][:len(q['said'])], q['said'])     # what the line names leads what the type suggests
        self.assertIn('stand', q['subjects'])

    def test_the_old_pickers_take_the_fresh_ones_when_a_ledger_is_kept(self):
        keys = ['beat:common/a', 'beat:common/b', 'beat:common/c']
        self.assertEqual(MI.freshest(keys), keys)                       # no ledger on the machine: unchanged
        path = self.root / 'ledger-old.json'
        MI.Ledger(path).record('f1', [{'asset': 'beat:common/a', 'shot': 0}])
        os.environ[MI.ENV_LEDGER] = str(path)
        try:
            self.assertEqual(MI.freshest(keys), ['beat:common/b', 'beat:common/c'])
        finally:
            os.environ.pop(MI.ENV_LEDGER)


class Report(Base):
    def test_coverage_gaps_and_overuse_are_said_in_words(self):
        led = MI.Ledger(self.root / 'ledger-r.json')
        led.record('f1', [{'asset': 'beat:common/terrace-full-kr', 'shot': 1}, {'asset': 'beat:common/terrace-full-kr', 'shot': 4}])
        led.record('f2', [{'asset': 'beat:common/terrace-full-kr', 'shot': 2}])
        cov = MI.coverage(self.idx, 'reds')
        self.assertEqual((cov['own'], cov['own_moods'].get('joy'), cov['own_moods'].get('grief')), (2, 1, None))
        g = MI.gaps(cov)
        self.assertIn('no grief picture of its own for reds (1 any-club ones stand in)', g)
        self.assertTrue(any(x.startswith('no pyro picture of its own for reds — none shared either') for x in g))
        text = MI.report(self.idx, led)
        self.assertIn('beat:common/terrace-full-kr — 2 films, 3 shots', text)
        self.assertIn('greens — ', text)
        self.assertIn('listed only', text)


if __name__ == '__main__':
    unittest.main()

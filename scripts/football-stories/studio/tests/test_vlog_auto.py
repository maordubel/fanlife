"""I WAS THERE — the automatic episode (matchday/vlog_auto.py): the schema film.py reads, the fact guard, the speech
rule and the writer's loop, with a fake writer and a fake scout (no network, no footage)."""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from matchday import vlog_auto as V

EPISODES = Path(V.__file__).resolve().parent / 'episodes'
MATCH_ID = 'aek-athens:m-test'
CLAIM = {'id': MATCH_ID, 'type': 'match', 'fact': {
    'kind': 'match', 'date': '2023-04-26', 'competition': 'Super League play-offs', 'stage': None, 'club': 'AEK Athens',
    'opponent': 'PAOK', 'side': 'home', 'home': 'AEK Athens', 'away': 'PAOK', 'score_home': 4, 'score_away': 0, 'club_goals': 4,
    'opponent_goals': 0, 'outcome': 'win', 'venue': None, 'scorers': None},
    'sources': [{'id': 's1', 'title': 'ΑΕΚ 4-0 ΠΑΟΚ — AEKdata', 'url': 'https://aekdata.gr/agonas/3690-aek-paok-4-0'}], 'confidence': 2}
MATCH = {'id': MATCH_ID, 'date': '2023-04-26', 'season': '2022/23', 'competition': 'Super League play-offs', 'stage': None,
         'home': 'AEK Athens', 'away': 'PAOK', 'score': '4–0', 'scorers': False, 'side': 'home', 'facts': [CLAIM]}
CLUB = {'id': 'aek-athens', 'name': 'AEK Athens', 'accent': '#F3C613'}

CLIPS = {'IMG_1.MOV': ('2023-04-26T21:19:29+0300', 20.7, []),
         'IMG_2.MOV': ('2023-04-26T21:24:26+0300', 20.5, [{'start': 3.0, 'end': 5.0, 'text': 'hey come here', 'p_speech': 0.9, 'lang': 'en'}]),
         'IMG_3.MP4': ('2023-04-26T19:58:42Z', 9.0, [])}          # UTC only: read in the folder's own offset (+03:00)
PHOTOS = {'IMG_9.HEIC': '2023:04:26 21:25:11+03:00'}


def fake_material(root: Path, photos_only: bool = False) -> tuple[Path, Path]:
    """A footage folder of empty files and a work dir holding the survey and scout answers already (the cache)."""
    foot = root / 'aek-paok-test'
    work = root / 'work'
    foot.mkdir(parents=True)
    clips = {} if photos_only else CLIPS
    for f in list(clips) + list(PHOTOS):
        (foot / f).write_bytes(b'')
    inv = {'clips': [{'file': f, 'duration': d, 'serves': 'tall', 'shot_on': t, 'matchday': '2023-04-26', 'audio': {'lufs': -15},
                      'face_frames': 0, 'scene_cuts': [], 'hdr': False} for f, (t, d, _) in clips.items()],
           'photos': [{'file': f, 'taken': t, 'width': 3024, 'height': 4032, 'still': None} for f, t in PHOTOS.items()],
           'unreadable': []}
    sc = {'clips': [{'clip': f, 'seconds': d, 'starts': None, 'strips': [], 'sound': {'curve': [-15.0] * int(d * 2), 'median': -15.0,
                                                                                       'peaks': [1.0]}, 'speech': sp}
                    for f, (_, d, sp) in clips.items()], 'speech_checked': True}
    (work / 'survey').mkdir(parents=True)
    (work / 'scout').mkdir(parents=True)
    (work / 'survey' / 'inventory.json').write_text(json.dumps(inv))
    (work / 'scout' / 'scout.json').write_text(json.dumps(sc))
    return foot, work


def answer(say_number: str = 'Four–nil.') -> dict:
    """What a good writer returns for the fake folder."""
    return {
        'title_line': 'Smoke over the stand', 'home_short': 'AEK', 'away_short': 'PAOK', 'ground': None, 'ground_evidence': None,
        'city': None, 'music': {'track': 'atlasaudio-sports', 'gain': 0.6}, 'ipa': {'PAOK': 'pɑːˈɒk'},
        'film': {'beats': [
            {'kind': 'clip', 'clip': 'IMG_1.MOV', 'in': 0.0, 'dur': 4.0, 'sound': 'clip', 'gain': 1.3, 'entry': 'black', 'level': 0.0},
            {'kind': 'title', 'clip': 'IMG_1.MOV', 'in': 5.0, 'dur': 4.6, 'head': 'I was there', 'kicker': 'AEK v PAOK', 'level': 1.0},
            {'kind': 'chapter', 'number': 1, 'title': 'The stand', 'dur': 2.4, 'level': 0.6},
            {'kind': 'clip', 'clip': 'IMG_2.MOV', 'in': 1.0, 'say': 'The smoke came down over the stand… and stayed.', 'level': 0.4},
            {'kind': 'clip', 'clip': 'IMG_1.MOV', 'in': 10.0, 'dur': 5.0, 'subscribe': True, 'level': 0.6},
            {'kind': 'art', 'photo': 'IMG_9.HEIC', 'push': [1.0, 1.1], 'min': 4.6, 'typed': {'lines': ['21:25'], 'at_t': 0.4, 'size': 52},
             'say': 'The board says so.', 'level': 0.5},
            {'kind': 'chapter', 'number': 2, 'title': 'Full time', 'dur': 2.4, 'level': 0.5},
            {'kind': 'clip', 'clip': 'IMG_3.MP4', 'in': 0.0, 'say': say_number, 'claims': [MATCH_ID], 'level': 0.6},
            {'kind': 'black', 'min': 5.0, 'typed': {'lines': ['AEK ATHENS 4–0 PAOK', '26 APRIL 2023'], 'at_t': 0.3, 'accent_line': 0},
             'say': 'The twenty-sixth of April, twenty twenty-three.', 'claims': [MATCH_ID], 'level': 0.5},
            {'kind': 'end', 'min': 5.0, 'level': 0.7, 'say': 'Were you there?'}],
            'thumbnail': {'at': 1.2, 'text': 'Smoke over the stand', 'sub': 'AEK 4–0 PAOK'},
            'description': 'AEK Athens against PAOK, 26 April 2023, from the stand.'},
        'reel': {'beats': [
            {'kind': 'hook', 'clip': 'IMG_1.MOV', 'in': 0.0, 'dur': 3.0, 'hook': 'Smoke.', 'accent_line': 'AEK 4–0 PAOK.', 'claims': [MATCH_ID]},
            {'kind': 'clip', 'clip': 'IMG_1.MOV', 'in': 4.0, 'say': 'The whole stand in smoke.'},
            {'kind': 'clip', 'clip': 'IMG_3.MP4', 'in': 0.5, 'say': 'Four–nil.', 'claims': [MATCH_ID]},
            {'kind': 'end', 'min': 4.4, 'say': 'Were you there?'}],
            'description': 'AEK 4–0 PAOK, 26 April 2023.', 'post': 'Smoke over the stand. AEK 4–0 PAOK.\n#AEK #IWasThere #FANLIFE'},
        'story_note': 'Phone footage of the stand; no footage of the goals.'}


def built(w: dict, root: Path) -> tuple[dict, dict, dict, Path]:
    foot, work = fake_material(root)
    mat = V.material(foot, work, lambda m: None)
    led = V.ledger_of(MATCH, CLUB, '')
    ep = V.assemble(w, MATCH, CLUB, led, foot, episode=5)
    V.normalise(ep, mat)
    return ep, led, mat, foot


class GoldSchemaTest(unittest.TestCase):
    def test_every_hand_made_episode_passes_the_schema(self):
        eps = sorted(EPISODES.glob('*.json'))
        self.assertEqual(len(eps), 4)
        for p in eps:
            with self.subTest(p.name):
                self.assertEqual(V.validate_episode(json.loads(p.read_text())), [])

    def test_the_planned_length_matches_the_measured_render(self):
        # Bloomfield was cut at 290.24 s (matchday-render report, 3.11.2026)
        ep = json.loads((EPISODES / '2024-05-11-hapoel-ashdod.json').read_text())
        self.assertLess(abs(V.estimate(ep) - 290.24) / 290.24, 0.03)


class BrokenSchemaTest(unittest.TestCase):
    def setUp(self):
        self.ep = json.loads((EPISODES / '2023-04-26-aek-paok.json').read_text())

    def errs(self, change) -> list[str]:
        e = copy.deepcopy(self.ep)
        change(e)
        return V.validate_episode(e)

    def test_rejects(self):
        cases = {
            'last beat must be kind "end"': lambda e: e['film']['beats'].pop(),
            'unknown kind': lambda e: e['film']['beats'][0].update(kind='montage'),
            'needs "clip"': lambda e: e['film']['beats'][0].pop('clip'),
            'needs "dur"': lambda e: e['film']['beats'][0].pop('dur'),
            'unknown keys': lambda e: e['film']['beats'][0].update(sya='typo'),
            'follows chapter': lambda e: e['film']['beats'][3].update(number=3),
            'not in the studio kit': lambda e: e['film']['beats'][5].update(art='beat:common/no-such-picture'),
            'fixture.date_iso is missing': lambda e: e['fixture'].pop('date_iso'),
            'speed must be': lambda e: e['film']['beats'][4].update(speed=0.1),
            'a cue is': lambda e: e['film']['beats'][9]['cues'].append([0.1, 'kazoo']),
            '"short" name': lambda e: e['sources'][0].pop('short'),
            'is not a track': lambda e: e['music'].update(track='no-such-track'),
        }
        for want, change in cases.items():
            with self.subTest(want):
                self.assertTrue(any(want in x for x in self.errs(change)), self.errs(change))

    def test_reconstructions_are_hand_made_only(self):
        errs = V.validate_episode(self.ep, auto=True)
        self.assertTrue(any('hand-made' in x for x in errs))

    def test_files_must_be_in_the_folder(self):
        with tempfile.TemporaryDirectory() as d:
            errs = V.validate_episode(self.ep, Path(d))
        self.assertTrue(any('is not in the footage folder' in x for x in errs))


class FactGuardTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_a_good_answer_passes_every_check(self):
        ep, led, mat, foot = built(answer(), self.root)
        self.assertEqual(V.fact_check(ep, led, mat), [])
        self.assertEqual(V.voice_check(ep), [])
        self.assertEqual(V.speech_check(ep, mat), [])
        self.assertEqual(V.validate_episode(ep, foot, auto=True, mat=mat), [])

    def test_a_number_no_cited_claim_carries_fails(self):
        w = answer('Thirty thousand inside. Four–nil.')
        ep, led, mat, _ = built(w, self.root)
        errs = V.fact_check(ep, led, mat)
        self.assertTrue(any('number 30000' in e for e in errs), errs)

    def test_the_score_needs_its_claim_cited(self):
        w = answer()
        w['film']['beats'][7].pop('claims')
        ep, led, mat, _ = built(w, self.root)
        self.assertTrue(any('number 4' in e for e in V.fact_check(ep, led, mat)))

    def test_the_camera_clock_is_a_source_and_only_its_own_times(self):
        w = answer()
        w['film']['beats'][5]['typed']['lines'] = ['21:40']          # no clip or still shows 21:40
        ep, led, mat, _ = built(w, self.root)
        self.assertTrue(any('21:40 is not on the camera' in e for e in V.fact_check(ep, led, mat)))
        claim = copy.deepcopy(CLAIM)
        claim['fact']['kickoff'] = '21:40'
        led2 = V.ledger_of(dict(MATCH, facts=[claim]), CLUB, '')
        w['film']['beats'][5]['claims'] = [MATCH_ID]
        ep2 = V.assemble(w, MATCH, CLUB, led2, Path(self.tmp.name) / 'aek-paok-test', episode=5)
        self.assertEqual(V.fact_check(ep2, led2, mat), [])

    def test_owner_notes_are_a_claim_the_beat_can_cite(self):
        w = answer()
        w['film']['beats'][3].update(say='Gate 21 sang… and the smoke came down.', claims=['owner'])
        foot, work = fake_material(self.root)
        mat = V.material(foot, work, lambda m: None)
        led = V.ledger_of(MATCH, CLUB, 'We stood behind the goal at Gate 21.')
        ep = V.assemble(w, MATCH, CLUB, led, foot, episode=5)
        self.assertEqual(V.fact_check(ep, led, mat), [])
        led_without = V.ledger_of(MATCH, CLUB, '')
        self.assertTrue(any('cites "owner"' in e for e in V.fact_check(ep, led_without, mat)))

    def test_the_narrator_is_never_i(self):
        w = answer()
        w['film']['beats'][3]['say'] = 'I remember the smoke.'
        ep, *_ = built(w, self.root)
        self.assertTrue(V.voice_check(ep))


class MeasurementTest(unittest.TestCase):
    def test_a_utc_stamp_reads_in_the_folders_own_offset(self):
        with tempfile.TemporaryDirectory() as d:
            foot, work = fake_material(Path(d))
            mat = V.material(foot, work, lambda m: None)
        self.assertEqual(mat['clips']['IMG_3.MP4']['clock'], '22:58:42')
        self.assertEqual(mat['clips']['IMG_1.MOV']['clock'], '21:19:29')
        self.assertEqual(mat['photos']['IMG_9.HEIC']['clock'], '21:25:11')
        self.assertIsNone(V.clock_of('2023-04-26T19:58:42Z'))

    def test_the_record_and_the_camera_fill_what_the_writer_does_not(self):
        with tempfile.TemporaryDirectory() as d:
            w = answer()
            w['film']['beats'][0]['clock'] = '09:99'        # the writer's clock is never kept
            ep, led, mat, _ = built(w, Path(d))
        b = ep['film']['beats']
        self.assertEqual(b[0]['clock'], '21:19')
        self.assertEqual(b[1]['clock'], '21:19')
        self.assertEqual(ep['fixture']['home_score'], 4)
        self.assertEqual(ep['fixture']['date_short'], '26·4·2023')
        self.assertEqual(ep['fixture']['goals'], [])            # the record names no scorers: none on screen
        self.assertEqual(ep['sources'][0]['short'], 'AEKdata')
        self.assertEqual(ep['id'], 'iwt-05-aek-paok-2023')
        self.assertEqual(ep['folder'], 'aek-paok-test')

    def test_a_clip_with_a_voice_is_muted(self):
        with tempfile.TemporaryDirectory() as d:
            ep, led, mat, _ = built(answer(), Path(d))
        b = ep['film']['beats'][3]
        self.assertEqual(b['sound'], 'mute')
        self.assertNotIn('crowd_ok', b)
        self.assertTrue(ep['film']['beats'][0].get('crowd_ok'))
        b['sound'] = 'clip'
        self.assertTrue(V.speech_check(ep, mat))

    def test_a_beat_cannot_outrun_its_clip(self):
        with tempfile.TemporaryDirectory() as d:
            w = answer()
            w['film']['beats'][0].update(clip='IMG_3.MP4', **{'in': 7.0}, dur=6.0)        # silent: shortened to fit
            w['film']['beats'][3].update(clip='IMG_3.MP4', **{'in': 8.0})                  # spoken: sent back
            ep, led, mat, foot = built(w, Path(d))
            errs = V.validate_episode(ep, foot, auto=True, mat=mat)
        self.assertLess(ep['film']['beats'][0]['dur'], 6.0)
        self.assertTrue(any('film beat 3' in e and 'the beat needs' in e for e in errs), errs)
        self.assertFalse(any('film beat 0' in e for e in errs), errs)

    def test_a_number_a_claim_carries_is_cited_for_the_writer(self):
        with tempfile.TemporaryDirectory() as d:
            w = answer()
            w['film']['beats'][7].pop('claims')
            foot, work = fake_material(Path(d))
            mat = V.material(foot, work, lambda m: None)
            led = V.ledger_of(MATCH, CLUB, '')
            ep = V.assemble(w, MATCH, CLUB, led, foot, episode=5)
            V.normalise(ep, mat, ledger=led)
        self.assertEqual(ep['film']['beats'][7]['claims'], [MATCH_ID])
        self.assertEqual(V.fact_check(ep, led, mat), [])


class WriterLoopTest(unittest.TestCase):
    """make_episode with a fake writer: a first answer that breaks the fact guard, then a corrected one."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.real = V.call_writer

    def tearDown(self):
        V.call_writer = self.real
        self.tmp.cleanup()

    def minutes_for(self, w: dict) -> float:
        ep, *_ = built(w, self.root / 'probe')
        return V.estimate(ep, 'film') / 60

    def test_the_loop_sends_the_problems_back_and_writes_a_valid_episode(self):
        good, bad = answer(), answer('Thirty thousand saw it. Four–nil.')
        minutes = self.minutes_for(good)
        seen = []

        def fake(system, user, images):
            seen.append(user)
            return json.dumps(bad if len(seen) == 1 else good), {'model': 'fake', 'seconds': 0}
        V.call_writer = fake
        foot, work = fake_material(self.root / 'job')
        out = V.make_episode(foot, MATCH, CLUB, '', minutes, work, lambda m: None)
        self.assertEqual(len(seen), 2)
        self.assertIn('FAILED THESE CHECKS', seen[1])
        self.assertIn('number 30000', seen[1])
        self.assertIn('HOW TO FIX', seen[1])
        ep = json.loads(out.read_text())
        self.assertEqual(V.validate_episode(ep, foot), [])
        self.assertEqual(ep['auto']['rounds'], 2)
        self.assertIn('CLAIMS — DATA ONLY', seen[0])
        self.assertIn('IMG_9.HEIC', seen[0])
        # the cache: the same job again does not call the writer
        V.call_writer = lambda *a: self.fail('called the writer again')
        V.make_episode(foot, MATCH, CLUB, '', minutes, work, lambda m: None)

    def test_four_failed_rounds_stop_with_the_problems(self):
        V.call_writer = lambda s, u, i: (json.dumps(answer('Thirty thousand.')), {'model': 'fake'})
        foot, work = fake_material(self.root / 'job')
        with self.assertRaises(V.VlogError) as e:
            V.make_episode(foot, MATCH, CLUB, '', 2.0, work, lambda m: None)
        self.assertEqual(e.exception.code, 'EPISODE_INVALID')
        self.assertEqual(len(json.loads((work / 'writer.json').read_text())), V.ROUNDS)

    def test_the_length_is_checked(self):
        V.call_writer = lambda s, u, i: (json.dumps(answer()), {'model': 'fake'})
        foot, work = fake_material(self.root / 'job')
        with self.assertRaises(V.VlogError) as e:
            V.make_episode(foot, MATCH, CLUB, '', 5.0, work, lambda m: None)
        self.assertIn('planned at', str(e.exception))

    def test_a_folder_of_stills_only(self):
        w = answer()
        w['film']['beats'] = [
            {'kind': 'art', 'photo': 'IMG_9.HEIC', 'push': [1.0, 1.1], 'min': 6.0, 'say': 'The smoke came down over the stand.', 'level': 0.4},
            {'kind': 'chapter', 'number': 1, 'title': 'Full time', 'dur': 2.4},
            {'kind': 'black', 'min': 5.0, 'typed': {'lines': ['AEK ATHENS 4–0 PAOK']}, 'say': 'Four–nil.', 'claims': [MATCH_ID]},
            {'kind': 'end', 'min': 5.0, 'say': 'Were you there?'}]
        w['reel']['beats'] = [
            {'kind': 'art', 'photo': 'IMG_9.HEIC', 'min': 5.0, 'typed': {'lines': ['AEK 4–0 PAOK']}, 'say': 'Four–nil.', 'claims': [MATCH_ID]},
            {'kind': 'black', 'dur': 4.0, 'typed': {'lines': ['THE STAND']}},
            {'kind': 'end', 'min': 4.4, 'say': 'Were you there?'}]
        foot, work = fake_material(self.root / 'stills', photos_only=True)
        mat = V.material(foot, work, lambda m: None)
        led = V.ledger_of(MATCH, CLUB, '')
        ep = V.assemble(w, MATCH, CLUB, led, foot, episode=5)
        minutes = V.estimate(ep, 'film') / 60
        V.call_writer = lambda s, u, i: (json.dumps(w), {'model': 'fake'})
        out = V.make_episode(foot, MATCH, CLUB, '', minutes, work, lambda m: None)
        self.assertEqual(json.loads(out.read_text())['film']['beats'][0]['photo'], 'IMG_9.HEIC')


if __name__ == '__main__':
    unittest.main()

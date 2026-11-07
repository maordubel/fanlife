"""The studio desk (4.11.2026): the directors' pitch rotation (fakes for the director's brain and the writer), the
worker's dispatch by job kind, CLASSIFIED's recorded approval, and the package shape the studio reads. No network."""
from __future__ import annotations

import json
import sys
import tempfile
import threading
import unittest
from http.server import HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import kinds, pitch, worker  # noqa: E402
from studio.common import StageError  # noqa: E402
from studio.directors import DIRECTORS  # noqa: E402
from studio.tests.test_studio import FakeStudio  # noqa: E402


def cand(club, kind='match', season='2002/03', ids=None, opponent=None):
    return {'club_id': club, 'club_name': club.title(), 'kind': kind, 'season': season, 'match_ids': ids or [f'{club}:{season}:m'],
            'opponent': opponent, 'story': 's', 'why': 'w'}


CANDS = [cand('aek-athens'), cand('aek-athens', 'season', ids=[]), cand('celtic'), cand('olympiacos'), cand('st-pauli'),
         cand('celtic', 'rivalry', '1990–2020', ids=[], opponent='Rangers')]


def writer_first(log_seen=None):
    def write(d, offered, cache_dir, log):
        if log_seen is not None:
            log_seen.append((d['id'], [c['club_id'] for c in offered]))
        c = offered[0]
        return {**c, 'title': f"{d['name']} on {c['club_id']}", 'logline': 'l', 'cold_open': 'c', 'acts': ['a', 'b', 'c']}
    return write


class PitchRotation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def run_round(self, history=None, cands=CANDS, write=None):
        return pitch.round_of(['aek-athens', 'celtic', 'olympiacos', 'st-pauli'], history or {'pitched': [], 'films': []},
                              Path(self.tmp.name), lambda m: None, candidates=lambda ids: cands, write_pitch=write or writer_first())

    def test_three_directors_three_clubs_three_events(self):
        out = self.run_round()
        self.assertEqual(out['status']['state'], 'done')
        self.assertEqual([p['director'] for p in out['pitches']], [d['id'] for d in DIRECTORS])
        self.assertEqual(len({p['club_id'] for p in out['pitches']}), 3)
        self.assertEqual(len({pitch.event_key(p) for p in out['pitches']}), 3)

    def test_nothing_filmed_or_pitched_recently_comes_back(self):
        hist = {'pitched': [{'director': 'trailer', 'club_id': 'aek-athens', 'event': pitch.event_key(CANDS[0]), 'date': '2026-11-03'}],
                'films': [{'club_id': 'celtic', 'event': pitch.event_key(CANDS[2]), 'match_ids': CANDS[2]['match_ids']}]}
        out = self.run_round(hist)
        keys = {pitch.event_key(p) for p in out['pitches']}
        self.assertNotIn(pitch.event_key(CANDS[0]), keys)
        self.assertNotIn(pitch.event_key(CANDS[2]), keys)

    def test_a_director_rotates_to_clubs_he_has_not_pitched(self):
        seen = []
        hist = {'pitched': [{'director': 'broadcaster', 'club_id': 'aek-athens', 'event': 'aek-athens|tie|x', 'date': '2026-11-03'}], 'films': []}
        self.run_round(hist, write=writer_first(seen))
        broadcaster = dict(seen)['broadcaster']
        self.assertNotEqual(broadcaster[0], 'aek-athens')
        self.assertLessEqual(max(broadcaster.count(c) for c in set(broadcaster)), 2)

    def test_a_spent_writer_stops_the_round_and_says_when(self):
        calls = []

        def write(d, offered, cache, log):
            calls.append(d['id'])
            if len(calls) == 2:
                raise StageError('WRITER_QUOTA_DAY', 'spent')
            return writer_first()(d, offered, cache, log)
        out = self.run_round(write=write)
        self.assertEqual(out['status']['state'], 'waiting')
        self.assertTrue(out['status']['retryAt'].endswith('Z'))
        self.assertEqual(len(out['pitches']), 1)

    def test_a_pitch_outside_the_shortlist_is_refused(self):
        out = self.run_round(write=lambda d, o, c, l: {**cand('panathinaikos'), 'title': 't', 'logline': 'l', 'acts': ['a']})
        self.assertEqual(out['pitches'], [])
        self.assertEqual(out['status']['state'], 'failed')

    def test_event_key_is_the_studio_s(self):
        self.assertEqual(pitch.event_key({'club_id': 'c', 'kind': 'tie', 'match_ids': ['b', 'a']}), 'c|tie|a,b')
        self.assertEqual(pitch.event_key({'club_id': 'c', 'kind': 'rivalry', 'opponent': 'Rangers'}), 'c|rivalry|rangers')
        self.assertEqual(pitch.event_key({'club_id': 'c', 'season': '2002/03'}), 'c|season|2002/03')

    def test_readable_clubs_come_from_the_catalog(self):
        ids = pitch.readable_clubs()
        self.assertIn('aek-athens', ids)


class WorkerDispatch(unittest.TestCase):
    def setUp(self):
        FakeStudio.state = {'calls': [], 'puts': {}, 'job': {'id': 'job-0000002', 'kind': 'classified', 'spec': {'file': 'file01'},
                                                            'palette': {'club_id': 'classified', 'club_name': 'CLASSIFIED', 'primary': '#15130F', 'bans': []},
                                                            'brief': {'club_id': 'classified', 'club_name': 'CLASSIFIED', 'season': 'FILE 01', 'duration': 5}}}
        self.srv = HTTPServer(('127.0.0.1', 0), FakeStudio)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.tmp = tempfile.TemporaryDirectory()
        self.st = worker.Studio(f'http://127.0.0.1:{self.srv.server_port}', 'x' * 40, 'test-worker')
        self.orig = (kinds.run_classified, kinds.run_vlog)

    def tearDown(self):
        kinds.run_classified, kinds.run_vlog = self.orig
        self.srv.shutdown()
        self.srv.server_close()
        self.tmp.cleanup()

    def test_each_kind_goes_to_its_own_maker(self):
        made = []
        kinds.run_classified = lambda st, job, jd, progress, log: made.append('classified') or {'state': 'ready', 'stage': 'done', 'artefacts': {}}
        kinds.run_vlog = lambda st, job, jd, progress, log: made.append('vlog') or {'state': 'needs_review', 'stage': 'done', 'artefacts': {}}
        worker.run_once(self.st, Path(self.tmp.name), lambda m: None)
        self.assertEqual(FakeStudio.state['finish']['state'], 'ready')
        FakeStudio.state['job'] = {**FakeStudio.state['job'], 'kind': 'vlog'}
        worker.run_once(self.st, Path(self.tmp.name), lambda m: None)
        self.assertEqual(made, ['classified', 'vlog'])
        self.assertEqual(FakeStudio.state['finish']['state'], 'needs_review')

    def test_an_unknown_kind_fails_with_its_code(self):
        FakeStudio.state['job'] = {**FakeStudio.state['job'], 'kind': 'hologram'}
        worker.run_once(self.st, Path(self.tmp.name), lambda m: None)
        self.assertEqual(FakeStudio.state['finish']['error']['code'], 'KIND')

    def test_a_waiting_writer_waits_for_a_vlog_too(self):
        def busy(*a):
            raise StageError('WRITER_BUSY', 'busy')
        kinds.run_vlog = busy
        FakeStudio.state['job'] = {**FakeStudio.state['job'], 'kind': 'vlog'}
        worker.run_once(self.st, Path(self.tmp.name), lambda m: None)
        self.assertEqual(FakeStudio.state['finish']['state'], 'waiting')

    def test_the_lead_director_reaches_the_pipeline(self):
        job = {'id': 'j', 'brief': {'club_id': 'x', 'season': '1999/00', 'duration': 5, 'lead_director': 'terrace'}}
        self.assertEqual(worker.brief_for_pipeline(job)['lead_director'], 'terrace')


class ClassifiedApproval(unittest.TestCase):
    EP = sorted(p.name for p in kinds.COMIC.joinpath('episodes').glob('file01-*.json') if not p.name.endswith('-demo.json'))[0]

    def spec(self, **k):
        ep = json.loads((kinds.COMIC / 'episodes' / self.EP).read_text())
        return {'file': 'file01', 'episode': self.EP, 'script_version': ep['script_version'], 'approved': True,
                'approved_by': 'owner', 'approved_at': '2026-11-04T10:00:00Z', **k}

    def test_the_approved_draft_passes(self):
        self.assertEqual(kinds.check_approval(self.spec()).name, self.EP)

    def test_selected_episode_and_cover_images_must_download(self):
        ep = {'beats': [{'panel': 'scene-a'}, {'panel': '@OPTIONAL'}],
              'package': {'thumbnails': [{'panel': 'cover-b'}]}}
        kinds.check_classified_panels(ep, {'ok': ['scene-a', 'cover-b']})
        with self.assertRaises(StageError) as err:
            kinds.check_classified_panels(ep, {'ok': ['scene-a']})
        self.assertEqual(err.exception.code, 'PANELS')
        self.assertIn('cover-b', str(err.exception))

    def test_no_click_no_voice(self):
        for bad in ({'approved': False}, {'approved_by': ''}):
            with self.assertRaises(StageError) as e:
                kinds.check_approval(self.spec(**bad))
            self.assertEqual(e.exception.code, 'NOT_APPROVED')

    def test_a_changed_script_stops_the_job(self):
        with self.assertRaises(StageError) as e:
            kinds.check_approval(self.spec(script_version='draft 1'))
        self.assertEqual(e.exception.code, 'SCRIPT_CHANGED')

    def test_only_a_real_episode_and_never_the_demo(self):
        for name in ('../../etc/passwd', 'file01-demo.json'):
            with self.assertRaises(StageError):
                kinds.check_approval(self.spec(episode=name))

    def test_renders_never_land_in_the_repository(self):
        self.assertNotIn(str(kinds.FS.parents[1]), str(kinds.outside_repo('job-1', 'classified')))


class PackageShape(unittest.TestCase):
    def test_classified_titles_become_the_publish_kits_shape(self):
        yt = kinds.yt_shape({'title': 'T', 'title_candidates': ['A', 'B'], 'synthetic_media': {'altered_or_synthetic': False, 'reason': 'r'}}, title='x')
        self.assertEqual(yt['title_candidates'][0], {'title': 'A', 'angle': ''})
        self.assertEqual(yt['shorts'], [])
        self.assertEqual(kinds.yt_shape(None, title='V', reason='own footage')['synthetic_media']['reason'], 'own footage')

    def test_srt_becomes_vtt(self):
        with tempfile.TemporaryDirectory() as d:
            s = Path(d) / 'a.srt'
            s.write_text('1\n00:00:01,500 --> 00:00:02,000\nHi\n')
            self.assertIn('00:00:01.500 --> 00:00:02.000', kinds.srt_to_vtt(s, Path(d) / 'a.vtt').read_text())


if __name__ == '__main__':
    unittest.main()

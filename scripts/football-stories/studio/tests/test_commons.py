import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from studio import commons, cleanup, kit_ingest, media_assets, package, paper, pipeline
from studio.tests.test_required_media import shot, asset


def page(title='File:Jane Player in 1999.jpg', licence='Public domain', **extra):
    meta = {k: {'value': v} for k, v in {'LicenseShortName': licence, 'AttributionRequired': 'false',
            'Artist': '<a href="/user">Creator</a>', 'ImageDescription': 'Jane Player training in 1999', **extra}.items()}
    return {'pageid': 123, 'title': title, 'imageinfo': [{'mime': 'image/jpeg', 'width': 1600, 'height': 900,
            'thumburl': 'https://upload.wikimedia.org/a.jpg', 'sha1': 'abc', 'extmetadata': meta}]}


Q = {'entity': 'Jane Player', 'context': True, 'search': '"Jane Player"'}
SCRIPT = {'chapters': [{'beats': [{'narration': 'Jane Player scored at Sample Stadium.', 'claim_ids': ['goal'], 'visual': {}}]}]}
LEDGER = {'club_name': 'Sample Club', 'season': '1999/00', 'claims': [
    {'id': 'goal', 'fact': {'scorers': [{'name': 'Jane Player'}], 'venue': {'name': 'Sample Stadium'}}},
    {'id': 'unused', 'fact': {'scorers': [{'name': 'Wrong Player'}]}}]}
BRIEF = {'club_id': 'sample-club', 'season': '1999/00', 'media_set': 'job-00000001'}


class Discovery(unittest.TestCase):
    def test_only_entities_in_this_scripts_cited_facts_are_searched(self):
        self.assertEqual([q['entity'] for q in commons.queries(BRIEF, LEDGER, SCRIPT)], ['Sample Club', 'Sample Stadium', 'Jane Player'])

    def test_cited_match_year_is_used_across_a_season_boundary(self):
        ledger = {**LEDGER, 'claims': [{'id': 'goal', 'fact': {'date': '2000-05-13'}}]}
        self.assertEqual(commons.queries(BRIEF, ledger, SCRIPT)[0]['year'], '2000')

    def test_rights_relevance_dates_and_format_fail_closed(self):
        row, reason = commons.candidate(page(), Q)
        self.assertIsNone(reason);self.assertEqual(row['creator'], 'Creator')
        for licence in ('', 'CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-SA 4.0', 'CC BY 4.0', 'Fair use'):
            self.assertIsNone(commons.candidate(page(licence=licence), Q)[0])
        for extra in ({'AttributionRequired': 'true'}, {'Restrictions': 'Permission required'}):
            self.assertIsNone(commons.candidate(page(**extra), Q)[0])
        self.assertIsNone(commons.candidate(page(), {**Q, 'entity': 'Someone Else'})[0])
        self.assertIsNone(commons.candidate(page(title='File:Jane Player 2010.jpg'), {**Q, 'year': '1999'})[0])
        self.assertIsNotNone(commons.candidate(page(licence='CC0'), Q)[0])
        self.assertIsNone(commons.candidate(page(Categories='AI-generated images'), Q)[0])
        thumb = page();thumb['imageinfo'][0]['thumburl'] = 'https://thumb.wikimedia.org/a.jpg'
        self.assertIsNotNone(commons.candidate(thumb, Q)[0])
        for override in ({'width': 120}, {'mime': 'image/svg+xml'}, {'thumburl': 'http://127.0.0.1/x'}):
            p = page();p['imageinfo'][0].update(override)
            self.assertIsNone(commons.candidate(p, Q)[0])

    def test_download_redirects_cannot_leave_wikimedia(self):
        for url in ('https://upload.wikimedia.org.evil.test/x', 'http://upload.wikimedia.org/x', 'https://user@upload.wikimedia.org/x', 'https://127.0.0.1/x'):
            self.assertFalse(commons.allowed_url(url))
        with self.assertRaises(ValueError):
            commons.SafeRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.test/x')

    def test_cache_is_per_script_and_outage_is_optional(self):
        with tempfile.TemporaryDirectory() as d, patch.object(commons, 'fetch', return_value=json.dumps({'query': {'pages': [page()]}}).encode()) as fetch:
            first = commons.discover(BRIEF, LEDGER, SCRIPT, Path(d), lambda _: None)
            self.assertEqual(len(first['candidates']), 1);n = fetch.call_count
            self.assertEqual(first, commons.discover(BRIEF, LEDGER, SCRIPT, Path(d), lambda _: None))
            self.assertEqual(fetch.call_count, n)
            changed = {'chapters': [{'beats': [{'claim_ids': ['unused'], 'visual': {}}]}]}
            commons.discover(BRIEF, LEDGER, changed, Path(d), lambda _: None)
            self.assertGreater(fetch.call_count, n)
        with tempfile.TemporaryDirectory() as d, patch.object(commons, 'fetch', side_effect=OSError('offline')):
            result = commons.discover(BRIEF, LEDGER, SCRIPT, Path(d), lambda _: None)
            self.assertEqual(result['status'], 'partial');self.assertEqual(result['candidates'], [])

    def test_download_ingest_edit_package_preserve_provenance_and_required_priority(self):
        row, _ = commons.candidate(page(), Q)
        buf = io.BytesIO();Image.new('RGB', (900, 600), 'gray').save(buf, 'JPEG')
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            with patch.object(kit_ingest, 'BEATS', root / 'beats'), patch.object(commons, 'fetch', return_value=buf.getvalue()):
                assets = commons.ingest({'candidates': [row]}, BRIEF, root, lambda _: None)
            self.assertEqual(assets[0]['licence'], 'Public domain');self.assertTrue(assets[0]['archive'])
            shots, usage = media_assets.place([shot(0, narration='Jane Player scored.'), shot(1, narration='Jane Player scored.')], {'media_assets': [asset(1), *assets]})
            self.assertEqual(usage['used'], 1);self.assertEqual(shots[0]['required_asset'], asset(1)['key'])
            self.assertEqual(shots[1]['archive_asset'], assets[0]['key'])
            (root / 'plan.json').write_text(json.dumps({'shots': shots}))
            with patch.object(paper, 'beat_index', side_effect=lambda sid: assets if sid.startswith('commons-') else []):
                manifest = pipeline.asset_ledger(root, SCRIPT)
            archives = [a for a in manifest if a.get('archive')]
            self.assertEqual(len(archives), 1);self.assertEqual(archives[0]['origin'], row['source_url'])
            disclosure = package.synthetic_decision({'assets': archives})
            self.assertFalse(disclosure['altered_or_synthetic']);self.assertNotIn('No archive footage', disclosure['transparency_line'])

    def test_corrupt_download_is_not_cached(self):
        row, _ = commons.candidate(page(), Q)
        with tempfile.TemporaryDirectory() as d, patch.object(kit_ingest, 'BEATS', Path(d) / 'beats'), patch.object(commons, 'fetch', return_value=b'not an image'):
            self.assertEqual(commons.ingest({'candidates': [row]}, BRIEF, Path(d), lambda _: None), [])
            self.assertEqual(list(Path(d).glob('*.jpg')), [])


class Cleanup(unittest.TestCase):
    def test_paginated_caches_do_not_delete_another_job_sharing_a_prefix(self):
        rows = [{'id': n, 'key': f'stories-job-0000001-{n}'} for n in range(100)]
        rows.append({'id': 101, 'key': 'stories-job-0000001-other-1'})
        with patch.dict('os.environ', {'GH_REPO': 'owner/repo'}), patch.object(cleanup.subprocess, 'check_output', side_effect=[
                json.dumps({'actions_caches': rows[:100]}).encode(), json.dumps({'actions_caches': rows[100:]}).encode()]):
            self.assertEqual(cleanup.cache_ids('job-0000001'), list(range(100)))

    def test_failed_cache_deletion_is_not_acknowledged(self):
        with patch.dict('os.environ', {'GH_REPO': 'owner/repo'}), patch.object(cleanup, 'call', return_value={'ids': ['job-0000001']}) as call, \
                patch.object(cleanup, 'cache_ids', return_value=[1]), patch.object(cleanup.subprocess, 'run', side_effect=OSError('failed')):
            cleanup.run();self.assertEqual(call.call_count, 1)


class ArchiveFrames(unittest.TestCase):
    def test_archive_pixels_survive_classic_and_vox(self):
        from studio.tests import test_cinema as tc
        from studio.motion import ShotRenderer
        from studio.vox.render import VoxFilm
        from studio.common import FPS, StageError
        with tempfile.TemporaryDirectory() as d:
            picture = Path(d) / 'photo.png'
            Image.new('RGB', (600, 350), (0, 0, 255)).save(picture)
            ed, root = tc.editor()
            plan = ed.plan()
            s = next(s for s in plan['shots'] if s['visual']['type'] == 'illustration')
            s['visual'] = {'type': 'illustration', 'art': 'beat:commons-test/photo', 'caption': 'Context image · 1999 · Commons'}
            s['archive_asset'] = s['visual']['art']
            s['cinema'] = {'entry': 'dissolve', 'lib': [], 'lower': [], 'letterbox': False}
            with patch.object(paper, 'beat_path', return_value=picture):
                classic = ShotRenderer(ed.build(tc.StubSprites(ed.sprites_dir), s)).frame(2 * FPS)
                vox = VoxFilm(ed, plan, root).frame(s['n'], 2 * FPS, {})
            for frame in [classic, vox]:
                blue = (frame[..., 2] > 180) & (frame[..., 0] < 60) & (frame[..., 1] < 60)
                self.assertGreater(blue.mean(), .15)
            with patch.object(paper, 'beat_path', return_value=None), self.assertRaises(StageError):
                VoxFilm(ed, plan, root).frame(s['n'], 2 * FPS, {})

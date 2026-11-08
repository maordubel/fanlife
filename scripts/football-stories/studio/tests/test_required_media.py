"""Selected uploads and Drive folders are visible edit requirements, including on resume."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np
from PIL import Image

from studio import drive_scan, kit_ingest, media_assets as media, paper, pipeline, worker
from studio.common import FPS, StageError, write_json


def shot(n, kind='illustration', narration='The supporters celebrate a goal.'):
    return {'n': n, 'chapter': n // 2, 'beat': n % 2, 'start': n * 6, 'frames': 6 * FPS,
            'visual': {'type': kind}, 'voice_at': n * 6 + .5, 'voice_file': f'{n}.wav',
            'voice_dur': 4, 'words': [], 'narration': narration, 'claim_ids': [], 'mood': 'joy'}


def asset(n, **extra):
    return {'key': f'beat:test/image-{n}', 'source': f'image-{n}.png', 'required': True, **extra}


class EditCoverage(unittest.TestCase):
    def test_every_selection_appears_even_when_writer_uses_none(self):
        original = [shot(0), shot(1, 'score'), shot(2, 'chapter'), shot(3, 'end')]
        assets = [asset(n) for n in range(70)]
        result, report = media.place(original, {'media_assets': assets})
        self.assertEqual((report['required'], report['used']), (70, 70))
        self.assertEqual(report['added_seconds'], 70 * 4)
        self.assertEqual([s['n'] for s in result], list(range(len(result))))
        voiced = [s for s in result if s.get('voice_file')]
        self.assertEqual([s['source_n'] for s in voiced], list(range(4)))
        self.assertEqual([s['narration'] for s in voiced], [s['narration'] for s in original])
        self.assertTrue(all(abs(s['voice_at'] - s['start'] - .5) < .001 for s in voiced))
        self.assertEqual(next(s for s in voiced if s['voice_file'] == '1.wav')['visual']['type'], 'score')
        frame = 0
        for s in result:
            self.assertEqual(s['start'], frame / FPS)
            frame += s['frames']
        self.assertEqual(original[0]['visual'], {'type': 'illustration'})

    def test_scene_match_and_no_inserts_when_slots_are_available(self):
        shots = [shot(0, narration='The manager talks to the coach.'), shot(1, narration='The striker scored a header into the net.')]
        assets = [asset(1, source='goal-header.png'), asset(2, source='coach.png')]
        result, report = media.place(shots, {'media_assets': assets})
        self.assertEqual(report['added_seconds'], 0)
        self.assertEqual([s['required_asset'] for s in result], [assets[1]['key'], assets[0]['key']])

    def test_selected_picture_with_wrong_club_does_not_accompany_narration(self):
        wrong = {**asset(1), 'source': 'Celtic goal.png'}
        original = shot(0, narration='Hapoel Tel Aviv scored a goal.')
        original['visual']['art'] = wrong['key']
        result, _ = media.place([original], {'media_assets': [wrong]})
        self.assertNotIn('art', result[0]['visual'])
        self.assertEqual(result[1]['required_asset'], wrong['key'])
        self.assertEqual(result[1]['narration'], '')

    def test_receipt_missing_or_wrong_fails(self):
        result, report = media.place([shot(0)], {'media_assets': [asset(1)]})
        with tempfile.TemporaryDirectory() as d, patch.object(media, 'require_file'):
            root = Path(d)
            n = report['pictures'][0]['shots'][0]['n']
            receipt = root / 'shots' / f'shot-{n:04d}.cues.json'
            with self.assertRaises(StageError):
                media.verify_rendered(root, {'media_usage': report})
            write_json(receipt, {'required_asset': 'wrong'})
            with self.assertRaises(StageError):
                media.verify_rendered(root, {'media_usage': report})
            write_json(receipt, {'required_asset': asset(1)['key']})
            self.assertEqual(media.verify_rendered(root, {'media_usage': report})['rendered'], 1)


class Discovery(unittest.TestCase):
    def test_selected_folder_keeps_all_images_beyond_optional_limit(self):
        fid = 'selected12345'
        tree = {'folders': [{'id': fid, 'path': 'Celtic 1990'}], 'files': [
            {'id': str(n), 'path': 'Celtic 1990/sub', 'name': f'logo-{n}.png'} for n in range(75)]}
        p = drive_scan.plan(tree, {'drive_folder': fid, 'club_name': 'Hapoel Tel Aviv', 'season': '1999/00'})
        self.assertEqual(len(p['pictures']), 75)
        self.assertTrue(all(f['required'] for f in p['pictures']))

    def test_optional_ranking_crosses_projects_but_not_clubs_or_years(self):
        files = [{'id': str(n), 'path': path, 'name': name} for n, (path, name) in enumerate([
            ('THE WORKER', 'crowd.png'), ('Maccabi Tel Aviv', 'crowd.png'),
            ('Hapoel Tel Aviv/2010', 'crowd.png'), ('Hapoel Tel Aviv', 'logo.png'),
            ('Hapoel Tel Aviv/2000', 'goal.png')])]
        ranked = media.rank_files(files, {'club_id': 'hapoel-tel-aviv', 'season': '1999/00'})
        self.assertEqual([f['id'] for f in ranked], ['4', '0'])

    def test_partial_selected_tree_is_an_error(self):
        with patch('matchday.drive_fetch.listing', side_effect=[ [('child', 'Nested', True)], OSError('private') ]):
            with self.assertRaises(StageError):
                drive_scan.live_tree('root', lambda _: None, strict=True)

    def test_selected_folder_is_scanned_without_root_library_and_failed_download_stops(self):
        tree = {'folders': [], 'files': [{'id': 'file1', 'path': 'selected-selected12345', 'name': 'image.png'}]}
        job = {'brief': {'drive': False, 'drive_folder': 'selected12345'}}
        with tempfile.TemporaryDirectory() as d, patch.object(drive_scan, 'static_tree', return_value={'folders': [], 'files': []}), \
                patch.object(drive_scan, 'live_tree', return_value=tree) as scan, \
                patch('urllib.request.urlopen', side_effect=OSError('unavailable')), patch.dict('os.environ', {'STORIES_DRIVE_SCAN': '0'}):
            with self.assertRaises(StageError):
                worker.fetch_drive(job, Path(d), lambda _: None)
            self.assertEqual(scan.call_args.args[0], 'selected12345')
            self.assertTrue(scan.call_args.kwargs['strict'])

    def test_missing_uploaded_storage_never_disappears(self):
        st = Mock()
        st.call.return_value = {'urls': {}}
        with tempfile.TemporaryDirectory() as d, self.assertRaises(StageError):
            worker.fetch_art(st, {'id': 'test', 'brief': {'art': [{'name': 'a.png'}]}}, Path(d), lambda _: None)


class Ingestion(unittest.TestCase):
    def test_resume_invalidates_numbered_cards_and_qa_frames_but_keeps_paid_inputs(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            stale = ('shots', 'out', 'mix', 'worlds', 'vox', 'hf', 'sprites', 'qa')
            retained = ('voice', 'cache', 'art')
            for name in (*stale, *retained):
                (root / name).mkdir()
                (root / name / 'old').write_text('old')
            media.refresh_render(root, 'old')
            for name in stale:
                self.assertFalse((root / name).exists())
            for name in retained:
                self.assertTrue((root / name / 'old').exists())
            (root / 'sprites').mkdir()
            (root / 'sprites/card.png').write_text('current')
            media.refresh_render(root, 'old')
            self.assertTrue((root / 'sprites/card.png').exists())
            media.refresh_render(root, 'new')
            self.assertFalse((root / 'sprites/card.png').exists())

    def test_same_names_unicode_and_new_resume_file_remain_distinct(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            uploads, drive, beats = root / 'upload', root / 'drive', root / 'beats'
            uploads.mkdir(); drive.mkdir()
            for p, color in [(uploads / 'a.png', 'green'), (drive / 'b.png', 'blue'), (drive / 'c.png', 'white')]:
                Image.new('RGB', (32, 48), color).save(p)
            write_json(root / 'pack.json', {'files': [
                {'file': 'b.png', 'name': 'תמונה.png', 'source_id': 'drive-b', 'required': True},
                {'file': 'c.png', 'name': 'תמונה.png', 'source_id': 'drive-c', 'required': False}]})
            brief = {'club_id': 'test-fc', 'season': '2000/01', 'art_dir': str(uploads), 'drive_dir': str(drive),
                     'drive_pack': str(root / 'pack.json'), 'art': [{'name': 'a.png', 'originalName': 'תמונה.png'}], 'media_set': 'test'}
            with patch.object(kit_ingest, 'BEATS', beats), patch.object(paper, 'BEATS', beats):
                self.assertEqual(pipeline.ingest_art(brief, lambda _: None), ['test'])
                before = paper.beat_index('test')
                self.assertEqual(len({p['key'] for p in before}), 3)
                self.assertEqual(sum(p['required'] for p in before), 2)
                self.assertTrue(all(p['source'] == 'תמונה.png' for p in before))
                Image.new('RGB', (32, 48), 'black').save(uploads / 'new.png')
                brief['art'].append({'name': 'new.png'})
                pipeline.ingest_art(brief, lambda _: None)
                self.assertEqual(len(paper.beat_index('test')), 4)
                (uploads / 'a.png').write_text('not an image')
                with self.assertRaises(StageError):
                    pipeline.ingest_art(brief, lambda _: None)

    def test_portrait_keeps_top_and_bottom_in_landscape(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'portrait.png'
            im = Image.new('RGB', (100, 300), 'green')
            im.paste('blue', (0, 0, 100, 30)); im.paste('black', (0, 270, 100, 300)); im.save(p)
            out = media.whole_picture(p, (400, 200), [])
            self.assertEqual(out.getpixel((200, 2)), (0, 0, 255))
            self.assertEqual(out.getpixel((200, 197)), (0, 0, 0))


class ActualFrames(unittest.TestCase):
    def test_classic_and_vox_show_selected_pixels_and_refuse_missing_source(self):
        from studio.tests import test_cinema as tc
        from studio.motion import ShotRenderer
        from studio.vox.render import VoxFilm
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'selected.png'
            Image.new('RGB', (600, 350), (0, 0, 255)).save(p)
            ledger = tc.ledger()
            ledger['media_assets'] = [asset(1)]
            ed, root = tc.editor(led=ledger)
            plan = ed.plan()
            s = next(s for s in plan['shots'] if s.get('required_asset'))
            with patch.object(paper, 'beat_path', return_value=p):
                classic = ShotRenderer(ed.build(tc.StubSprites(ed.sprites_dir), s)).frame(2 * FPS)
                vox = VoxFilm(ed, plan, root).frame(s['n'], 2 * FPS, {})
            for frame in [classic, vox]:
                blue = (frame[..., 2] > 180) & (frame[..., 0] < 60) & (frame[..., 1] < 60)
                self.assertGreater(blue.mean(), .15)
            with patch.object(paper, 'beat_path', return_value=None), self.assertRaises(StageError):
                VoxFilm(ed, plan, root).frame(s['n'], 2 * FPS, {})

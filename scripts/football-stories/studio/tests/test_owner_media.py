"""The owner's pictures and clips in the film, and the channel's own cover (owner, 24.11.2026):

* "combine the pictures I upload … with our VOX technology: an effect, a transition with motion, a cool entrance, together
  with the text — not as a slideshow. Between the speech." → docu/reveal.py
* "also video files I upload, inside the edit" → studio/owner_media.py
* "titles and preview pictures that are ours … the cover preferably from a picture I upload, connected to the script
  through the picture" → thumbs/gazette.py, and the same picture on the film's front page
"""
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from studio.docu import build as B
from studio.docu import reveal as RV

HAVE_FFMPEG = bool(shutil.which('ffmpeg') and shutil.which('ffprobe'))


def beat(n, d=5.0, kind='image', extra=()):
    return {'t': n * 5.0, 'd': d, 'meta': {'n': n, 'type': 'illustration'},
            'shots': [{'kind': kind, 'src': f'pic-{n}.{"mp4" if kind == "video" else "webp"}', 'dt': 0.0}, {'kind': 'thread'}, {'kind': 'word', 'text': 'x'}, *extra]}


def film():
    return B.Film({'palette': {'us': '#B02D10', 'them': '#333333'}, 'silent': True}, Path('.'))


class TheReveal(unittest.TestCase):
    FILES = {'paper': 'paper.webp'}

    def shots(self, owned, said=None):
        said = said or {}
        return {n: {'n': n, 'required_asset': f'beat:test/p{n}' if n in owned else None, 'narration': said.get(n, '')} for n in range(8)}

    def test_an_owner_picture_enters_as_a_reveal_with_the_lines_own_words(self):
        beats = [beat(0), beat(1), beat(2)]
        made = RV.direct(beats, self.shots({1}, {1: '370 people were in the ground in Oldtown. That was all.'}), self.FILES, 's')
        self.assertEqual(made, {'reveals': 1, 'clips': 0})
        r = beats[1]['shots'][0]
        self.assertEqual(r['kind'], 'reveal')
        self.assertEqual(r['src'], 'pic-1.webp')
        said = '370 people were in the ground in Oldtown'.upper().split()
        self.assertEqual(' '.join(r['head']).upper().split(), said[:len(' '.join(r['head']).split())])   # his words, in order
        self.assertNotIn('word', [x['kind'] for x in beats[1]['shots']])      # no second title over it
        self.assertIn('thread', [x['kind'] for x in beats[1]['shots']])       # the story thread stays
        self.assertEqual(beats[0]['shots'][0]['kind'], 'image')               # a picture that is not his is untouched

    def test_only_the_first_beat_of_a_line_is_the_entrance(self):
        a, b = beat(1), beat(1)
        RV.direct([a, b], self.shots({1}, {1: 'They came.'}), self.FILES, 's')
        self.assertEqual((a['shots'][0]['kind'], b['shots'][0]['kind']), ('reveal', 'image'))

    def test_a_picture_with_no_line_drops_onto_the_pile_of_the_ones_before(self):
        beats = [beat(1), beat(2), beat(3)]
        RV.direct(beats, self.shots({1, 2, 3}, {1: 'They came.'}), self.FILES, 's')
        self.assertEqual([b['shots'][0]['style'] for b in beats][1:], ['stack', 'stack'])
        self.assertEqual(beats[2]['shots'][0]['under'], ['pic-1.webp', 'pic-2.webp'])

    def test_never_the_same_entrance_twice_running_and_a_clip_is_never_cut_into_strips(self):
        beats = [beat(n, kind='video' if n % 2 else 'image') for n in range(8)]
        RV.direct(beats, self.shots(set(range(8)), {n: f'Line {n} was said.' for n in range(8)}), self.FILES, 'seed')
        styles = [b['shots'][0]['style'] for b in beats]
        self.assertTrue(all(x != y for x, y in zip(styles, styles[1:])), styles)
        for b in beats:
            r = b['shots'][0]
            if r['clip']:
                self.assertIn(r['style'], RV.STYLES_CLIP)
                self.assertNotEqual(r['style'], 'strips')

    def test_a_beat_that_belongs_to_another_device_and_a_short_beat_keep_their_picture(self):
        beats = [beat(1, extra=[{'kind': 'pcard'}]), beat(2, d=1.5)]
        made = RV.direct(beats, self.shots({1, 2}, {1: 'A.', 2: 'B.'}), self.FILES, 's')
        self.assertEqual(made['reveals'], 0)

    def test_the_switch(self):
        with mock.patch.dict(os.environ, {'STORIES_REVEAL': '0'}):
            self.assertEqual(RV.direct([beat(1)], self.shots({1}, {1: 'A.'}), self.FILES, 's'), {'reveals': 0, 'clips': 0})

    def test_every_entrance_renders_soft_flat_and_in_the_clubs_colours(self):
        for style in ('print', 'stack', 'tear', 'strips', 'frame'):
            for clip in ((False, True) if style not in ('strips', 'stack') else (False,)):
                f = film()
                f.reveal({'style': style, 'src': 'c.mp4' if clip else 'p.webp', 'clip': clip, 'poster': 'c.jpg' if clip else None,
                          'head': ['370 people', 'were in the', 'ground'], 'under': ['u.webp'], 'paper': 'paper.webp', 'tilt': -2}, 10.0, 5.0)
                html, js = ' '.join(f.clips), ' '.join(f.tw)
                with self.subTest(style=style, clip=clip):
                    self.assertNotRegex(js, r'back\.|elastic|bounce')               # rule 142
                    self.assertNotRegex(js, r'rotationX|rotationY|perspective')     # no 3D: it drops the motion blur to its slow tier
                    self.assertNotIn('mask-image', html + RV.CSS)
                    self.assertNotIn('filter:', html)
                    colours = set(re.findall(r'#[0-9a-fA-F]{6}\b', html)) - {'#B02D10', f.PAPER, f.INK, '#F7F1E3'}
                    self.assertFalse(colours, colours)
                    if clip:   # the clip is its own timed, muted <video>, with its poster under it
                        v = re.search(r'<video[^>]*>', html).group(0)
                        self.assertIn('muted', v)
                        self.assertIn('data-start="10.0"', v)
                        self.assertIn('class="clip"', v)
                        self.assertIn('assets/img/c.jpg', html)
                    if style in ('print', 'tear', 'frame', 'strips'):
                        self.assertIn('370', html)

    def test_the_words_never_run_under_the_picture(self):
        size = RV._size(['KAABI PLAYED'], RV.TEXT_W)
        from studio.thumbs.render import face
        self.assertLessEqual(96 + face('ultra', size).length('KAABI PLAYED'), 1920 - 1060 - 110)


@unittest.skipUnless(HAVE_FFMPEG, 'ffmpeg')
class TheOwnersClips(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp)
        self.src = self.tmp / 'fans before kick-off.mov'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=3',
                        '-f', 'lavfi', '-i', 'sine=duration=3', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', str(self.src)], check=True)
        from studio import owner_media, paper
        self.p = [mock.patch.object(owner_media, 'CLIPS', self.tmp / 'clips'), mock.patch.object(paper, 'CLIPS', self.tmp / 'clips')]
        for x in self.p:
            x.start()
            self.addCleanup(x.stop)

    def test_an_uploaded_clip_becomes_a_muted_1080p_piece_with_its_poster(self):
        from studio import media_assets, owner_media
        pieces = owner_media.ingest_videos('job-test', [{'path': self.src, 'source': self.src.name, 'source_id': 'upload:x', 'required': True}],
                                           'olympiacos', '2023/24', lambda m: None)
        self.assertEqual(len(pieces), 1)
        pc = pieces[0]
        self.assertTrue(pc['key'].startswith('clip:job-test/fans-before-kick-off-'))
        self.assertTrue(pc['required'])
        self.assertAlmostEqual(pc['dur'], 3.0, delta=0.2)
        clip = media_assets.require_file(pc['key'])
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'csv=p=0', str(clip)],
                           capture_output=True, text=True).stdout
        self.assertIn('video,1920,1080', r)
        self.assertNotIn('audio', r)                                   # the narrator speaks over it; the mix owns the sound
        self.assertTrue(owner_media.poster_path(pc['key']).exists())

    def test_a_required_clip_that_cannot_be_read_stops_the_job_and_names_it(self):
        from studio import owner_media
        from studio.common import StageError
        bad = self.tmp / 'broken.mp4'
        bad.write_bytes(b'not a video')
        with self.assertRaises(StageError) as x:
            owner_media.ingest_videos('job-test', [{'path': bad, 'source': 'broken.mp4', 'source_id': 'upload:b', 'required': True}], None, None, lambda m: None)
        self.assertIn('broken.mp4', str(x.exception))

    def test_a_clip_is_placed_like_a_picture(self):
        from studio import media_assets
        shots = [{'n': 0, 'chapter': 0, 'beat': 0, 'start': 0, 'frames': 180, 'visual': {'type': 'illustration'}, 'voice_at': 0.5,
                  'voice_file': '0.wav', 'voice_dur': 4, 'words': [], 'narration': 'The fans sang before kick-off.', 'claim_ids': [], 'mood': 'joy'}]
        asset = {'key': 'clip:job-test/fans-before-kick-off-1', 'source': 'fans-before-kick-off.mp4', 'description': 'fans before kick off', 'required': True}
        out, report = media_assets.place(shots, {'media_assets': [asset]})
        self.assertEqual(out[0]['required_asset'], asset['key'])


class TheDriveFolder(unittest.TestCase):
    def test_a_pinned_folder_brings_its_clips(self):
        from studio import drive_scan
        tree = {'folders': [{'id': 'F', 'path': 'selected-F'}],
                'files': [{'id': 'a', 'name': 'goal.png', 'path': 'selected-F'}, {'id': 'b', 'name': 'tifo.mp4', 'path': 'selected-F'},
                          {'id': 'c', 'name': 'notes.pdf', 'path': 'selected-F'}]}
        with mock.patch.object(drive_scan, 'targeted_folders', return_value=[{'path': 'selected-F', 'pinned': True, 'score': 99}]):
            p = drive_scan.plan(tree, {'club_id': 'olympiacos', 'season': '2023/24', 'drive_folder': 'F'})
        self.assertEqual({f['name'] for f in p['pictures']}, {'goal.png', 'tifo.mp4'})
        self.assertTrue(all(f['required'] for f in p['pictures']))


class TheCover(unittest.TestCase):
    def test_the_cover_is_the_owners_picture_under_its_spoken_line(self):
        from studio.thumbs import gazette
        led = {'media_assets': [{'key': 'beat:t/a', 'required': True}, {'key': 'beat:t/b', 'required': True}, {'key': 'beat:t/c'}]}
        plan = {'shots': [{'n': 1, 'required_asset': 'beat:t/a', 'narration': ''},
                          {'n': 2, 'required_asset': 'beat:t/b', 'narration': '370 people were in the ground. Then it rained.', 'claim_ids': ['c1']}]}
        im = Image.new('RGB', (800, 500), (120, 30, 30))
        with mock.patch.object(gazette, 'owner_picture', return_value=Path('x')), mock.patch.object(gazette.Image, 'open', return_value=im):
            own = gazette.owner_cover(led, plan)
        self.assertEqual((own['key'], own['n'], own['claims']), ('beat:t/b', 2, ['c1']))
        self.assertEqual(gazette.head_of(own['line']), ['370 people', 'were in the', 'ground'])
        self.assertIsNone(gazette.owner_cover({'media_assets': [{'key': 'beat:t/c'}]}, plan))   # he chose nothing: no owner cover

    def test_the_cover_renders_the_page_with_his_words_in_the_clubs_colour(self):
        from studio.common import Palette
        from studio.thumbs import gazette
        pal = Palette(club_id='olympiacos', club_name='Olympiacos', primary='#D71920', on_primary='#FFFFFF', bans=['green'])
        Bd = gazette.front({'lines': ['370 people', 'were in the', 'ground'], 'kicker': 'Cup'}, Image.new('RGB', (900, 600), (90, 90, 90)), pal, None, seed=1, club='Olympiacos')
        self.assertEqual(Bd.im.size, (1280, 720))
        said = [t['text'] for t in Bd.texts if t['role'] == 'headline']
        self.assertEqual(said, '370 PEOPLE WERE IN THE GROUND'.split())


if __name__ == '__main__':
    unittest.main()

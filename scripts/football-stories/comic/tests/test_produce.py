"""The full CLASSIFIED production path (produce.py): the FILE 01 episode against the panel map and script draft 2, the
follow line (rule 136), the clock laid from the voice, the role measurement, and a whole dummy episode produced end to
end — dummy panels, a stand-in voice, no network. The owner's art and the real narrator never run in CI."""
from __future__ import annotations

import json
import os
import re
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

os.environ.setdefault('CLASSIFIED_WORKERS', '1')

from comic import dummy, episode, layers, manifest, produce, release, roles  # noqa: E402

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parents[2]
FILE01 = HERE / 'episodes' / 'file01-the-bottle.json'
SCRIPT = REPO / 'docs' / 'fanlife' / 'classified' / 'file01-the-bottle.script.md'


def ep01() -> dict:
    return json.loads(FILE01.read_text(encoding='utf-8'))


class File01(unittest.TestCase):
    def test_validates_against_the_manifest(self):
        self.assertEqual(produce.validate(ep01()), [])

    def test_every_panel_is_the_owners(self):
        man = manifest.load_manifest()
        ids = {e['id'] for e in manifest.entries(man, 'file01')}
        for b in ep01()['beats']:
            self.assertTrue(b['panel'] in ids or b['panel'] in ('@CH1', '@CH2'), b['id'])

    def test_draft_2_opens_on_the_match_and_the_date(self):
        ep = ep01()
        self.assertEqual(ep['script_version'], 'draft 3, 4.11.2026')
        first = ep['beats'][0]
        self.assertIn('Slovenia', first['say'])
        self.assertIn('Gwangju', first['say'])
        self.assertIn('sixteen days', first['say'])
        self.assertEqual(ep['beats'][1]['panel'], '@CH1')

    def test_every_narrated_line_is_the_scripts(self):
        """The narration in the episode is the approved text word for word (the script table's narration column)."""
        text = SCRIPT.read_text(encoding='utf-8') if SCRIPT.exists() else ''
        if 'draft 3' not in text:
            self.skipTest('draft 3 of the script is not on this branch yet')
        squash = lambda s: re.sub(r'\s+', ' ', s.replace('’', "'")).strip()  # noqa: E731
        rows = [squash(r.split('|')[3]) for r in text.split('\n') if r.startswith('| ') and r.count('|') >= 5]
        for b in ep01()['beats']:
            if b.get('say'):
                self.assertTrue(any(squash(b['say']) in r for r in rows), b['id'])

    def test_every_narrated_beat_carries_its_camera_direction(self):
        for b in ep01()['beats']:
            card = any(isinstance(e, dict) and e.get('type') in ('chapter', 'sources') for e in b.get('fx') or [])
            if not card and not b.get('cont'):
                self.assertTrue(b.get('camera'), b['id'])

    def test_not_approved_yet(self):
        self.assertFalse(ep01()['approved'])
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(produce.ProduceError) as c:
                produce.produce(FILE01, [Path(d)], Path(d) / 'out')   # the real narrator, no approval
            self.assertIn('not approved', str(c.exception))

    def test_out_inside_the_repo_is_refused(self):
        with self.assertRaises(produce.ProduceError):
            produce.produce(FILE01, [REPO], REPO / 'render-here', say=produce.fake_voice)

    def test_the_follow_line_lands_after_chapter_two_and_the_close_ends_on_it(self):
        e = produce.with_follow(ep01())
        ids = [b['id'] for b in e['beats']]
        self.assertEqual(ids.count('follow'), 1)
        self.assertEqual(ids[-1], 'end')
        ch3 = next(i for i, b in enumerate(e['beats']) if b.get('chapter') == 'San Iker')
        self.assertEqual(ids[ch3 - 1], 'follow')
        self.assertTrue(e['beats'][-1]['say'].endswith(produce.FOLLOW_TAIL))
        from studio import script
        self.assertIn(e['beats'][ids.index('follow')]['say'], script.FOLLOW)

    def test_the_title_is_in_the_series_shape(self):
        pk = ep01()['package']
        self.assertTrue(all(release.title_ok(t) for t in pk['title_candidates']))
        self.assertEqual(len(pk['thumbnails']), 3)
        self.assertEqual(len(pk['shorts']), 3)

    def test_the_names_are_in_the_lexicon(self):
        from studio import pronounce
        lex = pronounce.lexicon()
        for n in ('Cañizares', 'Casillas', 'Suwon', 'Montecastillo', 'Jerez', 'Harte', 'Kilbane', 'Connolly', 'Mendieta',
                  'Camacho', 'César', 'Valencia', 'Gwangju'):
            self.assertIn(n, lex, n)
            self.assertEqual(pronounce.unknown_symbols(lex[n]), set(), n)

    def test_the_dry_clock_is_about_five_minutes(self):
        e = produce.with_follow(ep01())
        for b in e['beats']:
            if b['panel'].startswith('@'):
                b['panel'] = 'x'
        _, beats = episode.load(e)
        self.assertGreater(episode.total(beats), 4 * 60)
        self.assertLess(episode.total(beats), 7 * 60)


class Clock(unittest.TestCase):
    def test_each_beat_lasts_its_line_and_a_breath_and_effects_land_on_their_word(self):
        ep = {'file': 'file01', 'beats': [
            {'id': 'a', 'panel': 'x', 'say': 'This one got away. He had spent his life catching things.', 'smash_at_word': 'away.',
             'fx': [{'type': 'smash', 't0': 'word'}]},
            {'id': 'a2', 'panel': 'y', 'cont': True, 'share': 1, 'transition': 'whip'},
            {'id': 'b', 'panel': 'z', 'say': 'Quiet.', 'transition': 'fade', 'share': 3}]}
        ep['beats'][0]['share'] = 3
        voices = {}
        with tempfile.TemporaryDirectory() as d:
            for b in ep['beats']:
                if b.get('say'):
                    w = Path(d) / f"{b['id']}.wav"
                    voices[b['id']] = produce.fake_voice(b['say'], w)
                    voices[b['id']]['duration'] = produce._wav_seconds(w)
        out = produce.lay_out(ep, voices)
        a, a2, b = out['beats']
        L = produce.LEAD + voices['a']['duration'] + produce.BREATH
        self.assertAlmostEqual(a['dur'] + a2['dur'], L, places=2)
        self.assertAlmostEqual(a['dur'] / (a['dur'] + a2['dur']), .75, places=2)
        word = next(w for w in voices['a']['words'] if w['w'] == 'away.')
        self.assertAlmostEqual(a['fx'][0]['t0'], produce.LEAD + word['start'], places=3)
        lead_b = max(produce.LEAD, episode.TRANSITIONS['fade'] * .7)
        self.assertAlmostEqual(b['dur'], lead_b + voices['b']['duration'] + produce.BREATH, places=2)


class Roles(unittest.TestCase):
    def test_green_jersey_is_ch2_and_red_is_ch1(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            man = manifest.load_manifest()
            files = {e['id']: e['file'] for e in manifest.entries(man, 'file01')}
            for i, e in enumerate(manifest.entries(man, 'file01')):
                dummy.panel(320, 180, i + 1).save(d / e['file'])

            def sheet(path, rgb):
                a = np.full((300, 400, 3), 245, np.uint8)
                a[80:260, 140:260] = rgb                   # the jersey
                a[40:80, 180:220] = (232, 170, 130)         # a face
                Image.fromarray(a).save(path)
            sheet(d / files['f01-ch-a'], (30, 150, 60))    # a: green — the kid
            sheet(d / files['f01-ch-b'], (200, 30, 35))    # b: red — the number one
            for k, rgb in (('s04-abstract-a', (35, 60, 143)), ('s05-abstract-b', (215, 40, 30))):
                Image.fromarray(np.full((180, 320, 3), rgb, np.uint8)).save(d / files[k])
            r = roles.resolve(man, d, 'file01')
            self.assertTrue(all(x['decided'] for x in r['rules']))
            self.assertEqual(r['map']['CH2'], 'f01-ch-a')
            self.assertEqual(r['map']['CH1'], 'f01-ch-b')
            self.assertEqual(r['map']['S04'], 's05-abstract-b')    # WAR: the red one
            self.assertEqual(r['map']['S05'], 's04-abstract-a')    # HEART: the navy one

    def test_an_unclear_measurement_is_not_a_decision(self):
        rule = {'ids': ['a', 'b'], 'roles': ['CH1', 'CH2'], 'hues': ['red', 'green']}
        same = {'red': .1, 'green': .1, 'navy': 0}
        d = roles.decide(rule, {'a': same, 'b': same})
        self.assertFalse(d['decided'])

    def test_the_manifest_records_the_owners_decisions(self):
        man = manifest.load_manifest()
        rules = {tuple(r['roles']): r for r in man['role_rules']}
        self.assertEqual(rules[('CH1', 'CH2')]['hues'], ['red', 'green'])
        self.assertEqual(rules[('S04', 'S05')]['hues'], ['red', 'navy'])
        roles_ = {e['id']: e['role'] for e in manifest.entries(man, 'file01')}
        self.assertEqual(roles_['f01-floodlit-standing'], 'P05')
        self.assertEqual(roles_['f01-floodlit-entering'], 'P15')
        for t in man['tones'].values():
            self.assertTrue(t.get('music'))


def _dummy_episode() -> dict:
    return {'file': 'file01', 'number': '01', 'title': 'THE BOTTLE', 'tone': 'LAUGH', 'fps': 25, 'grade': .45,
            'approved': False, 'script_version': 'dummy',
            'beats': [
                {'id': 'd1', 'panel': 'f01-p01-slip', 'chapter': 'Cold open', 'say': 'A goalkeeper. A bottle. And gravity.',
                 'move': 'tilt3d', 'focus': 'subject', 'smash_at_word': 'gravity.', 'sources': [1],
                 'fx': [{'type': 'smash', 't0': 'word', 'text': 'SMASH!'}, {'type': 'dof', 't0': .1}]},
                {'id': 'd2', 'panel': 's02-dossier', 'chapter': 'The file', 'dur': 1.6, 'move': 'crane_down', 'transition': 'smash',
                 'fx': [{'type': 'stamp', 't0': .2}, {'type': 'chapter', 'n': 1, 'text': 'THE FILE', 't0': .3}]},
                {'id': 'd3', 'panel': 'f01-p16-penalty-save', 'chapter': 'The save', 'say': 'He went the right way. Saved.',
                 'move': 'orbit', 'transition': 'rewind', 'crowd_at_word': 'Saved.', 'freeze': 'word', 'smash_at_word': 'Saved.',
                 'fx': [{'type': 'smash', 't0': 'word', 'text': 'SAVED!', 'color': 'cyan'},
                        {'type': 'score', 'text': '3–2', 'label': 'ON PENALTIES', 't0': .2}, {'type': 'confetti'}]},
                {'id': 'd4', 'panel': 's02-dossier', 'dur': 1.4, 'move': 'static', 'transition': 'fade', 'fx': [{'type': 'sources'}]}],
            'sources': [{'n': 1, 'title': 'A test source, 1 January 2002'}],
            'package': {'title_candidates': ['The Bottle That Tests the Pipeline'], 'selected': 0, 'hook': 'A dummy file.',
                        'tags': ['CLASSIFIED'], 'thumbnails': [{'panel': 'f01-p10-sink-smash', 'hook': ['ONE BOTTLE.', 'NO WORLD CUP.']}],
                        'shorts': [{'from': 'd3', 'to': 'd4', 'hook': 'The save'}]}}


class EndToEnd(unittest.TestCase):
    """A dummy 4-beat episode through the whole path: voice, clock, mix, picture, captions, QA, Short, package,
    thumbnail, Telegram preview and the DRAFT note. Nothing reaches the network."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        t = Path(cls.tmp.name)
        layers.CACHE = t / 'cache'
        cls.panels = t / 'panels'
        dummy.write_all(cls.panels, (480, 270), 'file01')
        cls.out = t / 'job'
        cls.rep = produce.produce(_dummy_episode(), [cls.panels], cls.out, say=produce.fake_voice, size=(320, 180),
                                  allow_model=False, music='synth', log=lambda m: None)
        cls.o = cls.out / 'out'

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_files(self):
        for f in ('master.mp4', 'captions.en.srt', 'captions.en.vtt', 'qa.json', 'youtube.json', 'description.txt',
                  'thumbnail-1.jpg', 'preview-telegram.mp4', 'telegram-draft.txt', 'report.json', 'short-1.mp4'):
            self.assertTrue((self.o / f).exists(), f)

    def test_the_clock_follows_the_voice(self):
        plan = json.loads((self.out / 'plan.json').read_text())
        ids = [s['id'] for s in plan['shots']]
        self.assertEqual(ids, ['d1', 'd2', 'd3', 'd4', 'follow', 'end'])   # the second chapter is the last: the follow closes it
        for s in plan['shots']:
            if s['voice_file']:
                with __import__('wave').open(str(self.out / 'voice' / s['voice_file'])) as w:
                    vdur = w.getnframes() / w.getframerate()
                seconds = s['frames'] / plan['fps']
                self.assertGreater(seconds, vdur)
                self.assertLess(seconds, vdur + 1.6)
        total = sum(s['frames'] for s in plan['shots']) / plan['fps']
        self.assertAlmostEqual(total, plan['duration'], places=2)

    def test_qa_measures_what_it_can(self):
        q = json.loads((self.o / 'qa.json').read_text())
        checks = {c['name']: c['ok'] for c in q['checks']}
        for name in ('loudness', 'captions', 'no black gaps', 'picture/audio sync', 'no dead air'):
            self.assertTrue(checks[name], name)
        self.assertFalse(checks['streams'])   # 320×180 is not a master — and QA says so

    def test_captions(self):
        srt = (self.o / 'captions.en.srt').read_text()
        self.assertIn('goalkeeper', srt.lower())
        self.assertTrue((self.o / 'captions.en.vtt').read_text().startswith('WEBVTT'))

    def test_package(self):
        yt = json.loads((self.o / 'youtube.json').read_text())
        self.assertEqual(yt['title'], 'The Bottle That Tests the Pipeline')
        self.assertFalse(yt['published'])
        self.assertEqual(yt['privacy_default'], 'private')
        self.assertIn('A test source', yt['description'])
        with Image.open(self.o / 'thumbnail-1.jpg') as im:
            self.assertEqual(im.size, (1280, 720))
        note = (self.o / 'telegram-draft.txt').read_text()
        self.assertIn('DRAFT', note)
        self.assertIn('Nothing has been uploaded', note)

    def test_short_is_vertical(self):
        import subprocess
        r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                            '-of', 'csv=p=0', str(self.o / 'short-1.mp4')], capture_output=True, text=True, check=True)
        self.assertEqual(r.stdout.strip(), '1080,1920')

    def test_report(self):
        self.assertIn('roles', self.rep)
        self.assertEqual(self.rep['voice'], 'fake (test stand-in)')
        from studio.audio import owner_tracks  # the owner's music only (5.11.2026), never the synthesiser
        self.assertIn(self.rep['music'].split(' ')[0], {t['id'] for t in owner_tracks()})
        self.assertGreater(self.rep['cues'], 3)


class Workflow(unittest.TestCase):
    def test_produce_runs_only_by_hand_and_only_when_approved(self):
        y = (REPO / '.github' / 'workflows' / 'classified-produce.yml').read_text()
        self.assertIn('workflow_dispatch', y)
        for trig in ('schedule:', 'push:', 'pull_request'):
            self.assertNotIn(trig, y)
        self.assertIn('approve', y)
        self.assertIn('retention-days: 3', y)
        for upload in ('googleapis.com/upload', 'youtube/v3', 'videos.insert'):   # nothing here can publish
            self.assertNotIn(upload, y)


if __name__ == '__main__':
    unittest.main()

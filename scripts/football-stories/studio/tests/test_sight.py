"""SIGHT (owner, 15.11.2026: the studio does not choose the right graphics, the films are slides): pictures described
once, chosen by what they show, cards read over a moving picture, and the render judged frame by frame."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from studio import sight as SG
from studio.docu import build as B
from studio.docu import editor as E


def png(path: Path, colour=(30, 120, 60), noise=False):
    im = Image.new('RGB', (320, 180), colour)
    if noise:
        import random
        rnd = random.Random(7)
        px = im.load()
        for x in range(320):
            for y in range(180):
                px[x, y] = (rnd.randrange(256), rnd.randrange(256), rnd.randrange(256))
    im.save(path)
    return path


class Captions(unittest.TestCase):
    def test_every_picture_is_described_once_by_its_content(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            a, b, same = png(d / 'a.png'), png(d / 'b.png', (200, 20, 20)), png(d / 'copy-of-a.png')
            idx = {'records': [{'id': 'kit:a', 'kind': 'still', 'path': str(a)}, {'id': 'kit:b', 'kind': 'still', 'path': str(b)},
                               {'id': 'kit:copy', 'kind': 'still', 'path': str(same)}, {'id': 'clip:x', 'kind': 'clip', 'path': str(a)}]}
            asked = []

            def call(parts):
                asked.append(sum(1 for p in parts if 'inlineData' in p))
                return [{'i': 0, 'caption': 'a green stand', 'people': 0, 'avoid': ['a defeat']},
                        {'i': 1, 'caption': 'a red flag', 'people': 0}]
            book = d / 'captions.json'
            self.assertEqual(SG.caption_library(idx, log=lambda m: None, call=call, path=book), 2)
            self.assertEqual(asked, [2])                      # the copy has the same content: looked at once
            self.assertEqual(SG.caption_library(idx, log=lambda m: None, call=call, path=book), 0)
            caps = SG.load_captions(book)
            rec = dict(idx['records'][2])
            self.assertIn('a green stand', SG.describe(rec, caps))
            self.assertIn('NOT for: a defeat', SG.describe(rec, caps))
            self.assertTrue(SG.describe({'id': 'kit:never-seen', 'path': None}, caps).startswith('uncaptioned'))

    def test_a_quota_keeps_what_was_described(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            idx = {'records': [{'id': f'kit:{i}', 'kind': 'still', 'path': str(png(d / f'{i}.png', (i * 20, 40, 40)))} for i in range(8)]}
            calls = []

            def call(parts):
                calls.append(1)
                if len(calls) > 1:
                    raise RuntimeError('429 per day')
                return [{'i': i, 'caption': f'p{i}'} for i in range(SG.BATCH)]
            self.assertEqual(SG.caption_library(idx, log=lambda m: None, call=call, path=d / 'c.json'), SG.BATCH)
            self.assertEqual(len(SG.load_captions(d / 'c.json')), SG.BATCH)


class Director(unittest.TestCase):
    def test_the_pick_is_one_of_the_lines_candidates_and_rejects_are_kept(self):
        lines = [{'n': 4, 'type': 'illustration', 'text': 'He signed for AEK.',
                  'candidates': [{'id': 'kit:bars', 'shows': 'a man behind prison bars'}, {'id': 'kit:pen', 'shows': 'a contract and a pen'}]},
                 {'n': 5, 'text': 'The crowd went quiet.', 'candidates': [{'id': 'kit:stand', 'shows': 'a silent stand'}]}]

        def call(parts):
            self.assertIn('LINE 4', parts[0]['text'])
            self.assertIn('kit:bars: a man behind prison bars', parts[0]['text'])
            return [{'n': 4, 'see': 'a pen on a contract', 'pick': 'kit:pen', 'reject': ['kit:bars', 'kit:invented'], 'fit': 2},
                    {'n': 5, 'see': 'the stand', 'pick': 'kit:made-up'}, {'n': 99, 'pick': 'kit:stand'}]
        out = SG.direct(lines, log=lambda m: None, call=call)
        self.assertEqual(out[4]['pick'], 'kit:pen')
        self.assertEqual(out[4]['reject'], ['kit:bars'])
        self.assertIsNone(out[5]['pick'])                   # a picture the model invented is never shown
        self.assertNotIn(99, out)

    def test_no_answer_leaves_the_index_to_choose(self):
        def call(parts):
            raise RuntimeError('no key')
        self.assertEqual(SG.direct([{'n': 1, 'text': 'x', 'candidates': [{'id': 'a', 'shows': 'b'}]}], log=lambda m: None, call=call), {})

    def test_an_answer_in_a_fence_still_parses(self):
        self.assertEqual(SG.parse('```json\n[{"n": 1}]\n```'), [{'n': 1}])
        self.assertEqual(SG.parse('not json'), [])


def beat(t, n, d, shots, kind='illustration'):
    return {'t': t, 'd': d, 'shots': shots, 'meta': {'n': n, 'type': kind, 'chapter': 0, 'words': []}}


class NoSlide(unittest.TestCase):
    def test_every_card_is_read_over_a_moving_picture(self):
        word = {'kind': 'word', 'text': 'THE|QUESTION', 'bg': 'ink', 'at': 0.5, 'd': 3.5}
        out = E.cut([beat(0, 0, 4.0, [word])], None, None, backdrop=lambda n: {'kind': 'image', 'src': 'stand.webp', 'move': 'push'})
        shots = out[0]['shots']
        w = next(x for x in shots if x['kind'] == 'word')
        under = [x for x in shots if x.get('under')]
        self.assertTrue(w['glass'])
        self.assertEqual(len(under), 1)
        self.assertLessEqual(under[0]['dt'], 0.5)
        self.assertGreaterEqual(under[0]['dt'] + under[0]['d'], 4.0 - 0.05)

    def test_a_film_of_cards_is_cut_to_its_budget(self):
        beats, t = [], 0.0
        for i in range(16):   # sixteen lines, three of them an 8 s line with a ledger: 12 s of cards in a 76 s film is 16%
            card = [{'kind': 'ledger', 'rows': [], 'us': 'A', 'them': 'B'}] if i in (0, 6, 12) else []
            d = 8.0 if card else 4.0
            beats.append(beat(t, i, d, card + [{'kind': 'image', 'src': f'{i}.webp'}]))
            t += d
        self.assertGreater(E.card_share(E.cut([dict(b, shots=[dict(x) for x in b['shots']]) for b in beats[:1]])), 0)
        out = E.cut(beats, None, None, backdrop=lambda n: {'kind': 'image', 'src': 'x.webp'})
        self.assertLessEqual(E.card_share(out), E.CARD_SHARE)
        held = [x['d'] for b in out for x in b['shots'] if x['kind'] == 'ledger']
        self.assertEqual(held[0], E.MAX_CARD)          # the earliest card keeps its reading time …
        self.assertEqual(held[-1], E.WORD_HOLD)        # … the later ones give way

    def test_the_gate_names_a_flat_shot_and_the_editor_shortens_its_card(self):
        tick = {'kind': 'ticket', 'small': 'C', 'big': 'X', 'line': ''}
        out = E.cut([beat(0, 7, 9.0, [tick], 'chapter')], None, None, backdrop=lambda n: {'kind': 'image', 'src': 'x.webp'}, fixes={7: ['flat']})
        self.assertEqual(next(x for x in out[0]['shots'] if x['kind'] == 'ticket')['d'], E.WORD_HOLD)


class Build(unittest.TestCase):
    def test_a_glass_card_thins_to_the_edges(self):
        self.assertEqual(B.rgba('#F1E8D3', 0.5), 'rgba(241,232,211,0.5)')
        self.assertIn('radial-gradient', B.glass('#14110D', 0.9, 0.3))

    def test_a_subtitle_already_on_screen_as_type_is_not_shown_twice(self):
        b = {'t': 10.0, 'd': 4.0, 'shots': [{'kind': 'word', 'text': 'HE SIGNED|FOR AEK', 'at': 0.5, 'd': 3.0}]}
        typed = B.on_screen(b)
        self.assertTrue(B.doubled('He signed for AEK.', 10.6, 1.5, typed))
        self.assertFalse(B.doubled('Nobody in Athens believed it.', 10.6, 1.5, typed))
        self.assertFalse(B.doubled('He signed for AEK.', 14.0, 1.5, typed))   # the card has gone: the subtitle carries it


class Render(unittest.TestCase):
    def test_flat_frames_are_measured_on_the_render(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            png(d / 'flat.png')
            png(d / 'busy.png', noise=True)
            out = d / 'v.mp4'
            # 6 s of a plain card, then 4 s of a busy picture
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', '6', '-i', str(d / 'flat.png'), '-loop', '1', '-t', '4', '-i', str(d / 'busy.png'),
                            '-filter_complex', '[0][1]concat=n=2:v=1,format=yuv420p', '-r', '10', str(out)], check=True)
            m = SG.flat(out)
            self.assertAlmostEqual(m['share'], 0.6, delta=0.21)
            self.assertGreaterEqual(m['run_s'], 4.0)
            self.assertEqual(m['run_at'], 0.0)

    def test_the_critic_names_the_shots_it_calls_wrong(self):
        plan = {'shots': [{'n': 1, 'start': 0.0, 'frames': 125, 'narration': 'He signed for AEK.'},
                          {'n': 2, 'start': 5.0, 'frames': 125, 'narration': 'The stand sang.'}]}

        def call(parts):
            k = sum(1 for p in parts if 'inlineData' in p)
            return [{'i': i, 'fit': 0 if i == 0 else 2, 'slide': False, 'note': 'prison bars'} for i in range(k)]
        r = SG.critic(Path('x.mp4'), plan, log=lambda m: None, call=call, grab=lambda m, t: b'jpeg')
        self.assertEqual(r['wrong'], [1])
        self.assertEqual(r['wrong_frames'], 1)
        self.assertEqual(json.loads(json.dumps(r))['frames'][0]['note'], 'prison bars')


if __name__ == '__main__':
    unittest.main()

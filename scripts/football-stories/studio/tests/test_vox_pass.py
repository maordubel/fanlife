"""The object library (studio/objects.py) and the VOX pass (docu/vox.py), owner 17.11.2026: "lots of PNG objects …
VOX, transitions, animation, motion … the system chooses unrelated pictures"."""
import json
import tempfile
import unittest
from pathlib import Path

from studio import objects as O
from studio import media_index as MI
from studio.common import Palette
from studio.docu import editor as E
from studio.docu import vox as V


class Objects(unittest.TestCase):
    def test_a_line_asks_for_the_objects_it_names(self):
        self.assertEqual([k for k, _ in O.asked('They flew to Madrid with a ticket each.')], ['plane', 'ticket'])
        self.assertEqual(O.asked('A red card on 59 minutes.')[0][0], 'card')
        self.assertEqual([k for k, _ in O.asked('We sang until the final whistle.', 3)][:2], ['megaphone', 'whistle'])
        self.assertEqual(O.asked('and then it was over'), [])

    def test_a_weak_word_only_asks_when_nothing_stronger_does(self):
        got = [k for k, _ in O.asked('We went up to lift the trophy.', 3)]
        self.assertEqual(got[0], 'trophy')

    def test_every_object_prints_in_the_club_inks(self):
        pao = Palette('panathinaikos', 'Panathinaikos', '#007A3D', '#FFFFFF', ['red'])
        for k in O.OBJECTS:
            svg = O.svg_for(k, pao)
            self.assertTrue(svg.startswith('<svg'), k)
            self.assertNotIn('{', svg, k)
            if O.allowed(k, pao):
                self.assertNotIn(O.SIGNAL.lower(), svg.lower(), f'{k}: a rival colour on a Panathinaikos print')

    def test_a_red_card_is_not_offered_where_red_is_banned(self):
        self.assertFalse(O.allowed('card', Palette('panathinaikos', 'Panathinaikos', '#007A3D', '#FFFFFF', ['red'])))
        self.assertTrue(O.allowed('card', Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#B02D10', '#FFFFFF', ['yellow'])))

    def test_the_library_on_disk_matches_the_drawings(self):
        idx = json.loads((O.DIR / 'index.json').read_text())
        self.assertEqual(set(idx['objects']), set(O.OBJECTS))
        for k in O.OBJECTS:
            self.assertTrue((O.DIR / f'{k}.svg').exists(), k)
            self.assertTrue((O.DIR / 'png' / f'{k}.png').exists(), k)


class Relevance(unittest.TestCase):
    def test_the_caption_decides_between_two_pictures_with_no_subject(self):
        recs = [{'id': 'a', 'kind': 'still', 'path': __file__, 'clubs': [], 'subjects': [], 'moods': []},
                {'id': 'b', 'kind': 'still', 'path': __file__, 'clubs': [], 'subjects': [], 'moods': []}]
        MI._CAP_WORDS.update({'a': ({'supporters', 'train', 'station'}, set()), 'b': ({'trophy', 'parade'}, {'train'})})
        pk = MI.Picker({'records': recs})
        q = MI.beat_query({'n': 1, 'visual': {'type': 'illustration'}, 'narration': 'They took the train from the station at dawn.'})
        self.assertEqual(pk.pick_relevant(q)['id'], 'a')
        self.assertEqual(pk.relevance(recs[1], q), -1, 'a caption that says "not for" this line refuses it')
        q2 = MI.beat_query({'n': 2, 'visual': {'type': 'illustration'}, 'narration': 'Nothing here names a thing.'})
        self.assertIsNone(pk.pick_relevant(q2), 'nothing shows the line: no picture about something else')


def beat(n, t, d, text, kind='illustration', shots=None):
    ws = text.split()
    step = (d - 0.4) / len(ws)
    return {'t': t, 'd': d, 'shots': shots if shots is not None else [{'kind': 'image', 'src': 'p.jpg', 'move': 'push'}],
            'meta': {'n': n, 'type': kind, 'chapter': 1, 'words': [round(t + 0.2 + i * step, 3) for i in range(len(ws))]}}


class FakeAd:
    def __init__(self, texts):
        self.plan = {'shots': [{'n': n, 'narration': tx, 'start': 0.0} for n, tx in texts.items()]}
        self.cues = []
        self.design = None
        self.objects_used = set()

    def segment_picture(self, n, seg, text, k):
        return {'kind': 'image', 'src': f'seg{n}-{k}.jpg', 'move': 'push'}

    def object_device(self, seg_text, ws, t0, end):
        got = O.asked(seg_text, 2, self.objects_used)
        if not got:
            return None
        self.objects_used |= {k for k, _ in got}
        return {'kind': 'objects', 'items': [{'id': k, 'src': f'{k}.svg', 'at': 0.0, 'word': w.upper()} for k, w in got], 'dt': 0.3, 'd': 2.5, 'vox': True}

    def cue(self, n, at, kind):
        self.cues.append((n, at, kind))


class Pass(unittest.TestCase):
    TEXT = ('The season began in August with a long trip north. They took the train, three hundred supporters in four carriages. '
            'At the ground the gates opened late. Then the whistle went, and nobody sat down for ninety minutes. '
            'It ended 2–1, and the songs went on into the night.')

    def test_a_long_line_becomes_sentences_each_with_its_picture_and_its_idea(self):
        ad = FakeAd({1: self.TEXT})
        out = V.run([beat(1, 0.0, 24.0, self.TEXT)], ad)
        self.assertGreaterEqual(len(out), 4)
        for sg in out:
            self.assertGreaterEqual(sg['d'], V.SEG_MIN - 0.01)
            self.assertLessEqual(sg['d'], V.SEG_MAX * 1.6)
        self.assertTrue(all(any(x['kind'] == 'image' for x in sg['shots']) for sg in out), 'every sentence has a picture')
        accents = [x for sg in out[1:] for x in sg['shots'] if x.get('vox')]
        self.assertGreaterEqual(len(accents), len(out) - 2)
        self.assertIn('objects', {x['kind'] for x in accents})
        self.assertEqual(round(sum(sg['d'] for sg in out), 3), 24.0)
        self.assertTrue(ad.cues)

    def test_the_sentences_arrive_by_different_ways(self):
        out = V.run([beat(1, 0.0, 24.0, self.TEXT)], FakeAd({1: self.TEXT}))
        cut = E.cut(out)
        ways = [b['in'] for b in cut]
        self.assertGreaterEqual(len(set(ways[1:])), 3)
        self.assertFalse(E.errors(cut) and any('three times' in x for x in E.errors(cut)))

    def test_a_card_keeps_its_first_segment_and_a_short_line_keeps_its_one_picture(self):
        text = 'Chapter two begins in the cold. ' * 4
        ch = beat(1, 0.0, 14.0, text, 'chapter', [{'kind': 'ticket', 'small': 'CHAPTER TWO', 'big': 'X', 'line': '', 'd': 3.5}])
        short = beat(2, 14.0, 5.0, 'One short line, nothing else here.')
        out = V.run([ch, short], FakeAd({1: text, 2: 'One short line, nothing else here.'}))
        cards = [i for i, sg in enumerate(out) for x in sg['shots'] if x['kind'] == 'ticket']
        self.assertEqual(cards, [0], 'the chapter card is shown once, in the first segment')
        self.assertGreater(len(out), 2, 'the rest of the chapter line is cut into sentences')
        self.assertEqual(sum(1 for sg in out if sg['meta']['n'] == 2), 1)
        self.assertNotEqual(out[1]['meta']['type'], 'chapter', 'only the first segment arrives as a chapter (the dive)')

    def test_the_pass_can_be_switched_off(self):
        import os
        os.environ['STORIES_DOCU_VOX'] = '0'
        try:
            raw = [beat(1, 0.0, 24.0, self.TEXT)]
            self.assertIs(V.run(raw, FakeAd({1: self.TEXT})), raw)
        finally:
            os.environ.pop('STORIES_DOCU_VOX')


if __name__ == '__main__':
    unittest.main()


class Scenes(unittest.TestCase):
    def test_every_scene_prints_in_the_club_inks_and_never_a_rival_colour(self):
        from studio import scenes as S
        pao = Palette('panathinaikos', 'Panathinaikos', '#007A3D', '#FFFFFF', ['red'])
        for k in S.SCENES:
            svg = S.svg(k, pao, 'x')
            self.assertTrue(svg.startswith('<svg'), k)
            self.assertNotIn('{', svg, k)
            self.assertNotIn(O.SIGNAL.lower(), svg.lower(), k)
            self.assertIn('#007a3d', svg.lower(), k)

    def test_the_scenes_join_the_index_and_are_found_by_what_they_show(self):
        from studio import scenes as S
        hta = Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#B02D10', '#FFFFFF', ['yellow'])
        with tempfile.TemporaryDirectory() as d:
            recs = S.records(hta, Path(d))
            self.assertEqual(len(recs), len(S.SCENES))
            self.assertTrue(all(Path(r['path']).exists() and r['clubs'] == [] for r in recs))
            pk = MI.Picker({'records': recs}, 'hapoel-tel-aviv')
            q = MI.beat_query({'n': 1, 'visual': {'type': 'illustration'}, 'narration': 'The supporters bus left for the away trip at dawn.'})
            self.assertEqual(pk.pick_relevant(q)['id'], 'scene:hapoel-tel-aviv/road')
            q = MI.beat_query({'n': 2, 'visual': {'type': 'illustration'}, 'narration': 'Time was running out in the last minutes.'})
            self.assertEqual(pk.pick_relevant(q)['id'], 'scene:hapoel-tel-aviv/clock')

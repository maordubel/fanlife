"""Studio tests: python3 -m unittest discover -s scripts/football-stories -p 'test_*.py' (from the repository root).

They test behaviour the owner relies on — the fact guard, the evidence ledger, the script contract, captions, chapters,
the rival-colour rule, and the worker's conversation with the studio (against a fake studio server) — not rendering.
"""
from __future__ import annotations

import copy
import hashlib
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import package, worker  # noqa: E402
from studio.common import Palette, is_banned_pixel, read_json  # noqa: E402
from studio.research import build_ledger  # noqa: E402
from studio.script import fact_guard, numbers_in_text, validate_script  # noqa: E402

DOSSIER = HERE / 'studio' / 'dossiers' / 'hapoel-tel-aviv-1999-00.json'
PILOT = HERE / 'studio' / 'dossiers' / 'pilot-hapoel-1999-00.script.json'
LEDGER = build_ledger('hapoel-tel-aviv', '1999/00', read_json(DOSSIER)['claims'])


class Numbers(unittest.TestCase):
    def test_spelled_numbers_read_whole(self):
        cases = {'forty thousand people': {40000}, 'a hundred and twenty minutes': {120}, 'the eighty-fifth minute': {85},
                 'fifty-eight and sixty': {58, 60}, 'a two-one defeat': {2, 1}, 'twenty-six wins, seven draws': {26, 7},
                 'the second leg': set(), '1987/88': {1987, 88}, 'two thousand': {2000}}
        for text, want in cases.items():
            self.assertEqual(numbers_in_text(text), want, text)


class FactGuard(unittest.TestCase):
    def test_an_invented_number_is_caught(self):
        final = next(c['id'] for c in LEDGER['claims'] if c['fact'].get('stage') == 'Final')
        self.assertEqual(fact_guard('Two each after extra time.', LEDGER, [final]), [])
        self.assertTrue(fact_guard('Fifty thousand watched.', LEDGER, [final]))
        self.assertTrue(fact_guard('They scored three.', LEDGER, [final]))

    def test_counted_totals_from_cited_matches_pass(self):
        october = [c['id'] for c in LEDGER['claims'] if c['fact'].get('kind') == 'match' and c['fact']['date'].startswith('1999-10')
                   and c['fact']['competition'] == 'Israeli Premier League']
        self.assertEqual(fact_guard('Four games, four wins, fourteen goals.', LEDGER, october), [])
        self.assertTrue(fact_guard('Four games, four wins, fifteen goals.', LEDGER, october))


class Ledger(unittest.TestCase):
    def test_the_archive_and_the_published_table_agree(self):
        s = LEDGER['summary']['by_competition']['Israeli Premier League']
        table = next(c for c in LEDGER['claims'] if c['id'] == 'w-table-1999-00')['fact']['rows'][0]
        self.assertEqual((s['won'], s['drawn'], s['lost']), (26, 7, 6))
        self.assertEqual(s['won'] * 3 + s['drawn'], table['points'])
        self.assertEqual(s['for'] - s['against'], table['goal_difference'])

    def test_scorers_are_printed_only_when_every_goal_is_named(self):
        for c in LEDGER['claims']:
            f = c['fact']
            if f.get('kind') == 'match' and f['scorers'] is not None:
                self.assertEqual(len(f['scorers']), f['club_goals'], c['id'])

    def test_every_claim_has_a_source(self):
        for c in LEDGER['claims']:
            self.assertTrue(any(s.get('url') for s in c['sources']), c['id'])


class ScriptContract(unittest.TestCase):
    def setUp(self):
        self.s = read_json(PILOT)

    def test_the_pilot_passes(self):
        self.assertEqual(validate_script(self.s, LEDGER, 12), [])

    def test_each_rule_bites(self):
        def errs(mut):
            s = copy.deepcopy(self.s)
            mut(s)
            return ' | '.join(validate_script(s, LEDGER, 12))
        self.assertIn('ten title', errs(lambda s: s['title_candidates'].pop()))
        self.assertIn('search or discovery', errs(lambda s: s['title_candidates'][0].update(angle='clickbait')))
        self.assertIn('unknown claim', errs(lambda s: s['chapters'][0]['beats'][1]['visual'].update(claim='m_nope')))
        self.assertIn('needs a match claim', errs(lambda s: s['chapters'][0]['beats'][1]['visual'].update(claim='w-table-1999-00')))
        self.assertIn('number 7', errs(lambda s: s['chapters'][0]['beats'][1].update(narration='Seven goals that night.')))
        self.assertIn('hook', errs(lambda s: s.update(hook='Something else.')))
        self.assertIn('words', validate_script(self.s, LEDGER, 20)[0])
        self.assertIn('unknown prop', errs(lambda s: s['chapters'][0]['beats'][1]['visual'].update(prop='helicopter')))


class BeatArt(unittest.TestCase):
    """The owner's beat illustrations: only this film's set, colours kept, the rival's family scrubbed."""

    def test_keys_belong_to_the_films_own_set(self):
        from studio.script import art_ok
        ledger = {'club_id': 'hapoel-tel-aviv', 'season': '1999/00'}
        self.assertTrue(art_ok('beat:hapoel-tel-aviv-1999-00/referee-whistle', ledger))
        self.assertFalse(art_ok('beat:hapoel-tel-aviv-1999-00/no-such-piece', ledger))
        self.assertFalse(art_ok('beat:hapoel-tel-aviv-1999-00/../referee-whistle', ledger))
        self.assertFalse(art_ok('beat:hapoel-tel-aviv-1999-00/referee-whistle', {'club_id': 'celtic', 'season': '1999/00'}))
        self.assertFalse(art_ok('gen', ledger))
        self.assertTrue(art_ok('gen', ledger, allow_gen=True))

    def test_every_index_entry_has_its_file(self):
        from studio.paper import BEATS, beat_path
        for idx in BEATS.glob('*/index.json'):
            data = json.loads(idx.read_text(encoding='utf-8'))
            self.assertEqual(idx.parent.name, data['set'])
            self.assertTrue(data['pieces'])
            for p in data['pieces']:
                self.assertIsNotNone(beat_path(p['key']), p['key'])

    def test_scrub_removes_the_banned_family_and_keeps_the_club_red(self):
        from PIL import Image
        from studio.paper import scrub
        im = Image.new('RGB', (4, 1))
        im.putdata([(230, 200, 30), (176, 45, 16), (240, 240, 230), (200, 150, 40)])
        out = list(scrub(im, ['yellow']).getdata())
        self.assertFalse(is_banned_pixel(out[0], ['yellow']))
        self.assertFalse(is_banned_pixel(out[3], ['yellow']))
        self.assertEqual(out[1], (176, 45, 16))

    def test_common_pieces_serve_any_club(self):
        from studio.script import art_ok
        celtic = {'club_id': 'celtic', 'season': '1966/67'}
        self.assertTrue(art_ok('beat:common/tunnel-walk-out', celtic))
        self.assertTrue(art_ok('clip:common/corner-flag-night', celtic))
        self.assertFalse(art_ok('clip:hapoel-tel-aviv-1999-00/stadium-assembles-tunnel', celtic))

    def test_key_red_takes_the_club_colour(self):
        from PIL import Image
        from studio.common import family
        from studio.paper import KEY_RED, recolor
        im = Image.new('RGB', (2, 1))
        im.putdata([tuple(int(KEY_RED[i:i + 2], 16) for i in (1, 3, 5)), (240, 236, 220)])
        out = list(recolor(im, '#006B3F').getdata())
        self.assertEqual(family(out[0]), 'green')
        self.assertEqual(out[1], (240, 236, 220))

    def test_a_clip_plays_once_and_holds_its_last_frame(self):
        import subprocess
        from studio.paper import ClipWorld
        with tempfile.TemporaryDirectory() as d:
            src = Path(d) / 'c.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=25:duration=0.4',
                            '-pix_fmt', 'yuv420p', str(src)], check=True)
            c = ClipWorld(src, ['yellow'], 0.4, size=(160, 90))
            first, last = c(0), c(9)
            self.assertEqual(first.size, (160, 90))
            self.assertIs(c(40), c(60))
            self.assertTrue(c.done)
            self.assertFalse(any(is_banned_pixel(px, ['yellow']) for px in last.getdata()))

    def test_pilot_script_uses_beat_art_and_stays_valid(self):
        s = read_json(Path(__file__).parents[1] / 'dossiers' / 'pilot-hapoel-1999-00.script.json')
        keys = [b['visual'].get('art') or b['visual'].get('backdrop') for c in s['chapters'] for b in c['beats']]
        self.assertGreater(sum(1 for k in keys if str(k).startswith('beat:')), 30)
        for a, b in zip(keys, keys[1:]):
            if str(a).startswith('beat:'):
                self.assertNotEqual(a, b)


class EnglishSources(unittest.TestCase):
    def test_hebrew_source_titles_become_english(self):
        from studio.package import english_title
        self.assertEqual(english_title('ויקיפועל — טבלת Games', 'https://wiki.red-fans.com/index.php?title=x'),
                         "Vikipoel, the Hapoel Tel Aviv supporters' wiki")
        self.assertEqual(english_title('1999–2000 Israel State Cup — Wikipedia (2–2, 4–2 בפנדלים)', 'https://en.wikipedia.org/wiki/x'),
                         '1999–2000 Israel State Cup — Wikipedia')


class BurnedCaptions(unittest.TestCase):
    def test_lines_break_where_the_narrator_breathes(self):
        from studio.captions import MAX_CHARS, Captions
        text = 'Dean Računica scored in the eighty-fifth minute. Into extra time, and Salim Toama.'
        ws = [{'w': w, 'start': i * 0.3, 'end': i * 0.3 + 0.28} for i, w in enumerate(text.split())]
        c = Captions(ws, 1.0, '#B02D10')
        lines = [' '.join(w['w'] for w in g) for g in c.groups]
        self.assertTrue(all(len(x) <= MAX_CHARS for x in lines))
        self.assertTrue(lines[1].endswith('minute.'))
        self.assertIsNone(c(0.5))                       # before the narrator speaks
        im, x, y = c(1.0 + 0.65)
        self.assertGreater(im.width, 200)
        self.assertGreater(y, 800)                      # the bottom of the frame


class CutOuts(unittest.TestCase):
    def test_every_cutout_has_its_file_alpha_and_a_motion(self):
        from PIL import Image
        from studio.paper import cut_index, cut_path
        pieces = cut_index('common')
        self.assertGreater(len(pieces), 40)
        for p in pieces:
            path = cut_path(p['key'])
            self.assertIsNotNone(path, p['key'])
            self.assertIn(p['motion'], {'row', 'run', 'dive', 'jump', 'rise', 'pop', 'stand'})
        im = Image.open(cut_path(pieces[0]['key']))
        self.assertEqual(im.mode, 'RGBA')
        self.assertLess(min(im.getchannel('A').getdata()), 10)

    def test_a_figure_in_a_script_must_exist(self):
        from studio.script import art_ok
        L = {'club_id': 'celtic', 'season': '1966/67'}
        self.assertTrue(art_ok('cut:common/fig-keeper-dive-n', L))
        self.assertFalse(art_ok('cut:common/fig-nobody-n', L))


class ClosingCall(unittest.TestCase):
    def test_every_film_ends_on_the_site(self):
        from studio.script import CTA, SITE, with_cta
        s = {'chapters': [{'title': 'x', 'beats': [{'narration': 'a', 'claim_ids': [], 'visual': {'type': 'turning'}}]}]}
        self.assertEqual(with_cta(copy.deepcopy(s))['chapters'][-1]['beats'][-1]['narration'], CTA)
        s['chapters'][0]['beats'].append({'narration': 'goodbye', 'claim_ids': [], 'visual': {'type': 'end'}})
        out = with_cta(copy.deepcopy(s))
        self.assertEqual(out['chapters'][0]['beats'][-1]['visual']['type'], 'end')
        self.assertIn(SITE, out['chapters'][0]['beats'][-1]['narration'])
        self.assertIn('subscribe', CTA)

    def test_every_film_asks_once_to_follow_after_the_second_chapter(self):
        from studio.script import FOLLOW, with_cta
        beat = lambda n: {'narration': n, 'claim_ids': [], 'visual': {'type': 'turning'}}
        s = {'chapters': [{'title': 'a', 'beats': [beat('1')]}, {'title': 'b', 'beats': [beat('2'), beat('3')]}, {'title': 'c', 'beats': [beat('4')]}]}
        out = with_cta(copy.deepcopy(s), 'celtic-2002/03')
        follows = [(ci, b) for ci, ch in enumerate(out['chapters']) for b in ch['beats'] if b['visual']['type'] == 'follow']
        self.assertEqual(len(follows), 1)
        self.assertEqual(follows[0][0], 1)
        self.assertEqual(out['chapters'][1]['beats'][-1]['visual']['type'], 'follow')
        self.assertIn(follows[0][1]['narration'], FOLLOW)
        twice = with_cta(copy.deepcopy(out), 'celtic-2002/03')     # idempotent: never two calls in one film
        self.assertEqual(sum(b['visual']['type'] == 'follow' for ch in twice['chapters'] for b in ch['beats']), 1)
        for line in FOLLOW:                                          # a supporter's invitation: no number but one and ninety
            self.assertIn('subscribe', line.lower())
            self.assertTrue(numbers_in_text(line) <= {1, 90})


class Packaging(unittest.TestCase):
    plan = {'duration': 100, 'chapters': [{'t': 0.0, 'title': 'A'}, {'t': 5.0, 'title': 'B'}, {'t': 30, 'title': 'C'}, {'t': 60, 'title': 'D'}],
            'shots': [{'voice_at': 1.0, 'words': [{'w': w, 'start': i * 0.4, 'end': i * 0.4 + 0.35} for i, w in enumerate(
                ('This sentence is long enough to need more than one caption line on screen. And a second one follows it here.').split())]}]}

    def test_chapters_follow_youtube_rules(self):
        ch = package.chapters(self.plan)
        self.assertEqual(ch[0]['t'], 0.0)
        self.assertEqual([c['title'] for c in ch], ['A', 'C', 'D'])  # B is under ten seconds after A

    def test_captions_are_short_ordered_lines(self):
        cues = package.captions(self.plan)
        self.assertTrue(cues)
        for a, b in zip(cues, cues[1:]):
            self.assertLessEqual(a['end'], b['start'])
        for c in cues:
            self.assertLessEqual(len(c['lines']), 2)
            self.assertTrue(all(len(l) <= 46 for l in c['lines']))

    def test_synthetic_disclosure_follows_the_assets(self):
        self.assertFalse(package.synthetic_decision({'assets': [{'photoreal': False}], 'voice': {}})['altered_or_synthetic'])
        self.assertTrue(package.synthetic_decision({'assets': [{'photoreal': True}], 'voice': {}})['altered_or_synthetic'])
        self.assertTrue(package.synthetic_decision({'assets': [], 'voice': {'cloned_real_person': True}})['altered_or_synthetic'])


class RivalColours(unittest.TestCase):
    def test_a_rival_colour_cannot_be_the_film_colour(self):
        with self.assertRaises(ValueError):
            Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#F5C518', bans=['yellow'])
        p = Palette('olympiacos', 'Olympiacos', '#D71920', bans=['green'])
        self.assertEqual(p.accent, '#D71920')

    def test_paper_is_not_yellow_but_gold_is(self):
        self.assertFalse(is_banned_pixel((244, 236, 216), ['yellow']))
        self.assertTrue(is_banned_pixel((216, 178, 92), ['yellow']))


class FakeStudio(BaseHTTPRequestHandler):
    state: dict = {}

    def log_message(self, *a):
        pass

    def do_POST(self):
        b = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        st = FakeStudio.state
        st['calls'].append(b)
        if self.headers.get('Authorization') != 'Bearer ' + 'x' * 40:
            self.send_response(401)
            self.end_headers()
            return
        op = b.get('op')
        if op == 'claim':
            out = {'job': st['job']}
        elif op == 'progress':
            out = {'control': st.get('control', 'continue')}
        elif op == 'upload_urls':
            out = {'urls': {n: f'http://127.0.0.1:{self.server.server_port}/put/{n}' for n in b['names']}}
        elif op == 'finish':
            st['finish'] = b
            out = {'job': {}}
        else:
            out = {}
        data = json.dumps(out).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_PUT(self):
        n = self.path.split('/put/')[1]
        FakeStudio.state['puts'][n] = self.rfile.read(int(self.headers['Content-Length']))
        self.send_response(200)
        self.end_headers()


class WorkerConversation(unittest.TestCase):
    def setUp(self):
        FakeStudio.state = {'calls': [], 'puts': {}, 'job': {'id': 'job-0000001', 'palette': {'club_id': 'x', 'club_name': 'X', 'primary': '#B02D10', 'bans': []},
                                                            'brief': {'club_id': 'x', 'club_name': 'X', 'season': '1999/00', 'duration': 1, 'review': 'auto'}}}
        self.srv = HTTPServer(('127.0.0.1', 0), FakeStudio)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.tmp = tempfile.TemporaryDirectory()
        self.st = worker.Studio(f'http://127.0.0.1:{self.srv.server_port}', 'x' * 40, 'test-worker')

    def tearDown(self):
        self.srv.shutdown()
        self.srv.server_close()
        self.tmp.cleanup()

    def fake_pipeline(self, size=100 * 1024 * 1024):
        def run(job_dir, brief, palette, progress=None, script_file=None):
            progress('research', 0.0, 'r')
            progress('edit', 0.5, 'e')
            out = job_dir / 'out'
            out.mkdir(parents=True)
            (out / 'master.mp4').write_bytes(os.urandom(size))
            for f in ['preview.mp4', 'captions.en.srt', 'captions.en.vtt', 'thumbnail-1.jpg']:
                (out / f).write_bytes(b'x')
            (out / 'qa.json').write_text(json.dumps({'ok': True, 'checks': [], 'render_minutes': 1}))
            (out / 'youtube.json').write_text(json.dumps({'title': 't'}))
            (job_dir / 'voice.json').write_text(json.dumps({'provider': 'kokoro'}))
            return {'state': 'ready'}
        return run

    def test_a_film_is_stored_in_chunks_that_rebuild_the_master_exactly(self):
        from studio import pipeline
        orig = pipeline.run
        pipeline.run = self.fake_pipeline()
        try:
            self.assertTrue(worker.run_once(self.st, Path(self.tmp.name), lambda m: None))
        finally:
            pipeline.run = orig
        fin = FakeStudio.state['finish']
        self.assertEqual(fin['state'], 'ready')
        chunks = fin['artefacts']['master']['chunks']
        self.assertEqual(len(chunks), 3)  # 100 MB in 45 MB parts
        joined = b''.join(FakeStudio.state['puts'][c['path'].split('/')[-1]] for c in chunks)
        self.assertEqual(hashlib.sha256(joined).hexdigest(), fin['artefacts']['master']['sha256'])
        self.assertTrue(all(len(FakeStudio.state['puts'][c['path'].split('/')[-1]]) <= worker.CHUNK for c in chunks))

    def test_a_cancel_stops_at_the_next_checkpoint_without_finishing(self):
        from studio import pipeline
        FakeStudio.state['control'] = 'cancel'
        orig = pipeline.run
        pipeline.run = self.fake_pipeline(10)
        try:
            worker.run_once(self.st, Path(self.tmp.name), lambda m: None)
        finally:
            pipeline.run = orig
        self.assertNotIn('finish', FakeStudio.state)
        self.assertFalse(FakeStudio.state['puts'])

    def test_a_failed_stage_is_reported_with_its_code(self):
        from studio import pipeline
        from studio.common import StageError

        def boom(*a, **k):
            raise StageError('WRITER_NOT_CONFIGURED', 'no key')
        orig = pipeline.run
        pipeline.run = boom
        try:
            worker.run_once(self.st, Path(self.tmp.name), lambda m: None)
        finally:
            pipeline.run = orig
        self.assertEqual(FakeStudio.state['finish']['error']['code'], 'WRITER_NOT_CONFIGURED')
        self.assertFalse(FakeStudio.state['finish']['error']['retryable'])

    def test_a_wrong_secret_is_refused(self):
        bad = worker.Studio(self.st.base, 'y' * 40, 'w')
        with self.assertRaises(Exception):
            bad.call({'op': 'claim'})


class ClubPacks(unittest.TestCase):
    """Every other club reads its compiled FAN LIFE pack: approved, sourced rows of the season, named as they were then."""

    def pack(self):
        from studio import research
        m = lambda i, on, name, score, comp, sc=(): {'id': i, 'value': {'name': name, 'on': on, 'competition': comp, 'score': score,
                                                                        'scorers': [{'name': n, 'minute': mi} for n, mi in sc], 'sport': 'football'},
                                                    'sources': ['s1'], 'confidence': 2, 'status': 'approved'}
        data = {'identity': {'name': 'Celtic', 'country': 'Scotland'}, 'sources': [{'id': 's1', 'title': 'UEFA', 'url': 'https://www.uefa.com/x'}],
                'matches': [m('a', '2002-11-28', 'Celtic 1-0 Celta', '1-0', 'UEFA Europa League', [('Henrik Larsson', 52)]),
                            m('b', '2002-12-12', 'Celta 2-1 Celtic', '2-1', 'UEFA Europa League', [('John Hartson', 37)]),
                            m('c', '2003-05-21', 'Celtic 2-3 FC Porto', '2-3', 'UEFA Cup final', [('Henrik Larsson', 47)]),
                            m('d', '1990-01-01', 'Celtic 1-0 Rangers', '1-0', 'League')]}
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        Path(tmp.name, 'celtic.json').write_text(json.dumps({'data': data}), encoding='utf-8')
        old = research.COMPILED
        research.COMPILED = Path(tmp.name)
        self.addCleanup(lambda: setattr(research, 'COMPILED', old))
        return research.build_ledger('celtic', '2002/03')

    def test_a_season_reads_its_own_rows_with_then_names(self):
        L = self.pack()
        f = {c['id']: c['fact'] for c in L['claims']}
        self.assertEqual(sorted(f), ['a', 'b', 'c'])
        self.assertEqual(f['a']['competition'], 'UEFA Cup')          # UEFA files it as the Europa League; in 2002 it was not
        self.assertEqual((f['c']['competition'], f['c']['stage']), ('UEFA Cup', 'Final'))
        self.assertEqual((f['b']['side'], f['b']['club_goals'], f['b']['outcome']), ('away', 1, 'loss'))
        self.assertIsNone(f['c']['scorers'])                         # two goals, one named: nobody is printed
        self.assertEqual(L['country'], 'Scotland')

    def test_a_second_leg_knows_who_went_through(self):
        from studio.edit import Editor
        L = self.pack()
        e = Editor.__new__(Editor)
        e.ledger = L
        f = {c['id']: c['fact'] for c in L['claims']}
        self.assertIsNone(e.tie_through(f['a']))
        self.assertTrue(e.tie_through(f['b']))                       # 2-2 on aggregate, one away goal to none
        self.assertIsNone(e.tie_through(f['c']))

    def modern(self):
        from studio import research
        def m(i, on, name, score, comp, sc=(), src='s1', conf=2):
            return {'id': i, 'value': {'name': name, 'on': on, 'competition': comp, 'score': score, 'sport': 'football',
                                       'venue': 'TSC Arena, Backa Topola' if i == 'r2' else None,
                                       'scorers': [{'name': n, 'minute': mi} for n, mi in sc]},
                    'sources': [src], 'confidence': conf, 'status': 'approved'}
        data = {'identity': {'name': 'Olympiacos', 'country': 'Greece'},
                'sources': [{'id': 's1', 'title': 'UEFA', 'url': 'https://www.uefa.com/match/1'}, {'id': 's2', 'title': 'Other', 'url': 'https://example.org/x'}],
                'matches': [m('a1', '2024-03-07', 'Olympiacos 1-4 M. Tel-Aviv', '1-4', 'UEFA Conference League', [('El Kaabi', 13)]),
                            m('r1', '2024-03-07', 'Olympiacos 1-4 Maccabi Tel Aviv', '1-4', 'UEFA Conference League round of 16, first leg', src='s2', conf=3),
                            m('a2', '2024-03-14', 'M. Tel-Aviv 1-2 Olympiacos', '1-2', 'UEFA Conference League', [('Podence', 10), ('El Kaabi', 45)]),
                            m('r2', '2024-03-14', 'Maccabi Tel Aviv 1-2 Olympiacos (after extra time)', '1-2', 'UEFA Conference League round of 16, second leg', [('Podence', 10), ('El Kaabi', 48)], src='s2', conf=3),
                            m('f1', '2024-04-11', 'Olympiacos 3-2 Fenerbahçe', '3-2', 'UEFA Conference League'),
                            m('f2', '2024-04-18', 'Fenerbahce 1-0 Olympiacos (Olympiacos won 3-2 on penalties)', '1-0', 'UEFA Conference League quarter-final, second leg', src='s2')]}
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        Path(tmp.name, 'olympiacos.json').write_text(json.dumps({'data': data}), encoding='utf-8')
        old = research.COMPILED
        research.COMPILED = Path(tmp.name)
        self.addCleanup(lambda: setattr(research, 'COMPILED', old))
        return research.build_ledger('olympiacos', '2023/24')

    def test_one_match_twice_is_one_match(self):
        L = self.modern()
        f = {c['id']: c for c in L['claims']}
        self.assertEqual(sorted(f), ['a1', 'a2', 'f1', 'f2'])          # two waves of one night are one night
        a2 = f['a2']['fact']
        self.assertEqual(a2['opponent'], 'Maccabi Tel Aviv')            # the full name, not 'M. Tel-Aviv'
        self.assertEqual([x['minute'] for x in a2['scorers']], [10, 45])  # UEFA's own record keeps its minutes
        self.assertEqual((a2['stage'], a2['after_extra_time'], a2['venue']), ('Round of 16, second leg', True, {'name': 'TSC Arena, Backa Topola'}))
        self.assertEqual(f['a2']['also_ids'], ['r2'])
        self.assertEqual(f['a2']['confidence'], 3)
        self.assertEqual(a2['competition'], 'UEFA Europa Conference League')  # its name in 2023/24
        self.assertEqual(L['summary']['by_competition']['UEFA Europa Conference League']['played'], 4)

    def test_a_shootout_in_the_name_is_a_shootout(self):
        from studio.edit import Editor
        from studio.maps import place_of
        L = self.modern()
        f = {c['id']: c['fact'] for c in L['claims']}
        self.assertEqual(f['f2']['opponent'], 'Fenerbahce')
        self.assertEqual(f['f2']['penalties'], {'winner': 'Olympiacos', 'score': '3–2'})
        e = Editor.__new__(Editor)
        e.ledger = L
        self.assertTrue(e.won_shootout(f['f2']))
        self.assertIsNone(e.tie_through(f['f2']))                       # level on aggregate in 2023/24: no away goals any more
        self.assertEqual(place_of(f['a2'], 'Olympiacos')[0], 'Bačka Topola')  # a neutral ground pins where it was played
        self.assertEqual(place_of(f['a1'], 'Olympiacos')[0], 'Tel Aviv')



class QuotesAndPress(unittest.TestCase):
    """A quote is the speaker's own words and a cutting is the headline as it ran — checked against the claim, not typed."""

    def ledger(self):
        return {'club_id': 'x', 'season': '2023/24', 'summary': {}, 'claims': [
            {'id': 'q', 'type': 'quote', 'fact': {'kind': 'quote', 'speaker': 'Robbie Keane', 'text': "All in all, we are just at halftime."},
             'sources': [{'url': 'https://example.org/q'}]},
            {'id': 'p', 'type': 'press', 'fact': {'kind': 'press', 'outlet': 'RTÉ', 'headline': 'Out after squandering three-goal lead'},
             'sources': [{'url': 'https://example.org/p'}]}]}

    def errs(self, v):
        from studio import script as S
        s = {'chapters': [{'title': 'a', 'beats': [{'narration': 'He said it.', 'claim_ids': [v['claim']], 'visual': v}]}]}
        return [e for e in S.validate_script(s, self.ledger(), 0.1) if e.startswith('Chapter')]

    def test_a_quote_must_be_word_for_word(self):
        self.assertEqual(self.errs({'type': 'quote', 'claim': 'q', 'text': 'all in all, we are just at halftime', 'who': 'Robbie Keane'}), [])
        self.assertTrue(any('word for word' in e for e in self.errs({'type': 'quote', 'claim': 'q', 'text': 'We are winning.', 'who': 'Robbie Keane'})))
        self.assertTrue(any('speaker' in e for e in self.errs({'type': 'quote', 'claim': 'q', 'text': 'we are just at halftime', 'who': 'Keane'})))

    def test_a_cutting_prints_the_headline_as_it_ran(self):
        self.assertEqual(self.errs({'type': 'press', 'claim': 'p', 'outlet': 'RTÉ', 'headline': 'Out after squandering three-goal lead'}), [])
        self.assertTrue(any('exactly' in e for e in self.errs({'type': 'press', 'claim': 'p', 'outlet': 'RTÉ', 'headline': 'Out!'})))


class ArtDrops(unittest.TestCase):
    def test_masked_text_is_unreadable_and_families_are_measured(self):
        import numpy as np
        from PIL import Image, ImageDraw
        from studio import kit_ingest
        im = Image.new('RGB', (400, 200), (240, 230, 210))
        d = ImageDraw.Draw(im)
        for y in range(20, 90, 12):
            d.text((20, y), 'AMKA 20091303170 NAME', fill=(0, 0, 0))
        im.paste((20, 160, 40), (0, 120, 400, 200))  # a green strip: a pitch
        out = kit_ingest.blur_out(im, [[10, 10, 300, 100]])
        before = np.asarray(im.crop((10, 10, 300, 100)).convert('L'), 'float32').std()
        after = np.asarray(out.crop((10, 10, 300, 100)).convert('L'), 'float32').std()
        self.assertLess(after, before / 4)
        self.assertIn('green', kit_ingest.families(im))


class ClubSpellings(unittest.TestCase):
    def test_a_pack_name_and_a_season_label_are_read_as_the_club_and_the_competition(self):
        from studio import research
        self.assertIn('Olympiakos Piraeus', research._club_names('olympiacos'))
        self.assertEqual(research._uefa_comp('Greek Super League 2023/24', '2023/24'), ('Greek Super League', None))


if __name__ == '__main__':
    unittest.main()

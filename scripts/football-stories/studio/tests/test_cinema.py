"""The cinema (Director's Cut, workstream B — docs/fanlife/66-directors-cut.md §2–§4).

Every new visual builds a shot that moves; what it prints comes from the claims; the scorebug counts right; a beat that
names a match shows its score; rival colours never print; the old scripts still render. No network, no Chromium: the
old cards are drawn by a stand-in sprite factory, the new graphics are PIL.
"""
from __future__ import annotations

import copy
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(HERE))

from studio import audio, cinema  # noqa: E402
from studio.cinema import look, shots, story as cstory, type as ctype
cdirect = sys.modules['studio.cinema.direct']  # the module (the package exports the plan function as direct_plan)  # noqa: E402
from studio.cinema.stills import stand_in_voice  # noqa: E402
from studio.common import FPS, Palette  # noqa: E402
from studio.edit import Editor  # noqa: E402
from studio.motion import ShotRenderer, blend_entry  # noqa: E402
from studio.research import build_ledger  # noqa: E402

SRC = [{'title': 'Test source', 'url': 'https://example.org/match'}]


def match(i, date, opp, side, cg, og, comp='Test League', scorers=None, stage=None):
    home, away = ('Test FC', opp) if side == 'home' else (opp, 'Test FC')
    sh, sa = (cg, og) if side == 'home' else (og, cg)
    return {'id': f'm{i}', 'type': 'match', 'sources': SRC, 'fact': {
        'kind': 'match', 'date': date, 'competition': comp, 'stage': stage, 'club': 'Test FC', 'opponent': opp, 'side': side,
        'home': home, 'away': away, 'score_home': sh, 'score_away': sa, 'club_goals': cg, 'opponent_goals': og,
        'outcome': 'win' if cg > og else 'draw' if cg == og else 'loss', 'venue': {'name': 'Test Park'} if side == 'home' else None,
        'scorers': scorers}}


def ledger(neutral=False):
    ms = [
        match(1, '2002-08-10', 'Alpha', 'home', 2, 0, scorers=[{'name': 'Ann Ball', 'minute': 12}, {'name': 'Ben Shot', 'minute': 88}]),
        match(2, '2002-08-17', 'Rival United', 'away', 1, 1),
        match(3, '2002-08-24', 'Gamma', 'home', 3, 2, scorers=[{'name': 'Ann Ball', 'minute': 20}, {'name': 'Cy Head', 'minute': 40},
                                                             {'name': 'Ben Shot', 'minute': 90}]),
        match(4, '2002-09-01', 'Delta', 'away', 0, 1),
        match(5, '2002-09-08', 'Epsilon', 'home', 4, 1, comp='Test Cup'),
        match(6, '2002-09-15', 'Zeta', 'away', 2, 1),
        match(7, '2002-09-22', 'Eta', 'home', 1, 0),
        match(8, '2002-09-29', 'Rival United', 'home', 2, 1),
        match(9, '2002-10-06', 'Theta', 'away', 0, 0),
        match(10, '2002-10-13', 'Iota', 'home', 5, 0),
    ]
    base = {'version': 1, 'club_id': 'test-fc', 'club_name': 'Test FC', 'season': '2002/03', 'claims': [], 'held': [],
            'rivals': ['Rival United'], **({'neutral': True} if neutral else {})}
    return build_ledger('test-fc', '2002/03', ms, base=base)


def script(director=None):
    beat = lambda n, v, ids=(), **k: {'narration': n, 'claim_ids': list(ids), 'visual': v, **k}  # noqa: E731
    all_ids = [f'm{i}' for i in range(1, 11)]
    s = {'title_candidates': [{'title': 'x', 'angle': 'search'}], 'selected': 0, 'hook': 'x', 'chapters': [
        {'title': 'Cold open', 'beats': [
            beat('Two wins. One goal at the death.', {'type': 'trailer', 'lines': ['One season.', 'Ten nights.']}, pace='fast'),
            beat('Gamma came to Test Park.', {'type': 'versus', 'claim': 'm3'}, ['m3'], camera='orbit'),
            beat('Ninety minutes gone. Ben Shot.', {'type': 'goal', 'claim': 'm3', 'scorer': 2}, ['m3'], sfx='roar'),
        ]},
        {'title': 'The season', 'beats': [
            beat('Then it began.', {'type': 'chapter', 'number': 1, 'title': 'The season'}),
            beat('In August the derby ended level.', {'type': 'illustration', 'art': 'terrace-crowd', 'caption': 'August'}, ['m2']),
            beat('The first five.', {'type': 'form', 'label': 'August to September', 'claims': all_ids[:5]}, all_ids[:5]),
            beat('Wins minus defeats.', {'type': 'race', 'label': 'The season', 'mark': ['m4', 'm8']}, ['m4', 'm8']),
            beat('Three wins in a row.', {'type': 'run', 'label': 'September', 'claims': ['m5', 'm6', 'm7']}, ['m5', 'm6', 'm7']),
            beat('The league record.', {'type': 'record', 'claim': 'summary:Test League', 'label': 'The league'}, ['summary:Test League']),
            beat('And then Delta.', {'type': 'score', 'claim': 'm4'}, ['m4']),
        ]}]}
    if director:
        s['director'] = director
    return s


class StubSprites:
    """Stands in for the Chromium sprite factory: every card is a plain plate of the right kind."""

    def __init__(self, out: Path):
        self.out = out

    def __getattr__(self, name):
        def make(key='x', *a, **k):
            p = self.out / f'stub-{name}.png'
            if not p.exists():
                Image.new('RGBA', (600, 300), (244, 236, 216, 255)).save(p)
            return p
        return make


PAL = Palette('test-fc', 'Test FC', '#007A3D', '#FFFBF2', ['red', 'yellow'])


TEMP: list[Path] = []


def tearDownModule():
    import shutil
    for d in TEMP:
        shutil.rmtree(d, ignore_errors=True)


def editor(led=None, scr=None, pal=PAL):
    d = Path(tempfile.mkdtemp(prefix='cinema-test-'))
    TEMP.append(d)
    (d / 'sprites').mkdir()
    led = led or ledger()
    scr = scr or script()
    return Editor(d, led, scr, stand_in_voice(scr), pal, d / 'art'), d


def banned_share(arr, bans):
    a = arr.astype('float32') / 255
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    ok = (sat >= 0.35) & (mx >= 0.35) & (mx > mn)
    fam = {'red': (h <= 18) | (h >= 342), 'yellow': (h >= 38) & (h <= 70), 'green': (h >= 90) & (h <= 170),
           'blue': (h >= 190) & (h <= 260)}
    hit = np.zeros(mx.shape, bool)
    for f in bans:
        hit |= fam[f]
    return float((hit & ok).mean())


class Story(unittest.TestCase):
    def test_the_block_is_counted_from_the_claims(self):
        st = cstory.computed(ledger())
        self.assertEqual([m['form'] for m in st['matches']], [1, 1, 2, 1, 2, 3, 4, 5, 5, 6])
        self.assertEqual(st['matches'][2]['gd'], 2 + 0 + 1)
        tags = {m['id']: m['tags'] for m in st['matches']}
        self.assertIn('late-winner', tags['m3'])      # the third goal (opponent 2 + 1) came at 90
        self.assertNotIn('late-winner', tags['m1'])   # 2–0: the winner was the 12th-minute goal
        self.assertIn('derby', tags['m2'])
        self.assertIn('biggest-win', tags['m10'])
        self.assertIn({'kind': 'wins', 'from': 'm5', 'to': 'm8', 'length': 4}, st['runs'])

    def test_the_directors_block_wins_when_present(self):
        led = ledger()
        led['story'] = {'matches': [], 'acts': [{'name': 'Act I', 'ids': []}]}
        self.assertIs(cstory.story_of(led), led['story'])


class NewVisuals(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ed, cls.dir = editor()
        cls.plan = cls.ed.plan()
        cls.by = {s['visual']['type']: s for s in cls.plan['shots']}

    def frames(self, s, ts):
        shot = self.ed.build(StubSprites(self.dir), s)
        r = ShotRenderer(shot)
        return shot, [r.frame(min(shot.frames - 1, int(t * FPS))) for t in ts]

    def test_every_new_visual_builds_a_shot_that_moves(self):
        for kind in cinema.TYPES:
            s = self.by[kind]
            shot, fr = self.frames(s, [0.5, s['frames'] / FPS * 0.55, s['frames'] / FPS - 0.1])
            self.assertTrue(shot.meta.get('cinema'), kind)
            cam = [shot.camera(t) for t in (0.0, shot.duration * 0.5, shot.duration)]
            self.assertNotEqual(cam[0], cam[-1], f'{kind}: the camera must move')
            self.assertGreater(np.abs(fr[0].astype(int) - fr[2].astype(int)).mean(), 2.0, f'{kind}: the picture must change')
            self.assertEqual(banned_share(fr[1], PAL.bans), 0.0, f'{kind}: a rival colour printed')

    def test_a_shot_lasts_long_enough_for_its_animation(self):
        for kind in ('goal', 'versus', 'race'):
            self.assertGreaterEqual(self.by[kind]['frames'] / FPS, cinema.MIN_DUR[kind] - 0.05)

    def test_what_prints_comes_from_the_claims(self):
        printed: list[str] = []
        real = ctype.text

        def spy(s, *a, **k):
            printed.append(s)
            return real(s, *a, **k)
        allowed = set()
        for c in self.ed.ledger['claims']:
            f = c['fact']
            for v in (f['score_home'], f['score_away'], f['club_goals'], f['opponent_goals']):
                allowed.add(str(v))
            y, m_, d = f['date'].split('-')
            allowed |= {y, str(int(d)), m_}
            for g in f.get('scorers') or []:
                allowed.add(str(g['minute']))
        for v in self.ed.ledger['summary']['by_competition'].values():
            allowed |= {str(v[k]) for k in ('played', 'won', 'drawn', 'lost', 'for', 'against')}
        allowed |= {str(i) for i in range(0, 11)}  # running counts (tiles landed, tallies) over at most ten matches
        allowed |= {'2002', '03', '00'}             # the season label, a clock's seconds
        import studio.cinema.shots as sh_mod
        import studio.cinema.gfx as g_mod
        sh_mod.text, g_mod.text = spy, spy
        try:
            for kind in ('versus', 'goal', 'form', 'run', 'record', 'race'):
                self.frames(self.by[kind], [0.6, 2.5, self.by[kind]['frames'] / FPS - 0.1])
        finally:
            sh_mod.text, g_mod.text = real, real
        # the goal clock runs to the minute (mm:ss): time passing, never a fact — it must stop at the claim's minute
        clocks = [s for s in printed if re.fullmatch(r'\d\d:\d\d', s)]
        self.assertTrue(clocks)
        self.assertLessEqual(max(int(c[:2]) for c in clocks), 90)
        nums = {n for s in printed if s not in clocks for n in re.findall(r'\d+', s)}
        self.assertTrue(nums)
        self.assertLessEqual(nums - allowed, set(), f'numbers on screen that no claim holds: {nums - allowed}')
        self.assertIn('BEN SHOT', ' '.join(printed))       # the goal prints the claim's scorer
        self.assertIn('GAMMA', ' '.join(printed))          # the face-off prints the claim's opponent

    def test_a_goal_on_a_clean_sheet_ticks_the_running_score(self):
        ed, _ = editor()
        ed.by['m1']['fact']['scorers'] = [{'name': 'Ann Ball', 'minute': 12}, {'name': 'Ben Shot', 'minute': 88}]
        s = copy.deepcopy(self.by['goal'])
        s['visual'] = {'type': 'goal', 'claim': 'm1', 'scorer': 1}
        printed = []
        real = ctype.text
        import studio.cinema.shots as sh_mod
        sh_mod.text = lambda t, *a, **k: printed.append(t) or real(t, *a, **k)
        try:
            shots.goal(ed, s)
        finally:
            sh_mod.text = real
        self.assertIn('1–0', printed)
        self.assertIn('2–0', printed)

    def test_bad_requests_are_refused(self):
        from studio.common import StageError
        s = copy.deepcopy(self.by['goal'])
        s['visual'] = {'type': 'goal', 'claim': 'm2', 'scorer': 0}   # the claim names no scorers
        with self.assertRaises(StageError):
            shots.goal(self.ed, s)
        s['visual'] = {'type': 'goal', 'claim': 'm3', 'scorer': 7}
        with self.assertRaises(StageError):
            shots.goal(self.ed, s)
        s = copy.deepcopy(self.by['record'])
        s['visual'] = {'type': 'record', 'claim': 'summary:Nope'}
        with self.assertRaises(StageError):
            shots.record(self.ed, s)

    def test_all_competitions_is_counted_when_the_ledger_has_no_such_summary(self):
        out = shots.summary_for(self.ed.ledger, 'All competitions')
        self.assertEqual((out['played'], out['won'], out['drawn'], out['lost']), (10, 7, 2, 1))

    def test_run_names_its_own_kind(self):
        self.assertEqual(shots.run_kind(['win', 'win']), 'wins in a row')
        self.assertEqual(shots.run_kind(['win', 'draw']), 'unbeaten')
        self.assertEqual(shots.run_kind(['loss', 'draw']), 'without a win')


class Direction(unittest.TestCase):
    def setUp(self):
        self.ed, self.dir = editor()
        self.plan = self.ed.plan()
        self.shots = self.plan['shots']

    def test_the_scorebug_counts_the_season_as_of_the_night_on_screen(self):
        st = cstory.story_of(self.ed.ledger)
        for s in self.shots:
            bug = s['cinema']['bug']
            if not bug:
                continue
            f = self.ed.by[s['visual'].get('claim') or s['claim_ids'][0]]['fact']
            want = cstory.tally(st, f['date'])
            self.assertEqual((bug['W'], bug['D'], bug['L']), (want['W'], want['D'], want['L']))
            self.assertEqual(bug['hot'], cstory.LETTER[f['outcome']])
        score = next(s for s in self.shots if s['visual']['type'] == 'score')
        self.assertEqual({k: score['cinema']['bug'][k] for k in 'WDL'}, {'W': 2, 'D': 1, 'L': 1})  # up to 1 September
        self.assertTrue(all(s['cinema']['bug'] is None for s in self.shots if s['visual']['type'] in cdirect.NO_BUG))

    def test_a_neutral_film_has_no_side_and_no_bug(self):
        ed, _ = editor(ledger(neutral=True))
        self.assertTrue(all(s['cinema']['bug'] is None for s in ed.plan()['shots']))

    def test_a_named_match_is_shown_with_its_score(self):
        ill = next(s for s in self.shots if s['visual']['type'] == 'illustration')
        self.assertEqual(ill['cinema']['lower'], ['m2'])
        for s in self.shots:
            if s['visual']['type'] in ('score', 'versus', 'goal', 'form', 'run'):
                self.assertEqual(s['cinema']['lower'], [], s['visual']['type'])
        shot = self.ed.build(StubSprites(self.dir), ill)
        lt = [o for o in shot.overlay if isinstance(o, cdirect.LowerThird)]
        self.assertEqual(len(lt), 1)
        self.assertIsNotNone(lt[0](ill['voice_at'] - ill['start'] + 0.8))

    def test_cold_open_and_climax_are_letterboxed_and_every_entry_is_known(self):
        first_chapter = next(s['n'] for s in self.shots if s['visual']['type'] == 'chapter')
        self.assertTrue(all(s['cinema']['letterbox'] for s in self.shots[:first_chapter]))
        known = {'black', 'fade', 'wipe', 'cut', 'flash', 'whip', 'push', 'burn', 'dissolve'}
        self.assertLessEqual({s['cinema']['entry'] for s in self.shots}, known)
        self.assertEqual(self.shots[0]['cinema']['entry'], 'black')
        self.assertEqual(next(s for s in self.shots if s['visual']['type'] == 'goal')['cinema']['entry'], 'flash')

    def test_derby_and_defeat_are_treated(self):
        ill = next(s for s in self.shots if s['visual']['type'] == 'illustration')
        self.assertTrue(ill['cinema']['derby'])
        score = next(s for s in self.shots if s['visual']['type'] == 'score')
        self.assertTrue(score['cinema']['hush'])
        shot = self.ed.build(StubSprites(self.dir), score)
        self.assertTrue(any(k.startswith('hush:') for _, k in shot.cues))
        a = ShotRenderer(shot).frame(int(2.0 * FPS))
        sat = (a.max(-1).astype(int) - a.min(-1)).mean()
        self.assertLess(sat, 40)  # the colour has drained out

    def test_beat_fields_are_honoured(self):
        vs = next(s for s in self.shots if s['visual']['type'] == 'versus')
        self.assertEqual(vs['cinema']['camera'], 'orbit')
        goal = next(s for s in self.shots if s['visual']['type'] == 'goal')
        shot = self.ed.build(StubSprites(self.dir), goal)
        self.assertIn('crowd-goal', [k for _, k in shot.cues])
        self.assertIn('sting', [k for _, k in shot.cues])
        tr = self.shots[0]
        self.assertEqual(tr['cinema']['pace'], 'fast')

    def test_broll_is_never_in_the_rivals_colours(self):
        for bans in (['red'], ['green'], ['blue'], ['yellow']):
            for m in look.BROLL:
                k = look.pick([m], bans, 'x')
                if k:
                    self.assertTrue(look.allowed(k, bans), (k, bans))

    def test_the_kill_switch(self):
        s = next(s for s in self.shots if s['visual']['type'] == 'score')
        os.environ['STORIES_CINEMA'] = '0'
        try:
            shot = self.ed.build(StubSprites(self.dir), s)
        finally:
            del os.environ['STORIES_CINEMA']
        self.assertEqual(shot.post, [])


class Screenplay(unittest.TestCase):
    def test_slug_motif_and_meanwhile(self):
        scr = script()
        scr['motif'] = 'a radio on the kitchen table'
        beats = scr['chapters'][1]['beats']
        beats[1]['slug'] = 'Test Park — a Sunday in August'
        beats[1]['motif'] = True
        beats[2]['cut'] = 'meanwhile'
        beats[4]['motif'] = True
        ed, d = editor(scr=scr)
        plan = ed.plan()
        ill = next(s for s in plan['shots'] if s['visual']['type'] == 'illustration')
        self.assertEqual(ill['cinema']['slug'], 'Test Park — a Sunday in August')
        self.assertTrue(ill['cinema']['motif'].startswith('beat:'))
        form = next(s for s in plan['shots'] if s['visual']['type'] == 'form')
        self.assertEqual(form['cinema']['entry'], 'split')
        self.assertTrue(form['cinema']['meanwhile'])
        rec = next(s for s in plan['shots'] if s['visual']['type'] == 'record')
        self.assertEqual(rec['cinema']['broll'], ill['cinema']['motif'])  # the motif returns behind a card
        shot = ed.build(StubSprites(d), ill)
        kinds = {type(o).__name__ for o in shot.overlay}
        self.assertLessEqual({'Slug', 'Motif', 'LowerThird'}, kinds)
        slug = next(o for o in shot.overlay if type(o).__name__ == 'Slug')
        self.assertIsNotNone(slug(0.6))
        self.assertIsNone(slug(4.0))
        self.assertIsNone(look.motif_piece('a red balloon', []))   # nothing in the library: the beat plays without it

    def test_old_scripts_carry_none_of_it(self):
        ed, _ = editor()
        for s in ed.plan()['shots']:
            self.assertFalse(s['cinema']['slug'] or s['cinema']['motif'] or s['cinema']['meanwhile'])


class Transitions(unittest.TestCase):
    def test_every_entry_blends_and_lands_on_the_new_shot(self):
        a = np.full((1080, 1920, 3), 30, 'uint8')
        b = np.full((1080, 1920, 3), 200, 'uint8')
        for e, d in look.ENTRY_DUR.items():
            mid = look.blend(e, d * 0.5, b, a)
            self.assertEqual(mid.shape, b.shape)
            self.assertFalse(np.array_equal(mid, b), e)
            self.assertTrue(np.array_equal(look.blend(e, d + 0.01, b, a), b), e)
        self.assertTrue(np.array_equal(look.blend('cut', 0.0, b, a), b))
        self.assertIsNone(look.blend('fade', 0.1, b, a))  # the house entries stay with motion.blend_entry

    def test_the_grade_letterboxes_and_never_prints_a_rival_colour(self):
        rng = np.random.default_rng(3)
        img = rng.integers(0, 256, (1080, 1920, 3), dtype='uint8')
        img = np.asarray(Image.fromarray(img).convert('HSV').point(lambda v: v), 'uint8')
        from studio.paper import scrub
        clean = np.asarray(scrub(Image.fromarray(rng.integers(0, 256, (1080, 1920, 3), dtype='uint8')), ['red', 'yellow']))
        for g in (look.Grade(letterbox=True, leak=True, hush=True, warm=True), look.Grade(leak=True, warm=True)):
            out = g(2.0, clean)
            self.assertEqual(banned_share(out, ['red', 'yellow']), 0.0)
        out = look.Grade(letterbox=True)(1.0, clean)
        self.assertTrue((out[:look.LETTERBOX - 2] < 12).all())


class OldScripts(unittest.TestCase):
    def test_the_pilot_still_plans_and_its_cards_render_dressed(self):
        from studio.common import read_json as rj
        led = build_ledger('hapoel-tel-aviv', '1999/00', rj(HERE / 'studio/dossiers/hapoel-tel-aviv-1999-00.json')['claims'])
        scr = rj(HERE / 'studio/dossiers/pilot-hapoel-1999-00.script.json')
        pal = Palette('hapoel-tel-aviv', 'Hapoel Tel Aviv', '#B02D10', '#FFFBF2', ['yellow'])
        ed, d = editor(led, scr, pal)
        plan = ed.plan()
        self.assertTrue(all('cinema' in s for s in plan['shots']))
        seen = set()
        for i, s in enumerate(plan['shots']):
            kind = s['visual']['type']
            if kind in seen or kind in ('map', 'end', 'follow'):
                continue
            seen.add(kind)
            shot = ed.build(StubSprites(d), s)
            r = ShotRenderer(shot)
            fr = r.frame(min(shot.frames - 1, 30))
            prev = ShotRenderer(ed.build(StubSprites(d), plan['shots'][i - 1])).frame(0) if i else None
            out = blend_entry(shot, 3, fr, prev, (176, 45, 16))
            self.assertEqual(out.shape, (1080, 1920, 3), kind)
            self.assertEqual(banned_share(out, ['yellow']), 0.0, kind)
        self.assertGreaterEqual(len(seen), 4)


class Directors(unittest.TestCase):
    def test_each_director_leans_the_look_and_the_music(self):
        for did, key in (('broadcaster', 'drive'), ('terrace', 'warm'), ('trailer', 'epic')):
            ed, _ = editor(scr=script(did))
            plan = ed.plan()
            self.assertEqual(plan['music_key'], key)
            cams = {s['cinema']['camera'] for s in plan['shots'] if s['visual']['type'] not in ('end',)}
            from studio.directors import BY_ID
            self.assertTrue(cams & set(BY_ID[did]['camera']), did)
            secs = audio.mood_sections(plan)
            self.assertTrue(all(sec['flavour'] == key for sec in secs), did)
            if did == 'terrace':
                self.assertTrue(all(s['cinema']['warm'] for s in plan['shots']))
            if did == 'trailer':
                self.assertTrue(next(s for s in plan['shots'] if s['visual']['type'] == 'versus')['cinema']['letterbox'])

    def test_acts_turn_the_music(self):
        led = ledger()
        st = cstory.computed(led)
        st['acts'] = [{'name': 'Act I', 'ids': ['m1', 'm2', 'm3', 'm4']}, {'name': 'Act III', 'ids': ['m5', 'm6', 'm7', 'm8', 'm9', 'm10']}]
        led['story'] = st
        ed, _ = editor(led)
        secs = audio.mood_sections(ed.plan())
        self.assertGreater(len({(s['flavour'], s['shift']) for s in secs}), 1)


class Sound(unittest.TestCase):
    def test_the_new_effects_sit_under_the_voice(self):
        rng = np.random.default_rng(1)
        t = np.arange(audio.SR * 3) / audio.SR
        vdb = audio.speech_db((np.sin(2 * np.pi * 180 * t) * 0.12).astype('float32'))
        for kind in ('sting', 'drum', 'whistle'):
            a = audio.level_fx(kind, audio.fx(kind, rng), vdb, rng)
            w = int(0.12 * audio.SR)
            loudest = max(audio._rms_db(a[i:i + w]) for i in range(0, max(1, len(a) - w + 1), w // 4))
            self.assertLess(loudest, vdb - 8, kind)

    def test_a_hush_dips_the_music_and_comes_back(self):
        env = audio.hush_envelope([(1.0, 2.0)], audio.SR * 6)
        self.assertAlmostEqual(float(env[int(2.0 * audio.SR)]), 0.35, places=2)
        self.assertEqual(float(env[int(0.5 * audio.SR)]), 1.0)
        self.assertEqual(float(env[int(5.0 * audio.SR)]), 1.0)


if __name__ == '__main__':
    unittest.main()

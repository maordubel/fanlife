"""The raconteur (studio/raconteur.py) and the archive on screen (studio/archive_props.py) — owner, 23.11.2026: "I want a
film, a story … information that talks in a fun, hypnotic, humorous way … it pulls the season's kit, the card of the
player it talks about". Pure fixtures: an invented club, invented people."""
import os
import re
import unittest
from unittest import mock

from studio import archive_props as AP, house, raconteur as R, script as sc
from studio.common import StageError
from studio.docu import build as B, vox
from studio.tests.test_house import check, ledger, match, season_claims

SRC = [{'id': 's', 'url': 'https://example.org'}]


def claim(cid, fact, typ='history'):
    return {'id': cid, 'type': typ, 'fact': fact, 'sources': SRC, 'confidence': 2, 'status': 'archive', 'conflicts': []}


def cup_run():
    """A season with a two-legged tie lost at home and turned away, in front of a crowd you could count."""
    cl = season_claims()
    cl.append(match(50, '2002-03-07', 'Harbour', 1, 4, comp='Cup', stage='Quarter-final, first leg'))
    cl.append(match(51, '2002-03-14', 'Harbour', 5, 1, comp='Cup', stage='Quarter-final, second leg', side='away',
                    scorers=[{'name': 'Avi Cohen', 'minute': m, 'penalty': False, 'own_goal': False} for m in (10, 30, 70)]
                    + [{'name': 'Dan Levi', 'minute': 80, 'penalty': False, 'own_goal': False}, {'name': 'Dan Levi', 'minute': 85, 'penalty': False, 'own_goal': False}]))
    cl.append(claim('d1', {'kind': 'match-detail', 'date': '2002-03-14', 'city': 'Oldtown', 'attendance': 412, 'first_leg_deficit': 3}, 'match-detail'))
    cl.append(claim('player:avi-cohen', {'kind': 'player', 'name': 'Avi Cohen', 'said_as': 'Avi Cohen', 'position': 'Forward', 'from_year': 1998,
                                         'apps': 212, 'goals': 97, 'clue': 'Drove a bread van before football.'}, 'person'))
    cl.append(claim('kit:home', {'kind': 'kit', 'season': '2001/02', 'type': 'home', 'kit_id': 'k1', 'maker': 'Makerly', 'sponsor': 'Breadco'}, 'kit'))
    return cl


def write(led, minutes=6):
    from studio import characters, drama_facts
    drama_facts.attach(led)
    characters.attach(led)
    return R.write_script({'duration': minutes, 'kind': 'season'}, led, log=lambda m: None, check_at=check(led, 'season'))


def lines(s):
    return [b['narration'] for ch in s['chapters'] for b in ch['beats']]


class TheRaconteur(unittest.TestCase):
    def test_a_season_passes_every_check_a_script_must_pass(self):
        led = ledger(cup_run())
        s = write(led)
        self.assertEqual(check(led, 'season')(s, s['_minutes']), [])
        self.assertEqual(s['_writer'][0]['writer'], 'raconteur')

    def test_it_opens_on_the_small_thing_not_on_the_score(self):
        led = ledger(cup_run())
        s = write(led)
        self.assertRegex(s['hook'], r'412 people|Avi Cohen played 212 games')
        self.assertEqual(sc.scorelines(s['hook_options'][0]['text']), [])   # the result is withheld

    def test_it_never_reads_a_tally_aloud(self):
        """The slideshow line of the old house scripts: "18 matches: 11 won, 3 drawn, 4 lost. 40 goals scored, 18 conceded."."""
        s = write(ledger(cup_run()))
        for t in lines(s):
            self.assertIsNone(re.search(r'\d+ matches: \d+ won', t), t)
            self.assertNotIn('goals scored,', t)

    def test_a_tie_is_one_scene_told_whole(self):
        s = write(ledger(cup_run()))
        text = ' '.join(lines(s))
        self.assertIn('The first leg', text)
        self.assertIn('412 people were in the ground', text)
        self.assertIn('needed 3 goals just to be level', text)
        self.assertIn('Avi Cohen scored three of them', text)

    def test_the_man_and_the_shirt_are_said_so_they_can_be_shown(self):
        s = write(ledger(cup_run()))
        text = ' '.join(lines(s))
        self.assertIn('Drove a bread van before football.', text)
        self.assertIn('212 games and 97 goals', text)
        self.assertIn('made by Makerly, with Breadco across the chest', text)

    def test_an_aside_is_said_once_a_film(self):
        s = write(ledger(cup_run()), 8)
        text = ' '.join(lines(s))
        for bank in R.ASIDE.values():
            self.assertLessEqual(sum(text.count(a) for a in bank), 1, bank)

    def test_a_shoot_out_won_is_joy_not_a_draw(self):
        cl = [c for c in season_claims() if c['id'] != 'm99']
        cl.append(match(99, '2002-05-20', 'City', 2, 2, comp='Cup', stage='Final', scorers=[
            {'name': 'Avi Cohen', 'minute': 85, 'penalty': False, 'own_goal': False}, {'name': 'Dan Levi', 'minute': 115, 'penalty': False, 'own_goal': False}]))
        cl.append(claim('pens', {'kind': 'penalties', 'date': '2002-05-20', 'opponent': 'City', 'after_extra_time': '2–2', 'shootout': '4–2', 'winner': 'Test FC'}))
        led = ledger(cl)
        s = write(led)
        text = ' '.join(lines(s))
        self.assertIn('Test FC won the shoot-out 4–2.', text)
        for g in R.VOICE['grief'] + R.VOICE['level']:
            self.assertNotIn(g, text.split('shoot-out 4–2.')[1][:200])

    def test_he_leads_the_house_and_steps_aside_for_what_is_not_his(self):
        led = ledger(cup_run())
        s = house.write({'duration': 5, 'kind': 'season'}, led, 'terrace', log=lambda m: None, check_at=check(led, 'season'))
        self.assertEqual(s['_house']['writer'], 'raconteur')
        with mock.patch.dict(os.environ, {'STORIES_HOUSE_LEAD': 'unit'}):
            s = house.write({'duration': 5, 'kind': 'season'}, led, 'terrace', log=lambda m: None, check_at=check(led, 'season'))
        self.assertEqual(s['_house']['writer'], 'poet')
        with self.assertRaises(StageError):
            R.write_script({'duration': 5, 'kind': 'match'}, led, log=lambda m: None)


class TheArchiveOnScreen(unittest.TestCase):
    def test_a_surname_finds_the_card_only_when_it_is_one_mans(self):
        led = {'claims': [claim('player:avi-cohen', {'kind': 'player', 'name': 'Avi Cohen', 'said_as': 'Avi Cohen'}),
                          claim('player:dan-cohen', {'kind': 'player', 'name': 'Dan Cohen', 'said_as': 'Dan Cohen'}),
                          claim('player:dan-levi', {'kind': 'player', 'name': 'Dan Levi', 'said_as': 'Dan Levi'})]}
        c = AP.cards(led)
        self.assertNotIn('cohen', c)
        self.assertEqual(c['levi']['id'], 'player:dan-levi')
        self.assertEqual(c['avi cohen']['id'], 'player:avi-cohen')

    def test_a_club_with_no_pack_gets_no_props_and_no_error(self):
        led = {'club_id': 'no-such-club', 'season': '2001/02', 'claims': season_claims()}
        n = len(led['claims'])
        AP.attach(led)
        self.assertEqual(len(led['claims']), n)

    def test_the_shirt_is_cut_from_the_kit_drawing(self):
        club = next((p.name for p in sorted(AP.KITS.iterdir()) if (p / 'svg' / 'index.json').exists()), None) if AP.KITS.exists() else None
        if not club:
            self.skipTest('no kit drawings on this machine')
        k = AP._kit_index(club)[0]
        svg = AP.shirt_svg(club, k['id'])
        self.assertIn(f'viewBox="{AP.SHIRT_BOX}"', svg)
        self.assertNotIn('translate(70 318)', svg)    # no shorts
        self.assertNotIn('translate(336 128)', svg)   # no socks (docs/rules/club-shirt-only.md)

    def test_the_devices_ease_in_and_never_overshoot(self):
        """Rule 142: an entrance eases out and stops — no back, elastic or bounce ease on either prop."""
        f = B.Film({'palette': {'us': '#B02D10', 'them': '#333333'}, 'silent': True}, __import__('pathlib').Path('.'))
        f.pcard({'name': 'Avi Cohen', 'position': 'Forward', 'from_year': 1998, 'apps': 212, 'goals': 97, 'clue': 'Drove a bread van before football.'}, 1.0, 6.0)
        f.kitdev({'src': 'shirt.svg', 'season': '2001/02', 'type': 'home', 'maker': 'Makerly', 'sponsor': 'Breadco'}, 8.0, 5.0)
        js = ' '.join(f.tw)
        self.assertNotRegex(js, r'back\.|elastic|bounce')
        html = ' '.join(f.clips)
        self.assertIn('AVI COHEN', html)
        self.assertIn('2001/02 · HOME', html)
        self.assertIn('MAKERLY · BREADCO', html)

    def test_the_props_are_typed_devices_of_the_vox_pass(self):
        self.assertTrue({'kitdev', 'pcard'} <= vox.TYPED)


class LifeInTheFrame(unittest.TestCase):
    """docu/life.py (owner, 23.11.2026: "not enough movement for the eyes"): the scene itself moves, calmly."""

    def beats(self):
        mk = lambda n, emo, kinds, d=6.0: {'t': n * 6.0, 'd': d, 'meta': {'n': n, 'emotion': emo, 'intensity': 0.9},   # noqa: E731
                                           'shots': [{'kind': k} for k in kinds]}
        return [mk(0, 'joy', ['image']), mk(1, 'tension', ['image']), mk(2, 'joy', ['image', 'atlas']), mk(3, 'grief', ['image']),
                mk(4, 'joy', ['image', 'pcard']), mk(5, 'joy', ['image'], 1.5), mk(6, 'tension', ['image', 'kinetic'])]

    def life_of(self, b):
        return next((x for x in b['shots'] if x['kind'] == 'life'), None)

    def test_the_director_gives_each_scene_its_life_by_its_feeling(self):
        from studio.docu import life
        bs = self.beats()
        self.assertEqual(life.direct(bs, {0: 'He scored.'}, 'seed'), 5)
        self.assertIn('confetti', self.life_of(bs[0])['fx'])
        self.assertIn('beams', self.life_of(bs[1])['fx'])
        self.assertIsNone(self.life_of(bs[2]))            # never over a map or a board
        self.assertEqual(self.life_of(bs[3])['fx'], ['dust'])   # grief is quiet
        self.assertFalse({'crowd', 'flags'} & set(self.life_of(bs[4])['fx']))   # a prop owns the foreground
        self.assertIsNone(self.life_of(bs[5]))            # too short to come alive
        self.assertNotIn('confetti', self.life_of(bs[6])['fx'])   # type is read on a calm ground

    def test_it_can_be_switched_off(self):
        from studio.docu import life
        with mock.patch.dict(os.environ, {'STORIES_LIFE': '0'}):
            self.assertEqual(life.direct(self.beats(), {}, 'seed'), 0)

    def test_every_tween_eases_and_nothing_pops(self):
        from studio.docu import life
        rows = {'far': {'src': 'a.png', 'w': 2364, 'h': 420}, 'near': {'src': 'b.png', 'w': 2592, 'h': 420}}
        f = B.Film({'palette': {'us': '#B02D10', 'them': '#333333'}, 'silent': True}, __import__('pathlib').Path('.'))
        f.life({'fx': ['confetti', 'crowd', 'beams', 'glow', 'dust', 'ball'], 'rows': rows, 'level': 0.9, 'seed': 'x'}, 2.0, 6.0)
        js = ' '.join(f.tw)
        self.assertNotRegex(js, r'back\.|elastic|bounce|steps\(')
        self.assertIn(f'duration:{life.FADE_IN}', js)     # the layer fades in, it does not appear
        html = ' '.join(f.clips)
        for hh in re.findall(r'class="lfc"[^>]*height:(\d+)px', html):
            self.assertLessEqual(int(hh), 1080 // 3)       # the crowd is a band at the foot of the frame, never the frame
        a, b = B.Film({'palette': {'us': '#B02D10', 'them': '#333333'}, 'silent': True}, __import__('pathlib').Path('.')), None
        a.life({'fx': ['confetti', 'crowd', 'beams', 'glow', 'dust', 'ball'], 'rows': rows, 'level': 0.9, 'seed': 'x'}, 2.0, 6.0)
        self.assertEqual(a.tw, f.tw)                      # one seed, one film: any frame renders the same


class ThePress(unittest.TestCase):
    """docu/press.py (owner, 23.11.2026: "no visual hook … the backgrounds are banal"; his newspaper brief)."""

    def test_the_headline_is_the_narrators_own_words_in_order(self):
        from studio.docu import press
        for line in ('370 people were in the ground in Oldtown on 14 March 2002.', 'Avi Cohen played 212 games for Test FC, by the archive\'s count.',
                     'City, 20 May 2002: one night that Test FC supporters still describe with their hands.'):
            head, deck = press.headline(line)
            said = re.sub(r'[.,:;]', '', line).split()
            got = re.sub(r'[.,:;]', '', ' '.join(head + [deck])).split()
            self.assertEqual(got, said)                    # nothing added, dropped or moved
            self.assertLessEqual(len(head), 3)
            self.assertNotIn(head[-1].split()[-1].lower(), press.STOP)

    def test_the_front_page_opens_the_film_and_a_line_with_no_picture_becomes_a_collage(self):
        from studio.docu import press
        files = {k: f'{k}.webp' for k in press.PIECES}
        mk = lambda n, typ, d=6.0: {'t': n * 6.0, 'd': d, 'meta': {'n': n, 'type': typ}, 'shots': [{'kind': 'image', 'src': 'x.jpg', 'dt': 0.0}, {'kind': 'thread'}, {'kind': 'question', 'text': 'x'}]}   # noqa: E731
        beats = [mk(0, 'open'), mk(1, 'matchday'), mk(2, 'illustration'), mk(3, 'illustration'), mk(4, 'illustration', 2.0)]
        shots = {0: {'narration': '370 people were in the ground in Oldtown. That is a guest list.', 'visual': {'kicker': 'Cup'}},
                 2: {'visual': {'art': 'terrace-crowd'}}, 3: {'visual': {'art': 'terrace-crowd'}}, 4: {'visual': {'art': 'tunnel'}}}
        made = press.direct(beats, shots, files, 'Test FC')
        self.assertEqual(made, {'front': 1, 'scenes': 2})
        front = beats[0]['shots'][0]
        self.assertEqual((front['kind'], front['page'], front['head'][0]), ('press', 'front', '370 people'))
        self.assertEqual([x['kind'] for x in beats[0]['shots']], ['press'])   # no second title over the headline
        self.assertEqual(beats[1]['shots'][0]['kind'], 'image')           # a beat with its own board keeps it
        a, b = beats[2]['shots'][0], beats[3]['shots'][0]
        self.assertEqual(a['scene'], 'duotone')
        self.assertNotEqual(a['scene'], b['scene'])                        # never the same collage twice running
        self.assertEqual(beats[4]['shots'][0]['kind'], 'image')           # too short to paste a scene
        with mock.patch.dict(os.environ, {'STORIES_PRESS': '0'}):
            self.assertEqual(press.direct([mk(0, 'open')], shots, files, 'Test FC'), {'front': 0, 'scenes': 0})

    def test_the_press_prints_only_the_clubs_colour_paper_and_ink_and_stays_flat(self):
        from studio.docu import press
        files = {k: f'{k}.webp' for k in press.PIECES}
        f = B.Film({'palette': {'us': '#B02D10', 'them': '#333333'}, 'silent': True}, __import__('pathlib').Path('.'))
        f.press({'page': 'front', 'head': ['370 people', 'were in the', 'ground'], 'deck': 'in Oldtown', 'kicker': 'Cup', 'body': 'x', 'files': files, 'off': 0, 'total': 8}, 0.0, 8.0)
        for sc in press.SCENES:
            f.press({'page': 'scene', 'scene': sc, 'files': files, 'seed': sc}, 8.0, 4.0)
        html, js = ' '.join(f.clips), ' '.join(f.tw)
        self.assertIn('370</i> people', html)
        self.assertNotRegex(js, r'rotationX|rotationY|perspective')       # a 3D transform drops the motion blur to its slow tier
        self.assertNotIn('mask-image', html + press.CSS)
        colours = set(re.findall(r'#[0-9a-fA-F]{6}\b', html)) - {'#B02D10', f.PAPER, f.INK}
        self.assertFalse(colours, colours)                                 # ink and paper come from the film; nothing else is printed

    def test_the_press_kit_is_in_the_repository(self):
        from studio.docu import press
        self.assertEqual(set(press.kit()), set(press.PIECES))


if __name__ == '__main__':
    unittest.main()

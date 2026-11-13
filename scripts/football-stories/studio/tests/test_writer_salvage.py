"""The writer's salvage (studio/salvage.py, docs/rules/writer-salvage.md): a script that still fails its checks after the
model rounds is repaired in code — re-cite, remove, copy the hook, never add — and the film is made at the length the
proven narration carries. Fixture: the Celtic 1984/85 failure of 13.11.2026 (job 6f9c3de6), rebuilt small. No network."""
from __future__ import annotations

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from studio import director, hook_judge, salvage, writer  # noqa: E402
from studio.common import StageError  # noqa: E402
from studio.script import target_words, validate_script  # noqa: E402
from studio.tests import test_director as td  # noqa: E402

CWC = 'Cup Winners Cup'


def celtic() -> dict:
    L = td.ledger([td.match('g1', '1984-09-19', 'Gent', 0, 1, side='away', comp=CWC),
                   td.match('g2', '1984-10-03', 'Gent', 3, 0, comp=CWC),
                   td.match('r1', '1984-10-24', 'Rapid Vienna', 1, 3, side='away', comp=CWC),
                   td.match('r2', '1984-11-07', 'Rapid Vienna', 3, 0, comp=CWC),
                   td.match('a1', '1984-12-08', 'Aberdeen', 2, 1, scorers=[{'name': 'McClair', 'minute': 77}, {'name': 'Johnston', 'minute': 12}]),
                   td.match('d1', '1985-05-18', 'Dundee United', 2, 1, comp='Scottish Cup', stage='Final')], season='1984/85')
    L['club_name'] = 'Testers'
    director.attach(L)
    return L


HOOK = ('Nobody at Hampden thought this side had another comeback left in it. '
        'They had been written off since the autumn, and they knew it. '
        'So how did the afternoon end with the cup in their hands? '
        'This is the part of the story the highlights never showed.')


def pad(n: int) -> str:
    return ' '.join(['Nobody in the ground said a word about it afterwards, and the supporters walked home slowly.'] * n)


def script(L: dict) -> dict:
    """A small season film that passes every check as written (hook options included)."""
    hook = salvage.sentences(HOOK)
    ch1 = [
        {'narration': ' '.join(hook[:2]), 'claim_ids': ['d1'], 'visual': {'type': 'trailer', 'lines': ['NOBODY SAW IT COMING']}, 'camera': 'push'},
        {'narration': ' '.join(hook[2:]), 'claim_ids': ['d1'], 'visual': {'type': 'race', 'label': 'The season', 'mark': ['d1']}},
        {'narration': 'To understand that day, go back to the autumn. ' + pad(1), 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''}},
        {'narration': 'The season in full. ' + pad(1) + ' But what was coming next?', 'claim_ids': [f'summary:{CWC}'], 'visual': {'type': 'record', 'claim': f'summary:{CWC}'}},
    ]
    ch2 = [
        {'narration': 'Europe came first. ' + pad(1), 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'tunnel', 'caption': ''}},
        {'narration': 'They needed a response at home. ' + pad(1), 'claim_ids': ['g2'], 'visual': {'type': 'versus', 'claim': 'g2'}},
        {'narration': 'And it came. ' + pad(1), 'claim_ids': ['g2'], 'visual': {'type': 'score', 'claim': 'g2'}},
        {'narration': 'The terrace emptied slowly that night. ' + pad(1) + ' Then came the winter.', 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'terrace-empty', 'caption': ''}},
    ]
    ch3 = [
        {'narration': 'A cold month, and a hard one. ' + pad(1), 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'supporter', 'caption': ''}},
        {'narration': 'One afternoon was left. ' + pad(1), 'claim_ids': ['d1'], 'visual': {'type': 'versus', 'claim': 'd1'}},
        {'narration': 'And they took it. ' + pad(1), 'claim_ids': ['d1'], 'visual': {'type': 'score', 'claim': 'd1'}},
        {'narration': 'That is how it ended. ' + pad(1), 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''}},
    ]
    alt = ('One afternoon decided how a whole year would be remembered by the people who lived it. '
           'The supporters who were there still argue about how it happened. '
           'By the end of this film you will know what really turned the day around for them.')
    alt2 = ('A cup final is supposed to belong to the favourites, and this side were not the favourites. '
            'They had spent the autumn being told that their time was over. '
            'What happened next is the reason the old ground still sings about that spring afternoon.')
    return {'director': 2, 'drama': 1,
            'title_candidates': [{'title': f'Title {k}', 'angle': 'search' if k % 2 else 'discovery'} for k in range(10)],
            'selected': 0, 'hook': hook[0],
            'hook_options': [{'text': HOOK, 'claim_ids': ['d1']}, {'text': alt, 'claim_ids': ['d1']}, {'text': alt2, 'claim_ids': ['d1']}],
            'chapters': [{'title': 'The afternoon', 'beats': ch1}, {'title': 'Europe', 'beats': ch2}, {'title': 'The final', 'beats': ch3}],
            'description': 'x' * 300, 'tags': ['a', 'b', 'c', 'd', 'e'],
            'shorts': [{'hook': 'Remember this.', 'idea': 'i', 'narration': 'Remember this. A match became a memory that supporters would carry long after the final whistle.', 'claim_ids': ['d1']},
                       {'hook': 'A night apart.', 'idea': 'i', 'narration': 'A night apart. The supporters arrived with hope and left with another story to tell.', 'claim_ids': ['d1']}],
            'thumbnails': [{'text': 'One', 'concept': 'c', 'claim': None}] * 3}


def checker(L: dict):
    return lambda sc, m: validate_script(sc, L, m) + writer.hook_option_errors(sc, L)


def asked_for(s: dict) -> float:
    return round(salvage.narration_words(s) / 122, 2)


def spoken(s: dict) -> list[str]:
    return [x for ch in s['chapters'] for b in ch['beats'] for x in salvage.sentences(b['narration'])]


class Base(unittest.TestCase):
    def setUp(self):
        self.L = celtic()
        self.s = script(self.L)
        self.asked = asked_for(self.s)
        self.check = checker(self.L)

    def salvaged(self, s, asked=None):
        out, report = salvage.salvage(s, self.L, self.check, asked or self.asked)
        if out is not None:
            self.assertEqual(self.check(out, out['_minutes']), [])          # the whole validator, at the film's real length
            known = {c['id'] for c in self.L['claims']} | {f'summary:{k}' for k in self.L['summary']['by_competition']} | {'story'}
            was = set(spoken(s)) | set(salvage.sentences(s['hook_options'][0]['text']))
            self.assertLessEqual(set(spoken(out)), was)                     # never a sentence the writer did not write
            self.assertTrue(all(c in known for ch in out['chapters'] for b in ch['beats'] for c in b['claim_ids']))
        return out, report


class Fixture(Base):
    def test_the_base_script_passes_as_written(self):
        self.assertEqual(self.check(self.s, self.asked), [])


class Numbers(Base):
    def test_a_number_is_recited_to_the_one_claim_that_carries_it_and_that_the_sentence_names(self):
        self.s['chapters'][2]['beats'][0]['narration'] += ' McClair struck in the seventy-seventh minute against Aberdeen.'
        self.assertTrue(any('number 77 is not in the cited claims' in e for e in self.check(self.s, self.asked)))
        out, report = self.salvaged(self.s)
        self.assertIn('a1', out['chapters'][2]['beats'][0]['claim_ids'])
        self.assertIn('seventy-seventh', out['chapters'][2]['beats'][0]['narration'])
        self.assertEqual((report['recited'], report['removed_sentences'], report['dropped_beats']), (1, 0, 0))

    def test_a_number_no_claim_carries_loses_its_sentence_and_only_that(self):
        b = self.s['chapters'][1]['beats'][0]
        b['narration'] = 'Europe came first. Nineteen thousand travelled with them. ' + pad(1)
        out, report = self.salvaged(self.s)
        self.assertEqual(out['chapters'][1]['beats'][0]['narration'], 'Europe came first. ' + pad(1))
        self.assertEqual((report['removed_sentences'], report['recited']), (1, 0))

    def test_a_number_the_sentence_does_not_tie_to_a_claim_is_not_guessed(self):
        # 77 is in the Aberdeen claim, but the sentence names nobody: no re-cite, the sentence goes
        self.s['chapters'][2]['beats'][0]['narration'] += ' Seventy-seven minutes had gone.'
        out, report = self.salvaged(self.s)
        self.assertNotIn('a1', out['chapters'][2]['beats'][0]['claim_ids'])
        self.assertNotIn('Seventy-seven', out['chapters'][2]['beats'][0]['narration'])

    def test_an_emptied_beat_is_dropped_and_an_emptied_chapter_with_it(self):
        self.s['chapters'].insert(2, {'title': 'A number', 'beats': [
            {'narration': 'Thirty thousand waited outside. Nineteen of them had tickets.', 'claim_ids': [], 'visual': {'type': 'illustration', 'art': 'paper', 'caption': ''}}]})
        self.s['chapters'][1]['beats'][-1]['narration'] += ' And then?'
        asked = asked_for(self.s)
        out, report = self.salvaged(self.s, asked)
        self.assertEqual([ch['title'] for ch in out['chapters']], ['The afternoon', 'Europe', 'The final'])
        self.assertEqual((report['dropped_beats'], report['removed_sentences']), (1, 2))


class Results(Base):
    def test_a_result_against_an_opponent_met_once_is_cited(self):
        b = self.s['chapters'][2]['beats'][0]
        b['narration'] += ' They had already beaten Aberdeen that winter.'
        self.assertTrue(any('[director rule 1]' in e and 'Aberdeen' in e for e in self.check(self.s, self.asked)))
        out, report = self.salvaged(self.s)
        self.assertIn('a1', out['chapters'][2]['beats'][0]['claim_ids'])
        self.assertEqual(report['removed_sentences'], 0)

    def test_two_legs_and_no_score_said_is_removed_not_guessed(self):
        b = self.s['chapters'][1]['beats'][0]
        b['narration'] += ' They lost to Rapid Vienna and nobody forgot it.'
        out, report = self.salvaged(self.s)
        self.assertNotIn('Rapid', out['chapters'][1]['beats'][0]['narration'])
        self.assertFalse({'r1', 'r2'} & set(out['chapters'][1]['beats'][0]['claim_ids']))
        self.assertEqual(report['removed_sentences'], 1)

    def test_two_legs_and_the_score_said_cites_that_leg(self):
        b = self.s['chapters'][1]['beats'][0]
        b['narration'] += ' They beat Rapid Vienna three-nil.'
        out, report = self.salvaged(self.s)
        self.assertIn('r2', out['chapters'][1]['beats'][0]['claim_ids'])
        self.assertNotIn('r1', out['chapters'][1]['beats'][0]['claim_ids'])
        self.assertIn('three-nil', out['chapters'][1]['beats'][0]['narration'])

    def test_a_scoreline_of_no_cited_match_is_removed(self):
        b = self.s['chapters'][2]['beats'][0]
        b['narration'] += ' It finished five-four.'
        out, report = self.salvaged(self.s)
        self.assertNotIn('five-four', out['chapters'][2]['beats'][0]['narration'])

    def test_table_talk_and_weather_lose_their_sentences(self):
        b = self.s['chapters'][2]['beats'][0]
        b['narration'] += ' They were top of the league by then. The rain never stopped.'
        out, report = self.salvaged(self.s)
        self.assertNotIn('league', out['chapters'][2]['beats'][0]['narration'])
        self.assertNotIn('rain', out['chapters'][2]['beats'][0]['narration'])
        self.assertEqual(report['removed_sentences'], 2)


class Hook(Base):
    def test_an_unproven_sentence_leaves_a_four_sentence_hook_and_the_rest_is_spoken(self):
        self.s['hook_options'][0]['text'] = HOOK.replace('This is the part', 'Forty thousand saw the part')
        self.s['chapters'][0]['beats'][1]['narration'] = self.s['chapters'][0]['beats'][1]['narration'].replace('This is the part', 'Forty thousand saw the part')
        out, report = salvage.salvage(self.s, self.L, self.check, self.asked)
        self.assertEqual(out['hook_options'][0]['text'], ' '.join(salvage.sentences(HOOK)[:3]))
        self.assertNotIn('Forty', ' '.join(spoken(out)))
        self.assertEqual(self.check(out, out['_minutes']), [])


    def test_hook_option_one_is_spoken_verbatim_when_the_writer_paraphrased_it(self):
        # the opening is a paraphrase too long to become the card itself (writer.autofix), so the approved hook is copied in
        self.s['chapters'][0]['beats'][0]['narration'] = ('Nobody at Hampden believed in this side any more, not the press and not the people who paid at the gate that day. '
                                                          'They had been written off, and everybody knew it by then, even the ones who still came every single week of the season.')
        self.s['chapters'][0]['beats'][1]['narration'] = 'So how did they win the cup that afternoon, when nothing at all pointed to it? Here is the untold part of it.'
        self.assertIn('Use hook option 1 verbatim as the opening narration across the first beats.', self.check(writer.repair(copy.deepcopy(self.s)), self.asked))
        out, report = salvage.salvage(self.s, self.L, self.check, self.asked)
        said = ' '.join(b['narration'] for ch in out['chapters'] for b in ch['beats'])
        self.assertTrue(said.startswith(HOOK))
        self.assertEqual(out['hook'], salvage.sentences(HOOK)[0])
        self.assertEqual(out['hook_options'][0]['text'], HOOK)
        self.assertTrue(report['hook_copied'])
        self.assertEqual(self.check(out, out['_minutes']), [])

    def test_a_hook_that_fails_its_own_evidence_is_never_copied(self):
        three = ' '.join(salvage.sentences(HOOK)[:2]) + ' Forty thousand saw the afternoon end with the cup in their hands, and this is the part the highlights never showed.'
        self.s['hook_options'][0]['text'] = three     # three sentences: the unproven one cannot be cut and leave an opening
        long = ' and '.join(['nobody in the ground said a word about it afterwards'] * 8)   # too long to become the card itself
        self.s['chapters'][0]['beats'][0]['narration'] = f'Something else entirely was said here, {long}. ' + pad(2)
        out, report = salvage.salvage(self.s, self.L, self.check, self.asked)
        self.assertIsNone(out)
        self.assertTrue(report['left'])


class Floor(Base):
    def test_a_film_is_made_shorter_never_padded(self):
        for ch in self.s['chapters'][1:]:
            for b in ch['beats'][:2]:
                b['narration'] += ' Nineteen thousand saw it. Thirty buses came. Forty flags flew.'
        asked = 10.0
        self.assertTrue(any(e.startswith('Narration is') for e in self.check(self.s, asked)))
        out, report = self.salvaged(self.s, asked)
        self.assertLess(out['_minutes'], asked)
        self.assertEqual(out['_minutes'], round(salvage.narration_words(out) / 122, 2))
        lo, hi = target_words(out['_minutes'])
        self.assertTrue(lo <= salvage.narration_words(out) <= hi)
        self.assertEqual(report['removed_sentences'], 12)
        self.assertEqual(writer.script_minutes(out, {'duration': 10}), out['_minutes'])
        line = salvage.line("The Broadcaster's", report)
        self.assertRegex(line, r"^Writer: salvaged The Broadcaster's script — removed 12 sentence\(s\), re-cited 0, dropped 0 beat\(s\); film length now ~[\d.]+ min$")

    def test_a_script_that_loses_most_of_itself_is_not_a_film(self):
        for ch in self.s['chapters']:
            for b in ch['beats'][1:] if ch is self.s['chapters'][0] else ch['beats']:
                if b['visual']['type'] == 'illustration':
                    b['narration'] = ' '.join(['Nineteen thousand saw it happen that day.'] * 12)
        out, report = salvage.salvage(self.s, self.L, self.check, asked_for(self.s))
        self.assertIsNone(out)
        self.assertEqual(report['left'], [])
        self.assertRegex(report['why'], r'only \d+ beats are left|only \d+% of the narration|only \d+ proven words')

    def test_the_floor_names_its_reason(self):
        self.assertIsNone(salvage.stands(self.s, salvage.narration_words(self.s), self.asked))
        self.assertIn('shortest film', salvage.stands(self.s, salvage.narration_words(self.s), 1.2))
        self.assertIn('% of the narration', salvage.stands(self.s, salvage.narration_words(self.s) * 3, self.asked))
        self.assertIsNone(salvage.stands(self.s, salvage.narration_words(self.s), 1.0, asked=1.0))      # a one-minute brief stays a film
        few = copy.deepcopy(self.s)
        few['chapters'] = few['chapters'][:1]
        self.assertIn('beats are left', salvage.stands(few, salvage.narration_words(few), self.asked))
        self.assertIsNone(salvage.stands(few, salvage.narration_words(few), self.asked, beats_before=4))

    def test_what_cannot_be_repaired_honestly_stays_a_failure(self):
        self.s['title_candidates'] = self.s['title_candidates'][:9]          # nine titles: nothing to remove or re-cite
        out, report = salvage.salvage(self.s, self.L, self.check, self.asked)
        self.assertIsNone(out)
        self.assertIn('Exactly ten title candidates are required', report['left'])

    def test_the_given_script_is_never_changed(self):
        self.s['chapters'][1]['beats'][0]['narration'] += ' Nineteen thousand travelled.'
        before = json.dumps(self.s, sort_keys=True)
        salvage.salvage(self.s, self.L, self.check, self.asked)
        self.assertEqual(json.dumps(self.s, sort_keys=True), before)


class Choice(unittest.TestCase):
    """Three scripts: one that passed as written first, then the salvaged one that lost the least."""

    def three(self, losses):
        out = []
        for d, score, lost in zip(('broadcaster', 'terrace', 'trailer'), (60, 90, 80), losses):
            s = {'_director': d, 'hook': d, 'hook_judge': {'spoken': 1, 'scores': [{'n': 1, 'score': score}]}}
            if lost is not None:
                s['_salvage'] = {'lost': lost}
            out.append(s)
        return out

    def test_a_script_that_passed_as_written_beats_a_better_scoring_salvage(self):
        k, rec = hook_judge.pick_script(self.three([None, 0.05, 0.3]), td.LEDGER if hasattr(td, 'LEDGER') else {}, lambda s: [])
        self.assertEqual(k, 0)
        self.assertIn('passed as written', rec['reason'])
        self.assertEqual([bool(r.get('salvaged')) for r in rec['scripts']], [False, True, True])

    def test_among_salvaged_scripts_the_one_that_lost_least_wins(self):
        k, rec = hook_judge.pick_script(self.three([0.4, 0.3, 0.1]), {}, lambda s: [])
        self.assertEqual(k, 2)
        self.assertIn('salvaged', rec['reason'])

    def test_an_invalid_script_still_cannot_win(self):
        k, _ = hook_judge.pick_script(self.three([None, 0.05, 0.3]), {}, lambda s: ['broken'] if s['_director'] == 'broadcaster' else [])
        self.assertEqual(k, 1)

    def test_without_salvage_the_choice_is_what_it_was(self):
        self.assertEqual(hook_judge.pick_script(self.three([None, None, None]), {}, lambda s: [])[0], 1)


class Scoreline(unittest.TestCase):
    def test_a_score_after_a_name_that_ends_in_a_is_still_a_score(self):
        from studio.script import scorelines
        self.assertEqual(scorelines('They beat Rapid Vienna three-nil.'), [(3, 0)])     # was read as "a three-nil" and skipped
        self.assertEqual(scorelines('They took a two-one lead.'), [])


class Sizing(unittest.TestCase):
    def test_a_thin_archive_is_written_as_a_short_film(self):
        claims = [{'id': str(i)} for i in range(6)]
        self.assertEqual(writer.sized_minutes(10, {'claims': claims}), 3.0)                 # the Celtic film: 6 claims
        self.assertEqual(writer.sized_minutes(10, {'claims': claims[:1]}), writer.THIN_MIN_MINUTES)
        self.assertEqual(writer.sized_minutes(2, {'claims': claims}), 2)                    # never longer than asked
        self.assertEqual(writer.sized_minutes(10, {'claims': claims * 7}), 10)              # a full season is untouched

    def test_deep_research_or_the_owners_documents_keep_the_asked_length(self):
        claims = [{'id': str(i)} for i in range(6)]
        self.assertEqual(writer.sized_minutes(10, {'claims': claims, 'deep_research': {'timeline': []}}), 10)
        self.assertEqual(writer.sized_minutes(10, {'claims': claims, 'story_documents': [{'name': 'story.md'}]}), 10)

    def test_the_failure_is_one_short_human_line(self):
        thin = writer.failure_line({'claims': [{}] * 6}, 10, 'Chapter 4 beat 5: number 19 is not in the cited claims')
        self.assertIn('Too few proven facts', thin)
        self.assertIn('6 claim(s)', thin)
        self.assertNotIn('Chapter', thin)
        self.assertLess(len(thin), 160)
        self.assertLess(len(writer.failure_line({'claims': [{}] * 60}, 10, 'x' * 500)), 220)


class WriteScript(unittest.TestCase):
    """The writer itself: five model rounds of the same broken answer end in a salvaged film, not in SCRIPT_INVALID."""

    def run_writer(self, answer: dict, L: dict, minutes: float):
        logs, calls = [], []

        def fake(system, user, max_tokens=0):
            calls.append(user)
            return json.dumps(answer), {'provider': 'test', 'model': 'none', 'seconds': 0}
        keep, writer.call_model = writer.call_model, fake
        try:
            with tempfile.TemporaryDirectory() as d:
                try:
                    return writer.write_script({'duration': minutes, 'club_id': 'testers', 'season': '1984/85'}, L, Path(d), logs.append), logs, calls
                except StageError as e:
                    return e, logs, calls
        finally:
            writer.call_model = keep

    def setUp(self):
        self.L = {**celtic(), 'deep_research': {'note': 'present, so the asked length stands'}}
        self.s = script(self.L)

    def test_a_small_repair_is_taken_at_once_and_costs_one_request(self):
        self.s['chapters'][1]['beats'][0]['narration'] += ' Nineteen thousand travelled.'
        out, logs, calls = self.run_writer(self.s, self.L, asked_for(script(self.L)))
        self.assertEqual(len(calls), 1)
        self.assertEqual(out['_salvage']['removed_sentences'], 1)
        self.assertTrue(any(m.startswith('Writer: salvaged the script — removed 1 sentence(s), re-cited 0, dropped 0 beat(s); film length now ~') for m in logs))

    def test_a_heavy_repair_waits_for_the_model_rounds_then_makes_a_shorter_film(self):
        for ch in self.s['chapters'][1:]:
            for b in ch['beats'][:2]:
                b['narration'] += ' Nineteen thousand saw it. Thirty buses came. Forty flags flew. Fifty drums played all night long for them.'
        asked = asked_for(self.s)
        out, logs, calls = self.run_writer(self.s, self.L, asked)
        self.assertEqual(len(calls), writer.ATTEMPTS)
        self.assertLess(out['_minutes'], asked)
        self.assertEqual(validate_script(out, self.L, writer.script_minutes(out, {'duration': asked})), [])
        self.assertTrue(any('film length now' in m for m in logs))

    def test_a_script_that_passes_is_untouched_and_carries_its_length(self):
        asked = asked_for(self.s)
        out, logs, calls = self.run_writer(self.s, self.L, asked)
        self.assertNotIn('_salvage', out)
        self.assertEqual(out['_minutes'], asked)
        self.assertFalse(any('salvaged' in m for m in logs))

    def test_nothing_to_salvage_fails_in_one_short_line_and_the_detail_stays_in_the_log(self):
        self.s['title_candidates'] = self.s['title_candidates'][:9]
        thin = celtic()
        err, logs, calls = self.run_writer(self.s, thin, 10)
        self.assertIsInstance(err, StageError)
        self.assertEqual(err.code, 'SCRIPT_INVALID')
        self.assertIn('Too few proven facts', str(err))
        self.assertNotIn('title candidates', str(err))
        self.assertTrue(any('title candidates' in m for m in logs))
        self.assertTrue(any('writing a 3-minute film, not 10' in m for m in logs))

    def test_three_directors_none_salvageable_fail_in_the_same_short_line(self):
        logs = []

        def fake(brief, ledger, cache, log, director=None, avoid=None, angle=None):
            raise StageError('SCRIPT_INVALID', 'Chapter 4 beat 5: number 19 is not in the cited claims')
        keep, writer.write_script = writer.write_script, fake
        try:
            with self.assertRaises(StageError) as cm:
                writer.write_options({'duration': 10}, celtic(), Path('/tmp'), logs.append)
        finally:
            writer.write_script = keep
        self.assertIn('Too few proven facts', str(cm.exception))
        self.assertNotIn('number 19', str(cm.exception))
        self.assertTrue(any('number 19' in m for m in logs))


if __name__ == '__main__':
    unittest.main()

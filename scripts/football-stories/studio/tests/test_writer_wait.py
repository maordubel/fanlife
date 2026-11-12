"""The free writer waits for Google instead of failing the film (owner, 4.11.2026: SCRIPT_INVALID with every model 429/404/503)."""
from __future__ import annotations

import unittest
from datetime import datetime, timezone
from unittest import mock

from studio import gemini as G
from studio.common import StageError

PER_MIN = '{"error":{"code":429,"details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaValue":"250000"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"33s"}]}}'
PER_DAY = '{"error":{"code":429,"details":[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaValue":"250"}]}]}}'
ZERO = '{"error":{"code":429,"details":[{"violations":[{"quotaId":"GenerateContentInputTokensPerModelPerMinute-FreeTier","quotaValue":"0"}]}]}}'
BUSY = '{"error":{"code":503,"message":"This model is currently experiencing high demand."}}'


class Clock:
    def __init__(self): self.t = 0.0
    def now(self): return self.t
    def sleep(self, s): self.t += s


def err(code, body): return StageError(f'WRITER_HTTP_{code}', f'Writer provider answered {code}: {body}', retryable=True)


class Fake:
    """Answers per model from a script of replies; records every call."""
    def __init__(self, plan): self.plan, self.calls = {k: list(v) for k, v in plan.items()}, []
    def __call__(self, url, body, headers, timeout=300):
        m = url.split('/models/')[1].split(':')[0]
        self.calls.append((m, body))
        r = self.plan[m].pop(0) if self.plan.get(m) else err(404, 'gone')
        if isinstance(r, Exception):
            raise r
        return r


def run(plan, models, budget=1200):
    G.DEAD.clear()
    c, f = Clock(), Fake(plan)
    with mock.patch.object(G, 'gemini_candidates', lambda key, wanted=None: list(models)):
        out = G.generate('k', {'systemInstruction': {'parts': [{'text': 'SYS'}]}, 'contents': [{'role': 'user', 'parts': [{'text': 'U'}]}],
                               'generationConfig': {'responseMimeType': 'application/json', 'maxOutputTokens': 32000}},
                         budget_s=budget, sleep=c.sleep, clock=c.now, http=f)
    return out, f, c


class WriterWaits(unittest.TestCase):
    def test_per_minute_429_waits_as_google_asks_then_answers(self):
        (r, m), f, c = run({'a': [err(429, PER_MIN), {'ok': 1}], 'b': [err(429, PER_MIN)]}, ['a', 'b'])
        self.assertEqual((r, m), ({'ok': 1}, 'a'))
        self.assertGreaterEqual(c.t, 33)

    def test_per_day_and_zero_quota_and_404_rule_a_model_out(self):
        (r, m), f, _ = run({'a': [err(429, PER_DAY)], 'b': [err(429, ZERO)], 'c': [err(404, 'no longer available')], 'd': [{'ok': 2}]}, 'abcd')
        self.assertEqual(m, 'd')
        self.assertEqual([x for x, _ in f.calls], ['a', 'b', 'c', 'd'])

    def test_503_backs_off_and_retries_the_same_model(self):
        (r, m), f, c = run({'a': [err(503, BUSY), err(503, BUSY), {'ok': 3}]}, ['a'])
        self.assertEqual(m, 'a')
        self.assertGreaterEqual(c.t, 45)

    def test_every_daily_quota_spent_is_quota_day_and_retryable(self):
        with self.assertRaises(StageError) as e:
            run({'a': [err(429, PER_DAY)], 'b': [err(404, 'gone')]}, 'ab')
        self.assertEqual(e.exception.code, 'WRITER_QUOTA_DAY')
        self.assertTrue(e.exception.retryable)

    def test_endless_busy_is_writer_busy_within_the_budget(self):
        with self.assertRaises(StageError) as e:
            run({'a': [err(503, BUSY)] * 200}, ['a'], budget=600)
        self.assertEqual(e.exception.code, 'WRITER_BUSY')

    def test_gemma_gets_the_system_text_in_the_user_turn_and_no_json_mode(self):
        (r, m), f, _ = run({'gemini-x': [err(429, PER_DAY)], 'gemma-3-27b-it': [{'ok': 4}]}, ['gemini-x', 'gemma-3-27b-it'])
        body = f.calls[-1][1]
        self.assertNotIn('systemInstruction', body)
        self.assertTrue(body['contents'][0]['parts'][0]['text'].startswith('SYS'))
        self.assertNotIn('responseMimeType', body['generationConfig'])
        self.assertLessEqual(body['generationConfig']['maxOutputTokens'], 8192)

    def test_a_refused_key_fails_plainly(self):
        with self.assertRaises(StageError) as e:
            run({'a': [err(403, 'API key not valid. Please pass a valid API key.')]}, ['a'])
        self.assertEqual(e.exception.code, 'WRITER_KEY')

    def test_402_no_credit_says_what_it_is_once_and_asks_no_other_model(self):
        # 12.11.2026: "Your prepayment credits are depleted" reached the desk as a raw HTTP dump, 8 runs of 9
        body = '{"error":{"code":402,"message":"Your prepayment credits are depleted. Please go to AI Studio to manage your billing.","status":"FAILED_PRECONDITION"}}'
        G.DEAD.clear()
        c, f = Clock(), Fake({'a': [StageError('WRITER_HTTP_402', 'Writer provider answered 402: ' + body)], 'b': [{'ok': 9}]})
        with mock.patch.object(G, 'gemini_candidates', lambda key, wanted=None: ['a', 'b']):
            with self.assertRaises(StageError) as e:
                G.generate('k', {'contents': []}, sleep=c.sleep, clock=c.now, http=f)
        self.assertEqual(e.exception.code, 'WRITER_NO_CREDIT')
        self.assertFalse(e.exception.retryable)
        self.assertEqual(([m for m, _ in f.calls], c.t), (['a'], 0.0))  # one request, no wait
        msg = str(e.exception)
        for word in ('no credit', 'WITHOUT billing', 'free', 'GEMINI_API_KEY', 'top up'):
            self.assertIn(word, msg)
        self.assertNotIn('{"error"', msg)


class OptionsWait(unittest.TestCase):
    def test_no_credit_stops_at_the_first_director_and_is_never_a_wait(self):
        from studio import pitch as P
        from studio import worker as K
        from studio import writer as W
        broke = StageError('WRITER_NO_CREDIT', G.NO_CREDIT)
        with mock.patch.object(W, 'write_script', side_effect=broke) as ws:
            with self.assertRaises(StageError) as e:
                W.write_options({}, {}, None, lambda *_: None)
        self.assertEqual((e.exception.code, ws.call_count), ('WRITER_NO_CREDIT', 1))
        for codes in (W.WAIT_CODES, K.WAIT_CODES):
            self.assertNotIn('WRITER_NO_CREDIT', codes)
            self.assertNotIn('WRITER_HTTP_402', codes)
        self.assertEqual(P.STOP_CODES, W.STOP_CODES)

    def test_no_credit_ends_a_pitch_round_as_failed_with_the_plain_words(self):
        from studio import pitch as P
        asked = []

        def write_pitch(d, offered, cache, log):
            asked.append(d['id'])
            raise StageError('WRITER_NO_CREDIT', G.NO_CREDIT)
        cands = [{'club_id': f'c{i}', 'kind': 'match', 'season': '1990', 'match_ids': [str(i)], 'title': str(i)} for i in range(6)]
        out = P.round_of(['c0'], {'pitched': [], 'films': []}, None, lambda *_: None, candidates=lambda ids: cands, write_pitch=write_pitch)
        self.assertEqual((len(asked), out['status']['state']), (1, 'failed'))
        self.assertIn('no credit', out['status']['note'])

    def test_a_busy_writer_makes_the_film_wait_not_fail(self):
        from studio import writer as W
        busy = StageError('WRITER_BUSY', 'busy', retryable=True)
        with mock.patch.object(W, 'write_script', side_effect=busy):
            with self.assertRaises(StageError) as e:
                W.write_options({}, {}, None, lambda *_: None)
        self.assertEqual(e.exception.code, 'WRITER_BUSY')

    def test_two_scripts_written_are_enough_when_the_third_must_wait(self):
        from studio import writer as W
        calls = iter([{'t': 1}, {'t': 2}, StageError('WRITER_QUOTA_DAY', 'spent', retryable=True)])
        def fake(*a, **k):
            x = next(calls)
            if isinstance(x, Exception):
                raise x
            return dict(x)
        with mock.patch.object(W, 'write_script', side_effect=fake):
            out = W.write_options({}, {}, None, lambda *_: None)
        self.assertEqual(len(out), 2)

    def test_quota_day_waits_until_after_midnight_pacific(self):
        from studio.worker import retry_at
        at = retry_at('WRITER_QUOTA_DAY', datetime(2026, 11, 4, 15, 50, tzinfo=timezone.utc))
        self.assertEqual(at, '2026-11-05T08:07:00Z')  # 00:07 PST
        self.assertEqual(retry_at('WRITER_BUSY', datetime(2026, 11, 4, 15, 50, tzinfo=timezone.utc)), '2026-11-04T16:10:00Z')

    def test_a_studio_that_did_not_answer_puts_the_film_back_in_the_queue(self):
        # 9.11.2026: the shared database stalled and a claimed film sat on a dead runner's lease for six hours
        from studio.worker import WAIT_CODES, retry_at
        for code in ('STUDIO_UNREACHABLE', 'STUDIO_503'):
            self.assertIn(code, WAIT_CODES)
        self.assertEqual(retry_at('STUDIO_UNREACHABLE', datetime(2026, 11, 9, 15, 0, tzinfo=timezone.utc)), '2026-11-09T15:15:00Z')
        self.assertNotIn('STUDIO_409', WAIT_CODES)  # a refusal is an answer, not a stall


class Repair(unittest.TestCase):
    def test_the_hook_is_the_first_sentence_spoken(self):
        from studio.writer import repair
        s = repair({'hook': 'A paraphrase.', 'chapters': [{'beats': [{'narration': 'Petah Tikva, nineteen sixty. The town waited.'}]}]})
        self.assertEqual(s['hook'], 'Petah Tikva, nineteen sixty.')
        ok = repair({'hook': 'Petah Tikva', 'chapters': [{'beats': [{'narration': 'Petah Tikva, nineteen sixty.'}]}]})
        self.assertEqual(ok['hook'], 'Petah Tikva')


if __name__ == '__main__':
    unittest.main()


class AutoFix(unittest.TestCase):
    def test_optional_devices_that_fail_are_dropped_and_form_cards_sorted(self):
        from studio.writer import autofix, _length_only
        ledger = {'claims': [{'id': 'a', 'fact': {'date': '2000-02-01'}}, {'id': 'b', 'fact': {'date': '1999-09-01'}}]}
        s = {'motif': 'the 12th man', 'chapters': [{'beats': [
            {'narration': 'x', 'slug': 'Alma — the final', 'visual': {'type': 'form', 'claims': ['a', 'b', 'a']}},
            {'narration': 'y', 'visual': {'type': 'trailer', 'lines': ['TWELVE NIGHTS', 'ONE CITY']}}]}]}
        errs = ['Chapter 1 beat 1: slug "Alma — the final" "Alma" is not in a claim cited in this beat',
                'Chapter 1 beat 1: a form card lists its matches in date order, each once',
                'Chapter 1 beat 2: trailer line "TWELVE NIGHTS" number twelve is not in the cited claims',
                '"motif" is an image, not a fact: no number, date, club or name in it']
        t = autofix(s, errs, ledger)
        b1, b2 = t['chapters'][0]['beats']
        self.assertNotIn('slug', b1)
        self.assertEqual(b1['visual']['claims'], ['b', 'a'])
        self.assertEqual(b2['visual']['lines'], ['ONE CITY'])
        self.assertNotIn('motif', t)
        self.assertIn('slug', s['chapters'][0]['beats'][0])  # the original is untouched
        self.assertTrue(_length_only('Narration is 767 words; a 5.0-minute film needs 549–658', 549, 658))
        self.assertFalse(_length_only('Narration is 900 words; a 5.0-minute film needs 549–658', 549, 658))

"""Two Gemini keys (owner, 12.11.2026): GEMINI_API_KEY and GEMINI_API_KEY_KIDS — use whichever works, by itself."""
import json
import os
import unittest
from unittest import mock

from studio import gemini as G
from studio import writer_check
from studio.common import StageError

A, B = 'AIza-first-key-material-0001', 'AIza-second-key-material-0002'
BODY = {'contents': [{'role': 'user', 'parts': [{'text': 'hi'}]}]}


def fake(answers):
    """http(url, body, headers) answering by key: 'ok', or the HTTP code to refuse with."""
    calls = []

    def http(url, body, headers, timeout=300):
        key = headers['x-goog-api-key']
        calls.append(key)
        a = answers[key]
        if a == 'ok':
            return {'candidates': [{'content': {'parts': [{'text': 'OK'}]}}]}
        detail = {402: 'Your prepayment credits are depleted', 403: 'API key not valid. Please pass a valid API key.',
                  401: 'unauthenticated', 429: '"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"'}[a]
        raise StageError(f'WRITER_HTTP_{a}', f'Writer provider answered {a}: {detail}', retryable=a == 429)
    http.calls = calls
    return http


class Keys(unittest.TestCase):
    def setUp(self):
        G.DEAD.clear(); G._DEAD_OTHER.clear(); G._WORKING.clear()
        p = mock.patch.object(G, 'gemini_candidates', lambda key, wanted=None: ['gemini-3.5-flash'])
        p.start(); self.addCleanup(p.stop)

    def env(self, **kw):
        e = mock.patch.dict(os.environ, kw)
        for k in G.KEY_NAMES:
            os.environ.pop(k, None)
        e.start(); self.addCleanup(e.stop)

    def test_first_key_402_second_is_used_and_remembered(self):
        self.env(GEMINI_API_KEY=A, GEMINI_API_KEY_KIDS=B)
        http, said = fake({A: 402, B: 'ok'}), []
        _r, model = G.generate(G.api_key(), BODY, http=http, log=said.append)
        self.assertEqual((model, http.calls), ('gemini-3.5-flash', [A, B]))
        self.assertEqual(G.api_key(), B)  # later callers start with the working key
        G.generate(G.api_key(), BODY, http=http)
        self.assertEqual(http.calls, [A, B, B])  # the dead key is not asked again
        self.assertTrue(any('GEMINI_API_KEY_KIDS answered' in m for m in said))
        self.assertFalse(any(A in m or B in m for m in said))

    def test_refused_and_daily_quota_also_move_on(self):
        for code in (401, 403, 429):
            G.DEAD.clear(); G._DEAD_OTHER.clear(); G._WORKING.clear()
            self.env(GEMINI_API_KEY=A, GEMINI_API_KEY_KIDS=B)
            http = fake({A: code, B: 'ok'})
            with mock.patch.object(G, 'GEMMA', []):
                G.generate(A, BODY, http=http)
            self.assertEqual(http.calls[-1], B, code)

    def test_both_fail_the_plain_error_names_both_secrets_and_no_key(self):
        self.env(GEMINI_API_KEY=A, GEMINI_API_KEY_KIDS=B)
        with self.assertRaises(StageError) as e:
            G.generate(A, BODY, http=fake({A: 402, B: 402}))
        text = str(e.exception)
        self.assertEqual((e.exception.code, e.exception.retryable), ('WRITER_NO_CREDIT', False))
        for word in ('All 2 Gemini keys', 'GEMINI_API_KEY (no credit)', 'GEMINI_API_KEY_KIDS (no credit)', 'WITHOUT billing'):
            self.assertIn(word, text)
        self.assertNotIn(A, text); self.assertNotIn(B, text); self.assertNotIn('AIza', text)

    def test_a_quota_that_comes_back_wins_over_no_credit(self):
        self.env(GEMINI_API_KEY=A, GEMINI_API_KEY_KIDS=B)
        with mock.patch.object(G, 'GEMMA', []), self.assertRaises(StageError) as e:
            G.generate(A, BODY, http=fake({A: 402, B: 429}))
        self.assertEqual((e.exception.code, e.exception.retryable), ('WRITER_QUOTA_DAY', True))
        self.assertIn('GEMINI_API_KEY_KIDS (quota)', str(e.exception))

    def test_empty_second_key_behaves_as_today(self):
        self.env(GEMINI_API_KEY=A, GEMINI_API_KEY_KIDS='  ')
        self.assertEqual(G.keys(), [('GEMINI_API_KEY', A)])
        http = fake({A: 402})
        with self.assertRaises(StageError) as e:
            G.generate(A, BODY, http=http)
        self.assertEqual((e.exception.code, str(e.exception), http.calls), ('WRITER_NO_CREDIT', G.NO_CREDIT, [A]))

    def test_only_the_second_secret_set_is_a_writer(self):
        self.env(GEMINI_API_KEY_KIDS=B)
        self.assertEqual(G.api_key(), B)

    def test_health_line_per_name_and_never_key_material(self):
        self.env(GEMINI_API_KEY=A, GEMINI_API_KEY_KIDS=B)
        hb = writer_check.heartbeat(http=fake({A: 402, B: 'ok'}))
        self.assertEqual([(r['name'], r['state']) for r in hb['keys']], [('GEMINI_API_KEY', 'no credit'), ('GEMINI_API_KEY_KIDS', 'ok')])
        self.assertTrue(hb['ok']); self.assertEqual(G.api_key(), B)
        self.assertRegex(hb['keys'][0]['at'], r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$')
        dumped = json.dumps(hb)
        self.assertNotIn(A, dumped); self.assertNotIn(B, dumped); self.assertNotIn('AIza', dumped)
        self.assertEqual(G.keys_line(hb['keys']), 'GEMINI_API_KEY: no credit · GEMINI_API_KEY_KIDS: ok')
        bad = writer_check.heartbeat(http=fake({A: 402, B: 403}))
        self.assertFalse(bad['ok']); self.assertEqual([r['state'] for r in bad['keys']], ['no credit', 'refused'])
        self.assertNotIn('AIza', json.dumps(bad))

    def test_no_key_at_all(self):
        self.env()
        self.assertEqual(writer_check.heartbeat()['provider'], 'none')


if __name__ == '__main__':
    unittest.main()

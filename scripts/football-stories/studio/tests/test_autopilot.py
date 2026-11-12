"""The autopilot's runner (owner, 12.11.2026): it only carries — and a message that did not arrive is never reported as one."""
import json
import unittest

from studio import autopilot as A

TOKEN = '123456:SECRET-bot-token'
PREVIEW = {'type': 'preview', 'id': 'job-auto-0001', 'caption': 'AUTOPILOT preview · The Night', 'video': {'url': 'https://s/preview', 'name': 'preview.mp4'}, 'thumbnail': 'https://s/thumb'}
SENT = {'text': 'At <b>12:03</b> Athens time … <a href="https://x/studio-cancel?job=j">Cancel publishing</a>', 'cancel': 'https://x/studio-cancel?job=j', 'publishAt': '2026-11-12T10:03:00.000Z'}


class Door:
    def __init__(self, out, chat='42'):
        self.out, self._chat, self.calls = out, chat, []

    def chat(self):
        return self._chat

    def call(self, op, **data):
        self.calls.append((op, data))
        if op == 'autopilot':
            return self.out
        return SENT if data.get('event') == 'preview_sent' else {'ok': True, 'go': True}

    def events(self):
        return [d.get('event') for op, d in self.calls if op == 'autopilot_report']


def tg(refuse=()):
    sent = []

    def call(token, method, fields, file=None):
        sent.append((method, fields, file[1] if file else None))
        return {'ok': method not in refuse}
    call.sent = sent
    return call


class Runner(unittest.TestCase):
    def run_(self, out, env=None, t=None, get=None, door=None):
        self.logs = []
        t = t or tg()
        door = door or Door(out)
        A.run({'TELEGRAM_BOT_TOKEN': TOKEN, **(env or {})}, door=door, tg=t, get=get or (lambda url, limit=0: b'x' * 10), log=self.logs.append)
        return door, t

    def test_lights_say_what_is_configured_and_handoff_is_the_publisher_today(self):
        door, _ = self.run_({'actions': []})
        self.assertEqual(door.calls[0], ('autopilot', {'lights': {'telegram': True, 'youtube': False}}))
        self.assertIsInstance(A.publisher({}), A.Handoff)
        self.assertFalse(A.YouTubeApi.configured({'YOUTUBE_ACCESS_TOKEN': ''}))
        door = Door({'actions': []}, chat=None)
        A.run({'TELEGRAM_BOT_TOKEN': TOKEN}, door=door, tg=tg(), log=lambda m: None)
        self.assertFalse(door.calls[0][1]['lights']['telegram'])  # no linked chat: the studio sends no preview
        door = Door({'actions': []})
        A.run({}, door=door, tg=tg(), log=lambda m: None)
        self.assertFalse(door.calls[0][1]['lights']['telegram'])

    def test_preview_picture_film_then_the_message_with_the_cancel_button(self):
        door, t = self.run_({'actions': [PREVIEW]})
        self.assertEqual([m for m, _f, _n in t.sent], ['sendPhoto', 'sendVideo', 'sendMessage'])
        self.assertEqual(door.events(), ['preview_sent', 'preview_delivered'])
        self.assertTrue(door.calls[1][1]['video'])
        msg = t.sent[-1][1]
        self.assertEqual(msg['text'], SENT['text'])
        self.assertEqual(msg['reply_markup']['inline_keyboard'][0][0], {'text': 'Cancel publishing', 'url': SENT['cancel']})

    def test_a_film_too_large_for_telegram_goes_as_a_link(self):
        door, t = self.run_({'actions': [PREVIEW]}, get=lambda url, limit=0: None if 'preview' in url else b'pic')
        self.assertEqual([m for m, _f, _n in t.sent], ['sendPhoto', 'sendMessage'])
        self.assertFalse(door.calls[1][1]['video'])  # the studio then puts a watch link in the text
        self.assertEqual(door.events(), ['preview_sent', 'preview_delivered'])

    def test_message_refused_is_reported_as_failed_never_as_delivered(self):
        door, _ = self.run_({'actions': [PREVIEW]}, t=tg(refuse=('sendMessage',)))
        self.assertEqual(door.events(), ['preview_sent', 'preview_failed'])
        door, _ = self.run_({'actions': [PREVIEW]}, get=lambda url, limit=0: (_ for _ in ()).throw(OSError('storage')))
        self.assertEqual(door.events(), ['preview_failed'])

    def test_a_notice_is_acknowledged_only_when_telegram_took_it(self):
        n = {'type': 'notice', 'id': 'job-auto-0001', 'key': 'cancelled', 'text': '🛑 <b>Publishing cancelled</b>'}
        door, t = self.run_({'actions': [n]})
        self.assertEqual((t.sent[0][0], door.calls[-1]), ('sendMessage', ('autopilot_report', {'id': 'job-auto-0001', 'event': 'notice_sent', 'key': 'cancelled'})))
        door, _ = self.run_({'actions': [n]}, t=tg(refuse=('sendMessage',)))
        self.assertEqual(door.events(), [])  # it is offered again on the next round

    def test_nothing_secret_is_logged(self):
        self.run_({'picked': 'job-auto-0001', 'actions': [PREVIEW]}, t=tg(refuse=('sendMessage',)))
        text = json.dumps(self.logs)
        self.assertNotIn(TOKEN, text); self.assertNotIn('SECRET', text); self.assertNotIn('https://s/', text)


class YouTube(unittest.TestCase):
    """The second publisher — not live today (no workflow passes its secret); tested against a fake uploader."""

    class Up:
        EXPECTED_CHANNEL = 'UC-test'

        def __init__(self, shown):
            self.shown, self.put = shown, []

        def upload(self, token, video, meta, state):
            self.meta, self.bytes = json.loads(meta.read_text()), video.read_bytes()
            return 'abcdefghijk'

        def request_json(self, url, token, method='GET', data=None):
            self.put.append(json.loads(data))
            return {'status': {'privacyStatus': self.shown}}

    ACTION = {'type': 'publish_youtube', 'id': 'job-auto-0001', 'chunks': ['https://s/a', 'https://s/b'],
              'meta': {'title': 'T', 'description': 'D', 'tags': ['x'], 'contains_synthetic_media': True}}

    def go(self, shown, door=None, get=None):
        up, door = self.Up(shown), door or Door({})
        A.YouTubeApi('tok', get or (lambda url, limit=0: url[-1].encode()), up).publish(self.ACTION, door, lambda m: None)
        return up, door

    def test_private_first_then_public_and_what_youtube_shows_is_what_is_reported(self):
        up, door = self.go('public')
        self.assertEqual((up.bytes, up.meta['channel_id']), (b'ab', 'UC-test'))
        self.assertEqual(up.put[0]['status']['privacyStatus'], 'public')
        self.assertEqual(door.calls[-1][1], {'id': 'job-auto-0001', 'event': 'youtube_result', 'videoId': 'abcdefghijk', 'privacy': 'public'})
        _up, door = self.go('private')  # an API project Google has not audited: asked public, shown private
        self.assertEqual(door.calls[-1][1]['privacy'], 'private')

    def test_cancelled_meanwhile_it_stays_private(self):
        class No(Door):
            def call(self, op, **data):
                self.calls.append((op, data))
                return {'go': False}
        up, door = self.go('public', door=No({}))
        self.assertEqual((up.put, door.events()), ([], ['youtube_uploaded']))

    def test_a_broken_upload_is_reported_and_never_retried(self):
        _up, door = self.go('public', get=lambda url, limit=0: None)
        self.assertEqual(door.calls[-1][1], {'id': 'job-auto-0001', 'event': 'youtube_result', 'error': 'RuntimeError'})


if __name__ == '__main__':
    unittest.main()

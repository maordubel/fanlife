"""The autopilot's runner (owner, 12.11.2026 — docs/rules/studio-autopilot.md), started by the listener when the peek says
there is something for it. The studio decides everything (lib/stories/autopilot.ts: the switch, the pick, the 10:00
Athens preview, the two hours to cancel); this runner only carries: it sends what the studio hands it to the owner's
Telegram and reports back, so a message that did not arrive is never taken for one that did (no preview = no publish).

Publishing is one interface with two implementations, chosen by what is configured:
  · YouTubeApi — engine/upload.py, only when YOUTUBE_ACCESS_TOKEN is in the environment AND the uploader is checked out.
    No workflow passes that secret today, so this path is not live; and a video uploaded through an API project that
    has not passed Google's audit stays private whatever is asked — the runner reports what YouTube really shows.
  · Handoff — the studio's own state: the owner is told on Telegram that the film is approved and waits for his upload.
Stdlib only (the listener runs on a bare runner). No token, key or signed address is ever printed.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

UA = 'Mozilla/5.0 (compatible; FanLife-Studio/1.0; +https://fanlife.dubelteam.com)'
TELEGRAM_MAX = 49 * 1024 * 1024  # the public Bot API takes at most 50 MB from a bot
ENGINE = Path(__file__).resolve().parents[1] / 'engine'


def _post(url: str, body: dict, secret: str, timeout: int = 60) -> dict:
    req = urllib.request.Request(url, json.dumps(body).encode(), {'Authorization': 'Bearer ' + secret, 'Content-Type': 'application/json', 'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


class Door:
    """The studio's worker door and the owner's linked Telegram chat (the Final Whistle link)."""

    def __init__(self, env):
        self.base = (env.get('STORIES_URL') or 'https://fanlife.dubelteam.com').rstrip('/')
        self.secret = env.get('FAN_LIFE_CRON_SECRET', '')
        self.worker = 'autopilot-' + str(env.get('GITHUB_RUN_ID', 'listener'))[:40]

    def call(self, op: str, **data) -> dict:
        return _post(self.base + '/api/master/stories/worker', {'op': op, 'worker': self.worker, **data}, self.secret)

    def chat(self) -> str | None:
        try:
            chat = _post(self.base + '/api/master/final-whistle/ping', {}, self.secret, 30).get('chatId')
            return str(chat) if chat else None
        except Exception:  # noqa: BLE001
            return None


def fetch(url: str, limit: int = TELEGRAM_MAX) -> bytes | None:
    """A file from storage, or None when it is larger than Telegram takes."""
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = r.read(limit + 1)
    return data if len(data) <= limit else None


def telegram(token: str, method: str, fields: dict, file: tuple[str, str, bytes, str] | None = None) -> dict:
    """One Bot API call → its JSON. `file` = (field, file name, bytes, content type) sends multipart."""
    url = f'https://api.telegram.org/bot{token}/{method}'
    if file is None:
        req = urllib.request.Request(url, json.dumps(fields).encode(), {'Content-Type': 'application/json'}, method='POST')
    else:
        boundary = 'fanlife' + os.urandom(8).hex()
        parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items()]
        parts += [f'--{boundary}\r\nContent-Disposition: form-data; name="{file[0]}"; filename="{file[1]}"\r\nContent-Type: {file[3]}\r\n\r\n'.encode(),
                  file[2], f'\r\n--{boundary}--\r\n'.encode()]
        req = urllib.request.Request(url, b''.join(parts), {'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.load(r)
    except Exception as e:  # noqa: BLE001 — the reason by its type only: an error text can carry the address, and the address the token
        return {'ok': False, 'description': type(e).__name__}


# ── publishing: one interface, two implementations ───────────────────────────────────────────────────────────────────
class Handoff:
    """Nothing to upload: the studio already told the owner the film is approved and waits for him (a notice)."""
    name = 'handoff'

    def publish(self, action: dict, door, log) -> None:  # pragma: no cover — the studio never hands this runner one
        log(f"Autopilot: {action['id']} waits for the owner's upload")


class YouTubeApi:
    """engine/upload.py: private first, then — only if the studio still says go (no cancel meanwhile) — public. What is
    reported is what YouTube shows afterwards, so a project Google has not audited is reported as private, not public."""
    name = 'youtube'

    def __init__(self, token: str, fetch_=fetch, uploader=None):
        self.token, self.fetch, self.uploader = token, fetch_, uploader

    @staticmethod
    def configured(env) -> bool:
        return bool(str(env.get('YOUTUBE_ACCESS_TOKEN') or '').strip()) and (ENGINE / 'upload.py').is_file()

    def _engine(self):
        if self.uploader is None:
            sys.path.insert(0, str(ENGINE))
            import upload  # noqa: PLC0415
            self.uploader = upload
        return self.uploader

    def publish(self, action: dict, door, log) -> None:
        up, job = self._engine(), action['id']
        try:
            with tempfile.TemporaryDirectory() as d:
                video, meta, state = Path(d) / 'master.mp4', Path(d) / 'meta.json', Path(d) / 'state.json'
                with video.open('wb') as f:
                    for url in action['chunks']:
                        part = self.fetch(url, 60 * 1024 * 1024) if url else None
                        if part is None:
                            raise RuntimeError('a part of the master could not be read')
                        f.write(part)
                meta.write_text(json.dumps({**action['meta'], 'channel_id': up.EXPECTED_CHANNEL}), encoding='utf-8')
                vid = up.upload(self.token, video, meta, state)
            log(f'Autopilot: {job} is on YouTube as private')
            if not door.call('autopilot_report', id=job, event='youtube_uploaded', videoId=vid).get('go'):
                log(f'Autopilot: {job} stays private — the publishing was cancelled meanwhile')
                return
            body = json.dumps({'id': vid, 'status': {'privacyStatus': 'public', 'selfDeclaredMadeForKids': False,
                                                     'containsSyntheticMedia': bool(action['meta'].get('contains_synthetic_media'))}}).encode()
            shown = up.request_json('https://www.googleapis.com/youtube/v3/videos?part=status', self.token, 'PUT', body)
            privacy = str((shown.get('status') or {}).get('privacyStatus') or 'private')
            door.call('autopilot_report', id=job, event='youtube_result', videoId=vid, privacy=privacy)
            log(f'Autopilot: {job} — YouTube shows it as {privacy}')
        except Exception as e:  # noqa: BLE001 — never retried by itself: the owner checks YouTube Studio first
            door.call('autopilot_report', id=job, event='youtube_result', error=type(e).__name__)
            log(f'::warning::Autopilot: the upload of {job} did not complete ({type(e).__name__})')


def publisher(env):
    return YouTubeApi(str(env.get('YOUTUBE_ACCESS_TOKEN')).strip()) if YouTubeApi.configured(env) else Handoff()


# ── the round ────────────────────────────────────────────────────────────────────────────────────────────────────────
def send_preview(a: dict, door, chat: str, token: str, tg, get, log) -> None:
    """The picture, the film (or a link when it is too large), then the message that carries the real publishing time and
    the Cancel link. The two hours start at `preview_sent`, a moment before that message leaves; only its arrival
    (`preview_delivered`) opens the window. Anything else is `preview_failed`: nothing is scheduled."""
    job = a['id']
    try:
        if a.get('thumbnail'):
            pic = get(a['thumbnail'], 9 * 1024 * 1024)
            if pic:
                tg(token, 'sendPhoto', {'chat_id': chat, 'caption': a['caption'], 'disable_notification': 'true'}, ('photo', 'thumbnail.jpg', pic, 'image/jpeg'))
        video = False
        if a.get('video'):
            data = get(a['video']['url'], TELEGRAM_MAX)
            if data:
                video = bool(tg(token, 'sendVideo', {'chat_id': chat, 'caption': a['caption'], 'supports_streaming': 'true', 'disable_notification': 'true'},
                                ('video', a['video'].get('name') or 'preview.mp4', data, 'video/mp4')).get('ok'))
        s = door.call('autopilot_report', id=job, event='preview_sent', video=video)
        r = tg(token, 'sendMessage', {'chat_id': chat, 'text': s['text'], 'parse_mode': 'HTML', 'disable_web_page_preview': True,
                                      'reply_markup': {'inline_keyboard': [[{'text': 'Cancel publishing', 'url': s['cancel']}]]}})
        if not r.get('ok'):
            raise RuntimeError('Telegram refused the message')
        door.call('autopilot_report', id=job, event='preview_delivered')
        log(f"Autopilot: preview of {job} delivered ({'with the film' if video else 'with a link'}) — publishing at {s.get('publishAt')}")
    except Exception as e:  # noqa: BLE001
        try:
            door.call('autopilot_report', id=job, event='preview_failed', error=type(e).__name__)
        except Exception:  # noqa: BLE001 — the claim runs out by itself; nothing was scheduled
            pass
        log(f'::warning::Autopilot: the preview of {job} was not delivered ({type(e).__name__}) — nothing is scheduled')


def run(env=None, door=None, tg=telegram, get=fetch, log=None) -> dict:
    env = os.environ if env is None else env
    log = log or (lambda m: print(m, flush=True))
    door = door or Door(env)
    token = str(env.get('TELEGRAM_BOT_TOKEN') or '').strip()
    chat = door.chat() if token else None
    pub = publisher(env)
    out = door.call('autopilot', lights={'telegram': bool(token and chat), 'youtube': pub.name == 'youtube'})
    if out.get('picked'):
        log(f"Autopilot: picked today's pitch — film {out['picked']} is queued")
    for a in out.get('actions') or []:
        if a['type'] == 'notice' and token and chat:
            r = tg(token, 'sendMessage', {'chat_id': chat, 'text': a['text'], 'parse_mode': 'HTML', 'disable_web_page_preview': True})
            if r.get('ok'):
                door.call('autopilot_report', id=a['id'], event='notice_sent', key=a['key'])
        elif a['type'] == 'preview' and token and chat:
            send_preview(a, door, chat, token, tg, get, log)
        elif a['type'] == 'publish_youtube':
            pub.publish(a, door, log)
    return out


if __name__ == '__main__':
    try:
        run()
    except Exception as error:  # noqa: BLE001
        print(f'::warning::Autopilot will retry on the next round ({type(error).__name__})', flush=True)

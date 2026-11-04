"""Send a finished CLASSIFIED render to the owner's linked Telegram chat — the same path the studio worker uses for
its Reel (studio/worker.py send_reel): the chat id from the Final Whistle link (POST /api/master/final-whistle/ping
with the CRON secret), the video through the bot's sendVideo.

    python3 scripts/football-stories/comic/telegram_send.py <video.mp4> [more.mp4 …] --caption "…" \
        [--document package.txt …] [--photo thumbnail.jpg …]

A full episode (produce.py) goes as a DRAFT: the preview video, the thumbnails as photos, and the package text as a
document. Nothing is uploaded to YouTube from here.

Env: TELEGRAM_BOT_TOKEN · FAN_LIFE_CRON_SECRET · STORIES_URL (or FAN_LIFE_RESEARCH_URL).
Exit 0 only when Telegram answered ok for every video; the log says exactly what happened.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from studio.worker import Studio  # noqa: E402

LIMIT = 49 * 1024 * 1024


KINDS = {'video': ('sendVideo', 'video/mp4'), 'document': ('sendDocument', 'application/octet-stream'),
         'photo': ('sendPhoto', 'image/jpeg')}


def form(fields: dict, field: str, path: Path, ctype: str) -> tuple[bytes, str]:
    boundary = 'fanlife' + os.urandom(8).hex()
    parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items()]
    parts += [f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{path.name}"\r\nContent-Type: {ctype}\r\n\r\n'.encode(),
              path.read_bytes(), f'\r\n--{boundary}--\r\n'.encode()]
    return b''.join(parts), boundary


def send(token: str, chat: str, video: Path, caption: str, kind: str = 'video') -> bool:
    method, ctype = KINDS[kind]
    fields = {'chat_id': chat, 'caption': caption[:1000]}
    if kind == 'video':
        fields['supports_streaming'] = 'true'
    body, boundary = form(fields, kind, video, ctype)
    req = urllib.request.Request(f'https://api.telegram.org/bot{token}/{method}', data=body,
                                 headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
    with urllib.request.urlopen(req, timeout=300) as r:
        return bool(json.load(r).get('ok'))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('videos', type=Path, nargs='+')
    ap.add_argument('--caption', default='CLASSIFIED')
    ap.add_argument('--document', type=Path, action='append', default=[], help='a file sent as a document (the package text)')
    ap.add_argument('--photo', type=Path, action='append', default=[], help='a picture sent as a photo (a thumbnail)')
    a = ap.parse_args()
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    secret = os.environ.get('FAN_LIFE_CRON_SECRET', '')
    base = os.environ.get('STORIES_URL') or os.environ.get('FAN_LIFE_RESEARCH_URL') or 'https://fanlife.dubelteam.com'
    if not token:
        print('Telegram: TELEGRAM_BOT_TOKEN is not set — not sent')
        return 1
    if len(secret) < 32:
        print('Telegram: FAN_LIFE_CRON_SECRET is not set — cannot find the linked chat — not sent')
        return 1
    try:
        chat = Studio(base, secret, 'classified-demo').ping_chat()
    except Exception as e:  # noqa: BLE001
        print(f'Telegram: the studio did not answer the chat lookup ({type(e).__name__}: {e}) — not sent')
        return 1
    if not chat:
        print('Telegram: no chat linked (Final Whistle) — not sent')
        return 1
    ok = True
    items = [(v, 'video') for v in a.videos] + [(p, 'photo') for p in a.photo] + [(d, 'document') for d in a.document]
    for v, kind in items:
        if not v.exists():
            print(f'Telegram: {v} does not exist — not sent')
            ok = False
            continue
        if v.stat().st_size > LIMIT:
            print(f'Telegram: {v.name} is over 49 MB — not sent')
            ok = False
            continue
        try:
            sent = send(token, chat, v, a.caption if kind == 'video' else v.name, kind)
        except Exception as e:  # noqa: BLE001
            print(f'Telegram: {v.name} was not sent ({type(e).__name__}: {e})')
            ok = False
            continue
        print(f'Telegram: {v.name} sent ({v.stat().st_size // 1024} KB)' if sent else f'Telegram: {v.name} was refused')
        ok = ok and sent
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())

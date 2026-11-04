"""Send a finished CLASSIFIED render to the owner's linked Telegram chat — the same path the studio worker uses for
its Reel (studio/worker.py send_reel): the chat id from the Final Whistle link (POST /api/master/final-whistle/ping
with the CRON secret), the video through the bot's sendVideo.

    python3 scripts/football-stories/comic/telegram_send.py <video.mp4> [more.mp4 …] --caption "…"

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


def send(token: str, chat: str, video: Path, caption: str) -> bool:
    boundary = 'fanlife' + os.urandom(8).hex()
    data = video.read_bytes()
    parts = [f'--{boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n{chat}\r\n'.encode(),
             f'--{boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'.encode(),
             f'--{boundary}\r\nContent-Disposition: form-data; name="supports_streaming"\r\n\r\ntrue\r\n'.encode(),
             f'--{boundary}\r\nContent-Disposition: form-data; name="video"; filename="{video.name}"\r\nContent-Type: video/mp4\r\n\r\n'.encode(),
             data, f'\r\n--{boundary}--\r\n'.encode()]
    req = urllib.request.Request(f'https://api.telegram.org/bot{token}/sendVideo', data=b''.join(parts),
                                 headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}, method='POST')
    with urllib.request.urlopen(req, timeout=300) as r:
        return bool(json.load(r).get('ok'))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('videos', type=Path, nargs='+')
    ap.add_argument('--caption', default='CLASSIFIED')
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
    for v in a.videos:
        if v.stat().st_size > LIMIT:
            print(f'Telegram: {v.name} is over 49 MB — not sent')
            ok = False
            continue
        try:
            sent = send(token, chat, v, a.caption)
        except Exception as e:  # noqa: BLE001
            print(f'Telegram: {v.name} was not sent ({type(e).__name__}: {e})')
            ok = False
            continue
        print(f'Telegram: {v.name} sent ({v.stat().st_size // 1024} KB)' if sent else f'Telegram: {v.name} was refused')
        ok = ok and sent
    return 0 if ok else 1


if __name__ == '__main__':
    raise SystemExit(main())

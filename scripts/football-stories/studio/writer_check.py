"""Does the script writer's key really work? One tiny request to the cheapest current Gemini model (never the Pro
quota), printed as the heartbeat the listener sends: {"provider","ok","model","note"}. No secret is printed."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio.common import StageError  # noqa: E402
from studio.gemini import GEMINI, _http, gemini_candidates  # noqa: E402


def main() -> None:
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        print(json.dumps({'provider': 'none', 'ok': False, 'note': 'GEMINI_API_KEY is not set'}))
        return
    tries = gemini_candidates(key, os.environ.get('STORIES_GEMINI_MODEL') or None)
    script_model = tries[0] if tries else None
    flash = [m for m in tries if '-flash' in m] or tries
    note = ''
    for m in flash[:5]:
        try:
            _http(f'{GEMINI}/models/{m}:generateContent', {'contents': [{'role': 'user', 'parts': [{'text': 'Say OK.'}]}],
                                                            'generationConfig': {'maxOutputTokens': 8}}, {'x-goog-api-key': key}, timeout=60)
            print(json.dumps({'provider': 'gemini', 'ok': True, 'model': script_model,
                              'note': f'checked on {m}'}))
            return
        except StageError as e:
            note = f'{m}: {e.code}'
            if e.code in ('WRITER_HTTP_401', 'WRITER_HTTP_403') and 'API key' in str(e):
                break
    print(json.dumps({'provider': 'gemini', 'ok': False, 'note': note[:150]}))


if __name__ == '__main__':
    main()

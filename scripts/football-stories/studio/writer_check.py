"""Do the script writer's keys really work? One tiny request per key to the cheapest current Gemini model (never the Pro
quota), printed as the heartbeat the listener sends: {"provider","ok","model","note","keys"}. `keys` is one line per
SECRET NAME (GEMINI_API_KEY, GEMINI_API_KEY_KIDS): ok / no credit / refused / quota, with the time — the desk shows it.
No key, and no part of one, is printed."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from studio import gemini  # noqa: E402

WORDS = {'no credit': "no credit: the key's Google project has billing on and a zero balance — use a key from a project without billing",
         'refused': 'Google refused the key', 'quota': "today's free quota is spent", 'error': 'the check could not get an answer'}


def heartbeat(env=None, http=None) -> dict:
    """The writer light: ok when ANY key answers, and the state of every key by name."""
    env = os.environ if env is None else env
    found = gemini.keys(env)
    if not found:
        return {'provider': 'none', 'ok': False, 'note': 'GEMINI_API_KEY is not set'}
    wanted = env.get('STORIES_GEMINI_MODEL') or None
    rows = gemini.check_keys(env, http=http, wanted=wanted)
    ok = [r for r in rows if r['state'] == 'ok']
    if ok:
        key = dict(found)[ok[0]['name']]
        tries = gemini.gemini_candidates(key, wanted)
        return {'provider': 'gemini', 'ok': True, 'model': tries[0] if tries else None, 'note': f"using {ok[0]['name']}", 'keys': rows}
    note = WORDS.get(rows[0]['state'], rows[0]['state']) if len(rows) == 1 else gemini.keys_line(rows)
    return {'provider': 'gemini', 'ok': False, 'note': note[:150], 'keys': rows}


def main() -> None:
    print(json.dumps(heartbeat()))


if __name__ == '__main__':
    main()

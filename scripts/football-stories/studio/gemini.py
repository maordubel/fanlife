"""Gemini, stdlib only (the listener imports it on a bare runner): which models a key can use, best first."""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timezone
import urllib.error
import urllib.request

from .common import StageError

GEMINI = 'https://generativelanguage.googleapis.com/v1beta'


def _gemini_version(mid: str) -> tuple:
    """'gemini-3.8-flash' → (3.8, 'flash'); ordering key for picking the newest model of a tier."""
    m = re.match(r'gemini-(\d+(?:\.\d+)?)-(pro|flash)(?:-(.*))?$', mid)
    if not m:
        return (0.0, '', 'x')
    return (float(m.group(1)), m.group(2), m.group(3) or '')


def gemini_candidates(key: str, wanted: str | None = None) -> list[str]:
    """The models to try, best first (4.11.2026: gemini-2.5-* answered 404 "no longer available to new users" although
    the model list still names them). The configured model, then the newest stable Pro, then the newest stable Flash,
    then previews — read from the key's own model list, so a new generation is used without a code change."""
    ids: list[str] = []
    try:
        req = urllib.request.Request(f'{GEMINI}/models?pageSize=200', headers={'x-goog-api-key': key})
        with urllib.request.urlopen(req, timeout=30) as r:
            for m in json.load(r).get('models') or []:
                mid = (m.get('name') or '').split('/')[-1]
                if 'generateContent' in (m.get('supportedGenerationMethods') or []) and _gemini_version(mid)[0] > 0:
                    ids.append(mid)
    except Exception:  # noqa: BLE001 — no list: fall back to names
        pass
    def rank(mid: str) -> tuple:
        v, tier, extra = _gemini_version(mid)
        unstable = any(x in extra for x in ('preview', 'exp', 'lite', 'tts', 'image', 'live', 'audio', 'thinking'))
        return (unstable, 0 if tier == 'pro' else 1, -v, extra)
    out = [wanted] if wanted else []
    out += sorted((i for i in ids if not _gemini_version(i)[2] or not any(x in _gemini_version(i)[2] for x in ('tts', 'image', 'live', 'audio'))), key=rank)
    if not ids:  # no model list: the names that were last known to answer
        out += ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash']
    out += GEMMA  # the open models: a far larger free quota, the last resort before waiting
    seen, uniq = set(), []
    for m in out:
        if m and m not in seen:
            seen.add(m)
            uniq.append(m)
    return uniq


GEMMA = ['gemma-3-27b-it']


def suggested_model(err: StageError) -> str | None:
    m = re.search(r'use models/([\w.-]+)', str(err))
    return m.group(1) if m else None


def _http(url: str, body: dict, headers: dict, timeout: int = 300) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', **headers}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read()[:6000].decode('utf-8', 'replace')
        retryable = e.code in (429, 500, 502, 503, 529)
        raise StageError('WRITER_HTTP_' + str(e.code), f'Writer provider answered {e.code}: {detail}', retryable=retryable) from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise StageError('WRITER_UNREACHABLE', f'Writer provider unreachable: {e}', retryable=True) from e


# ── the keys ─────────────────────────────────────────────────────────────────────────────────────────────────────────
# Owner, 12.11.2026: two Gemini keys are repository secrets — GEMINI_API_KEY (its billing project had no credit: 402)
# and GEMINI_API_KEY_KIDS — "check credit on both and use whichever works, by itself". A key is only ever named by its
# SECRET NAME: no key, and no part of one, is logged, raised or reported.
KEY_NAMES = ('GEMINI_API_KEY', 'GEMINI_API_KEY_KIDS')
_WORKING: list[str] = []  # the secret name that last answered in this process: later calls start with it
_FAILOVER = {'WRITER_NO_CREDIT': 'no credit', 'WRITER_KEY': 'refused', 'WRITER_QUOTA_DAY': 'quota'}


def keys(env=None) -> list[tuple[str, str]]:
    """(secret name, key) for every key that is set, the one known to work first."""
    env = os.environ if env is None else env
    found = [(n, str(env.get(n) or '').strip()) for n in KEY_NAMES]
    found = [(n, k) for n, k in found if k]
    return sorted(found, key=lambda x: x[0] not in _WORKING)


def api_key(env=None) -> str:
    """The key to start with ('' when none is set) — for the callers that speak to Google themselves (voice, images)."""
    k = keys(env)
    return k[0][1] if k else ''


def _remember(name: str) -> None:
    _WORKING[:] = [name]


def _order(key: str) -> list[tuple[str, str]]:
    """The keys one call may use: the one it was given first, then the others that are set. A key that is not one of
    the secrets (a test, a caller with its own) stands alone, exactly as before."""
    env = keys()
    if key not in [k for _n, k in env]:
        return [('the key', key)]
    return sorted(env, key=lambda x: (x[0] not in _WORKING, x[1] != key))


def check_keys(env=None, http=None, wanted: str | None = None, now=None) -> list[dict]:
    """Which key works? One tiny request per key (the cheapest current Flash model, never the Pro quota), as the listener's
    writer check always did. → [{'name', 'state': ok | no credit | refused | quota | error, 'at'}]; the first key that
    answers is remembered for the rest of the process. Nothing but the secret's NAME describes a key."""
    http = http or _http
    at = (now or datetime.now(timezone.utc)).strftime('%Y-%m-%dT%H:%M:%SZ')
    rows, first_ok = [], None
    for name, key in sorted(keys(env), key=lambda x: KEY_NAMES.index(x[0])):  # always in the secrets' own order
        tries = gemini_candidates(key, wanted)
        state = 'error'
        for m in ([x for x in tries if '-flash' in x] or tries)[:5]:
            try:
                http(f'{GEMINI}/models/{m}:generateContent', {'contents': [{'role': 'user', 'parts': [{'text': 'Say OK.'}]}],
                                                                'generationConfig': {'maxOutputTokens': 8}}, {'x-goog-api-key': key}, timeout=60)
                state = 'ok'
                break
            except StageError as e:
                if e.code == 'WRITER_HTTP_402':
                    state = 'no credit'
                    break
                if e.code == 'WRITER_HTTP_401' or (e.code == 'WRITER_HTTP_403' and 'API key' in str(e)):
                    state = 'refused'
                    break
                if e.code == 'WRITER_HTTP_429':
                    q = quota_info(e)
                    state = 'quota' if q['per_day'] or q['zero'] else state
        rows.append({'name': name, 'state': state, 'at': at})
        first_ok = first_ok or (name if state == 'ok' else None)
    if first_ok:
        _remember(first_ok)
    return rows


def keys_line(rows: list[dict]) -> str:
    return ' · '.join(f"{r['name']}: {r['state']}" for r in rows) or 'no Gemini key is set'


# ── one answer from the free tier, however busy it is ────────────────────────────────────────────────────────────────
# Measured 4.11.2026 (a film from the desk): three scripts in a row used up the per-MINUTE input quota, every model
# answered 429 within seconds, two answered 404 and two 503 — and the film failed with "fix the cause before retrying",
# although nothing was wrong but the clock. Now: a per-minute 429 or a 503 waits as long as Google asks (RetryInfo) and
# tries again; a per-DAY 429, a quota of 0, a 404 or a 403 rules the model out; and only when every model is ruled out
# or the wait budget is spent does the call fail — as WRITER_BUSY / WRITER_QUOTA_DAY, which the worker turns into a film
# that waits and starts again by itself (worker.py), never into a failed film.

NO_CREDIT = ('The Gemini key belongs to a Google project with billing switched on and no credit left, so Google refuses every '
             'request (HTTP 402). Fix: make a new key in Google AI Studio inside a project WITHOUT billing (that is the free '
             'tier) and paste it as the GitHub secret GEMINI_API_KEY — or top up that project\'s credit. Then press Retry.')

DEAD: set[str] = set()  # models this run learned are not served to the first key (404, 403, a quota of 0, a per-day quota spent)
_DEAD_OTHER: dict[str, set[str]] = {}  # …and the same for each further key, by its secret name: a quota belongs to a key


def quota_info(err: StageError) -> dict:
    """What a 429/503 body says: is the quota per day, is its limit zero, and how long Google asks us to wait."""
    t = str(err)
    per_day = bool(re.search(r'PerDay', t))
    zero = bool(re.search(r'"quotaValue"\s*:\s*"0"', t)) or 'limit: 0' in t
    m = re.search(r'"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"', t) or re.search(r'retry in (\d+(?:\.\d+)?)s', t, re.I)
    return {'per_day': per_day, 'zero': zero, 'retry_s': float(m.group(1)) if m else None}


def _gemma_body(body: dict) -> dict:
    """Gemma takes no system instruction and no JSON mode: the system text goes first in the user turn."""
    sys_text = ''.join(p.get('text', '') for p in (body.get('systemInstruction') or {}).get('parts') or [])
    contents = [dict(c) for c in body.get('contents') or []]
    if sys_text and contents:
        first = contents[0]
        first['parts'] = [{'text': sys_text + '\n\n'}] + list(first.get('parts') or [])
    gen = {k: v for k, v in (body.get('generationConfig') or {}).items() if k != 'responseMimeType'}
    gen['maxOutputTokens'] = min(int(gen.get('maxOutputTokens') or 8192), 8192)
    return {'contents': contents, 'generationConfig': gen}


def generate(key: str, body: dict, *, wanted: str | None = None, budget_s: float = 1200, log=None,
             sleep=time.sleep, clock=time.monotonic, http=None) -> tuple[dict, str]:
    """(response, model), from the first key that can answer. A key with no credit (402), a refused key (401/403) or a
    key whose daily free quota is spent on every model hands the call to the next key, and the key that answers is
    remembered for the rest of the process. Only when every key has failed does the call fail: with the plain-English
    error and how many keys were tried, each by its secret name."""
    say = log or (lambda _m: None)
    order = _order(key)
    failed: list[tuple[str, StageError]] = []
    for name, k in order:
        try:
            out = _generate_one(k, body, wanted=wanted, budget_s=budget_s, log=log, sleep=sleep, clock=clock, http=http, name=name)
            if name in KEY_NAMES:
                if failed:
                    say(f'Writer: {name} answered — it is used for the rest of this run')
                _remember(name)
            return out
        except StageError as e:
            if e.code not in _FAILOVER:
                raise
            failed.append((name, e))
            if len(failed) < len(order):
                say(f'Writer: {name} cannot answer ({_FAILOVER[e.code]}) — trying the next key')
    if len(failed) == 1:
        raise failed[0][1]
    # a spent daily quota comes back by itself (the film waits); no credit and a refused key need the owner
    codes = [e.code for _n, e in failed]
    code = next(c for c in ('WRITER_QUOTA_DAY', 'WRITER_NO_CREDIT', 'WRITER_KEY') if c in codes)
    tried = ', '.join(f'{n} ({_FAILOVER[e.code]})' for n, e in failed)
    last = next(e for _n, e in failed if e.code == code)
    raise StageError(code, f'All {len(failed)} Gemini keys were tried and none can write: {tried}. {last}', retryable=code == 'WRITER_QUOTA_DAY') from last


def _generate_one(key: str, body: dict, *, wanted: str | None = None, budget_s: float = 1200, log=None,
                  sleep=time.sleep, clock=time.monotonic, http=None, name: str = 'the key') -> tuple[dict, str]:
    """(response, model). Raises WRITER_QUOTA_DAY when every model's daily free quota is spent, WRITER_BUSY when the
    wait budget ran out on per-minute limits or overload, WRITER_NO_CREDIT (at once, never retried) when the key's billing
    project has no credit (402), WRITER_HTTP_4xx for a request Google refuses as malformed."""
    http = http or _http
    say = log or (lambda _m: None)
    DEAD = globals()['DEAD'] if name in ('the key', KEY_NAMES[0]) else _DEAD_OTHER.setdefault(name, set())
    tries = [m for m in gemini_candidates(key, wanted) if m not in DEAD]
    t0 = clock()
    waits: dict[str, float] = {}  # model → the clock time it may be asked again
    fails: dict[str, int] = {}
    seen: list[str] = []
    while True:
        live = [m for m in tries if m not in DEAD]
        if not live:
            raise StageError('WRITER_QUOTA_DAY', "Gemini's free quota for today is used up on every model "
                             f'({"; ".join(seen[-12:])}). The film waits and starts again by itself.', retryable=True)
        ready = [m for m in live if waits.get(m, 0) <= clock()]
        if not ready:
            nxt = min(waits[m] for m in live)
            if nxt - t0 > budget_s:
                raise StageError('WRITER_BUSY', f'Gemini stayed busy for {round((clock() - t0) / 60)} minutes '
                                 f'({"; ".join(seen[-12:])}). The film waits and starts again by itself.', retryable=True)
            say(f'Writer: every model is busy — waiting {round(nxt - clock())}s, as Google asks')
            sleep(max(1.0, nxt - clock()))
            continue
        model = ready[0]
        try:
            b = _gemma_body(body) if model.startswith('gemma') else body
            return http(f'{GEMINI}/models/{model}:generateContent', b, {'x-goog-api-key': key}), model
        except StageError as e:
            code = e.code
            if code == 'WRITER_HTTP_402':
                # Measured 12.11.2026: 8 of 9 runs died on "Your prepayment credits are depleted" and the desk showed the
                # raw HTTP body. Billing belongs to the key's Google Cloud project, so every model answers the same:
                # no other model, no retry and no wait can help — say what it is and what fixes it, once.
                raise StageError('WRITER_NO_CREDIT', NO_CREDIT, retryable=False) from e
            seen.append(f'{model}: {code[12:] if code.startswith("WRITER_HTTP_") else code}')
            hint = suggested_model(e)
            if hint and hint not in tries and hint not in DEAD:
                tries.insert(tries.index(model) + 1, hint)
            if code in ('WRITER_HTTP_404', 'WRITER_HTTP_403', 'WRITER_HTTP_401'):
                if code == 'WRITER_HTTP_401' or (code == 'WRITER_HTTP_403' and 'API key' in str(e) and 'not valid' in str(e).lower()):
                    secret = name if name in KEY_NAMES else 'GEMINI_API_KEY'
                    raise StageError('WRITER_KEY', f'Google refused the {secret} — make a new free key in Google AI Studio '
                                     f'and paste it as the GitHub secret {secret}.', retryable=False) from e
                DEAD.add(model)
            elif code == 'WRITER_HTTP_429':
                q = quota_info(e)
                if q['per_day'] or q['zero']:
                    DEAD.add(model)
                else:
                    waits[model] = clock() + min(90.0, (q['retry_s'] or 30.0) + 2)
            elif code in ('WRITER_HTTP_500', 'WRITER_HTTP_502', 'WRITER_HTTP_503', 'WRITER_HTTP_504', 'WRITER_UNREACHABLE'):
                fails[model] = fails.get(model, 0) + 1
                waits[model] = clock() + min(120.0, 15.0 * 2 ** (fails[model] - 1))
                if fails[model] >= 5:
                    waits[model] = clock() + 600
            elif code == 'WRITER_HTTP_400' and model.startswith('gemma'):
                DEAD.add(model)
            else:
                raise

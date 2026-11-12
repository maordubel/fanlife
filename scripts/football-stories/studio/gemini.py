"""Gemini, stdlib only (the listener imports it on a bare runner): which models a key can use, best first."""
from __future__ import annotations

import json
import re
import time
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

DEAD: set[str] = set()  # models this run learned are not served to this key (404, 403, a quota of 0, a per-day quota spent)


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
    """(response, model). Raises WRITER_QUOTA_DAY when every model's daily free quota is spent, WRITER_BUSY when the
    wait budget ran out on per-minute limits or overload, WRITER_NO_CREDIT (at once, never retried) when the key's billing
    project has no credit (402), WRITER_HTTP_4xx for a request Google refuses as malformed."""
    http = http or _http
    say = log or (lambda _m: None)
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
            if code in ('WRITER_HTTP_404', 'WRITER_HTTP_403'):
                if code == 'WRITER_HTTP_403' and 'API key' in str(e) and 'not valid' in str(e).lower():
                    raise StageError('WRITER_KEY', 'Google refused the GEMINI_API_KEY — make a new free key in Google AI Studio '
                                     'and paste it as the GitHub secret GEMINI_API_KEY.', retryable=False) from e
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

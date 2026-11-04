"""Gemini, stdlib only (the listener imports it on a bare runner): which models a key can use, best first."""
from __future__ import annotations

import json
import re
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
    out += ['gemini-2.5-pro', 'gemini-2.5-flash']
    seen, uniq = set(), []
    for m in out:
        if m and m not in seen:
            seen.add(m)
            uniq.append(m)
    return uniq


def suggested_model(err: StageError) -> str | None:
    m = re.search(r'use models/([\w.-]+)', str(err))
    return m.group(1) if m else None


def _http(url: str, body: dict, headers: dict, timeout: int = 300) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', **headers}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read()[:400].decode('utf-8', 'replace')
        retryable = e.code in (429, 500, 502, 503, 529)
        raise StageError('WRITER_HTTP_' + str(e.code), f'Writer provider answered {e.code}: {detail}', retryable=retryable) from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise StageError('WRITER_UNREACHABLE', f'Writer provider unreachable: {e}', retryable=True) from e

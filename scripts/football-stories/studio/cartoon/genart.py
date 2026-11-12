"""Pictures made for THIS story (owner, 8.11.2026: "colours unrelated to the stories … this is not animation"; his
answer: generate the scenes with Gemini — a small cost is fine — and illustrate the players themselves).

Every Short gets its own cast and sets, drawn by Gemini's image model in ONE art style:
  * a SET per beat — the place the line happens in (Turin's stadium at night in 1990, the Brazil bench), 9:16,
    with no people in the foreground so the cast can act in it;
  * a CAST — each player drawn once as a model sheet (by his kit, number, era and look, never as a photograph), then
    every pose he needs drawn FROM that sheet so he stays the same man, on a flat key colour that is cut away;
  * two drawings of every pose (A and B, mid-motion), so the figure is animated, not slid.
The story's real colours come in through the descriptions (Brazil yellow and blue, Argentina sky-blue stripes); a
Short made for a club still has its rival's colour family scrubbed afterwards (rule 95).

Every image is cached by the hash of what was asked, so a re-render costs nothing and a changed line costs one image.
The price is a few cents an image (owner's choice); the count is printed in the log.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from ..common import StageError

API = 'https://generativelanguage.googleapis.com/v1beta'
STYLE = ('A frame from a modern 2D animated cartoon for YouTube Shorts: bold clean dark outlines, flat cel colours with '
         'soft painted shading, warm cinematic light, expressive simple faces with big eyes, slightly exaggerated '
         'proportions, rich detailed painted background. No text, no letters, no numbers on signs, no logos, no '
         'watermarks, no captions, no frames or borders.')
CAST_STYLE = ('Character model for a 2D animated cartoon: bold clean dark outlines, flat cel colours with soft shading, '
              'expressive face, slightly exaggerated proportions (big head, readable silhouette). FULL BODY from head to '
              'shoes, centred, nothing cropped, standing on nothing. The background is ONE flat solid {key_name} colour '
              '({key_hex}) edge to edge — no floor, no shadow, no gradient, no other object. No text, no logos.')
KEYS = {'magenta': ('#FF00FF', (255, 0, 255)), 'green': ('#00FF00', (0, 255, 0))}
COUNT = {'images': 0, 'cached': 0}


def _key() -> str:
    from ..gemini import api_key  # the key LIST: the one known to work first
    k = api_key()
    if not k:
        raise StageError('GENART_NO_KEY', 'GEMINI_API_KEY is not set: the animated Short needs Gemini to draw its scenes')
    return k


def models(key: str) -> list[str]:
    """The image models this key may call, preferred first: STORIES_IMAGE_MODEL, then the newest Flash image model
    (cheapest), then the Pro image models."""
    want = os.environ.get('STORIES_IMAGE_MODEL', '').strip()
    ids: list[str] = []
    try:
        req = urllib.request.Request(f'{API}/models?pageSize=200', headers={'x-goog-api-key': key})
        with urllib.request.urlopen(req, timeout=30) as r:
            for m in json.load(r).get('models') or []:
                mid = m.get('name', '').removeprefix('models/')
                if '-image' in mid and 'imagen' not in mid and 'generateContent' in (m.get('supportedGenerationMethods') or []):
                    ids.append(mid)
    except Exception:  # noqa: BLE001 — a listing hiccup falls back to the known names
        pass
    if not ids:
        ids = ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image', 'gemini-3-pro-image-preview']

    def rank(mid: str):
        v = re.search(r'gemini-(\d+(?:\.\d+)?)', mid)
        return (0 if 'flash' in mid else 1, -(float(v.group(1)) if v else 0))
    ids = sorted(set(ids), key=rank)
    return ([want] if want else []) + [m for m in ids if m != want]


_DEAD: set[str] = set()


def _call(key: str, model: str, parts: list[dict], aspect: str) -> bytes:
    body = {'contents': [{'role': 'user', 'parts': parts}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': aspect}}}
    req = urllib.request.Request(f'{API}/models/{model}:generateContent', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': key}, method='POST')
    with urllib.request.urlopen(req, timeout=240) as r:
        out = json.load(r)
    for cand in out.get('candidates') or []:
        for p in (cand.get('content') or {}).get('parts') or []:
            data = (p.get('inlineData') or p.get('inline_data') or {}).get('data')
            if data:
                return base64.b64decode(data)
    reason = json.dumps(out.get('promptFeedback') or [c.get('finishReason') for c in out.get('candidates') or []])[:300]
    raise StageError('GENART_NO_IMAGE', f'{model} returned no image ({reason})', retryable=True)


def draw(prompt: str, cache: Path, *, aspect: str = '9:16', refs: list[Path] | None = None, log=print) -> Path:
    """One image for `prompt` (with reference images), cached by the hash of both."""
    cache.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256(json.dumps([prompt, aspect, [hashlib.sha256(p.read_bytes()).hexdigest() for p in refs or []]]).encode()).hexdigest()[:20]
    out = cache / f'{h}.png'
    if out.exists():
        COUNT['cached'] += 1
        return out
    key = _key()
    parts: list[dict] = [{'inlineData': {'mimeType': 'image/png', 'data': base64.b64encode(p.read_bytes()).decode()}} for p in refs or []]
    parts.append({'text': prompt})
    last: Exception | None = None
    for model in [m for m in models(key) if m not in _DEAD]:
        for attempt in range(4):
            try:
                raw = _call(key, model, parts, aspect)
                Image.open(io.BytesIO(raw)).convert('RGB').save(out)
                COUNT['images'] += 1
                return out
            except urllib.error.HTTPError as e:
                detail = e.read()[:2000].decode('utf-8', 'replace')
                last = StageError('GENART_HTTP_' + str(e.code), f'{model}: {e.code} {detail}')
                if e.code in (400, 403, 404) or 'limit: 0' in detail or '"quotaValue": "0"' in detail:
                    _DEAD.add(model)
                    log(f'Image model {model} is not available to this key ({e.code}); trying the next')
                    break
                time.sleep(min(60, 6 * (attempt + 1)))
            except StageError as e:
                last = e
                time.sleep(3)
            except (urllib.error.URLError, TimeoutError) as e:
                last = e
                time.sleep(5)
    raise StageError('GENART_FAILED', f'no image model could draw this picture: {last}. If the message says the quota is 0, '
                                      'image generation needs billing switched on for the Gemini key (Google AI Studio → Billing).')


def key_colour(look: str) -> str:
    """The flat colour a figure is drawn on: one his kit does not wear."""
    low = look.lower()
    return 'green' if re.search(r'pink|magenta|purple|violet|fuchsia|maroon', low) else 'magenta'


def cut(src: Path, key: str, dest: Path) -> Path:
    """Cut a figure off its flat key colour: distance from the key in RGB, a soft edge, the key's spill taken out."""
    im = Image.open(src).convert('RGB')
    a = np.asarray(im, 'float32')
    k = np.array(KEYS[key][1], 'float32')
    # sample the real key from the corners (models rarely hit the exact hex)
    corners = np.concatenate([a[:12, :12].reshape(-1, 3), a[:12, -12:].reshape(-1, 3), a[-12:, :12].reshape(-1, 3), a[-12:, -12:].reshape(-1, 3)])
    med = np.median(corners, axis=0)
    if np.linalg.norm(med - k) < 160:
        k = med
    d = np.linalg.norm(a - k, axis=2)
    alpha = np.clip((d - 60) / 70, 0, 1)
    # spill: pull the key colour out of edge pixels
    if key == 'magenta':
        spill = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
        fix = np.clip(spill, 0, None) * (1 - alpha) * 0.9
        a[..., 0] -= fix
        a[..., 2] -= fix
    else:
        spill = a[..., 1] - np.maximum(a[..., 0], a[..., 2])
        a[..., 1] -= np.clip(spill, 0, None) * (1 - alpha) * 0.9
    A = Image.fromarray((alpha * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = Image.fromarray(np.clip(a, 0, 255).astype('uint8')).convert('RGBA')
    rgba.putalpha(A)
    box = rgba.getbbox()
    if box:
        rgba = rgba.crop(box)
    rgba.save(dest)
    return dest


def set_prompt(scene: str, era: str = '') -> str:
    return (f'{STYLE}\nVertical 9:16 frame. The place: {scene}{(" — " + era) if era else ""}. Leave the lower third of the '
            'frame clear of people (characters will be placed there); people far in the background are fine. Strong depth, '
            'a clear focal point, the real colours of the teams and places described.')


def model_sheet_prompt(look: str, key: str) -> str:
    return (CAST_STYLE.format(key_name=key, key_hex=KEYS[key][0]) + f'\nThe character: {look}. Neutral standing pose, '
            'arms relaxed, facing three-quarters towards the viewer.')


def pose_prompt(look: str, action: str, key: str, frame: str) -> str:
    return (CAST_STYLE.format(key_name=key, key_hex=KEYS[key][0]) + f'\nTHE SAME character as in the reference image — '
            f'same face, hair, kit and colours — now {action}. {frame} Keep the whole body in frame.')

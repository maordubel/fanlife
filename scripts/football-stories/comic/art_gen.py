"""Comic panel art for the stories series, generated on a GitHub runner (the keys live in Actions secrets).

    python3 scripts/football-stories/comic/art_gen.py <job.json> <out dir>

job.json: {"style": "...shared style block...", "models": ["gemini-3-pro-image-preview", ...],
           "panels": [{"id": "...", "prompt": "...", "aspect": "16:9", "refs": ["path/to/ref.png"]}]}
Each panel is drawn once per model into <out>/<id>--<model>.png, with a log line per call (model, seconds, bytes or the
refusal). Nothing is retried automatically: a refused prompt is reported, never reworded behind the owner's back.
Costs: one image per panel per model (see the log); the job file is the budget.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

NEG = ('No text, no letters, no speech bubbles, no captions, no logos, no club crests, no brand names, no watermark. '
       'Every person is an anonymous, invented character — no likeness of any real person.')


def post(url: str, body: dict, headers: dict, timeout: int = 240) -> dict:
    req = urllib.request.Request(url, json.dumps(body).encode(), {'content-type': 'application/json', **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'error': f'HTTP {e.code}: {e.read().decode(errors="replace")[:400]}'}
    except Exception as e:  # noqa: BLE001
        return {'error': f'{type(e).__name__}: {e}'}


def gemini(model: str, prompt: str, aspect: str, refs: list[Path]) -> bytes | str:
    key = os.environ.get('GEMINI_API_KEY', '')
    if not key:
        return 'no GEMINI_API_KEY'
    if model.startswith('imagen'):
        r = post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:predict',
                 {'instances': [{'prompt': prompt}], 'parameters': {'sampleCount': 1, 'aspectRatio': aspect}}, {'x-goog-api-key': key})
        if 'error' in r:
            return str(r['error'])
        p = (r.get('predictions') or [{}])[0]
        return base64.b64decode(p['bytesBase64Encoded']) if p.get('bytesBase64Encoded') else f'no image: {json.dumps(r)[:300]}'
    parts = [{'inline_data': {'mime_type': 'image/png', 'data': base64.b64encode(f.read_bytes()).decode()}} for f in refs] + [{'text': prompt}]
    cfg = {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': aspect}}
    if 'pro' in model:
        cfg['imageConfig']['imageSize'] = '2K'
    r = post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
             {'contents': [{'parts': parts}], 'generationConfig': cfg}, {'x-goog-api-key': key})
    if 'error' in r:
        return str(r['error'])
    for c in r.get('candidates') or []:
        for p in (c.get('content') or {}).get('parts') or []:
            d = p.get('inlineData') or p.get('inline_data')
            if d and d.get('data'):
                return base64.b64decode(d['data'])
    return f'no image: {json.dumps(r)[:400]}'


def openai(model: str, prompt: str, aspect: str) -> bytes | str:
    key = os.environ.get('OPENAI_API_KEY', '')
    if not key:
        return 'no OPENAI_API_KEY'
    size = {'16:9': '1536x1024', '9:16': '1024x1536', '1:1': '1024x1024'}.get(aspect, '1536x1024')
    r = post('https://api.openai.com/v1/images/generations', {'model': model, 'prompt': prompt, 'size': size, 'quality': 'medium', 'n': 1},
             {'Authorization': 'Bearer ' + key})
    if 'error' in r:
        return str(r['error'])
    d = (r.get('data') or [{}])[0]
    return base64.b64decode(d['b64_json']) if d.get('b64_json') else f'no image: {json.dumps(r)[:300]}'


def pollinations(model: str, prompt: str, aspect: str, seed: int) -> bytes | str:
    """Pollinations' free FLUX endpoint (no key). One request every ~16 s for anonymous use."""
    import urllib.parse
    w, h = {'16:9': (1536, 864), '9:16': (864, 1536), '1:1': (1024, 1024)}.get(aspect, (1536, 864))
    m = model.split(':', 1)[1] if ':' in model else 'flux'
    url = (f'https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt[:1800])}'
           f'?width={w}&height={h}&model={m}&nologo=true&private=true&enhance=false&seed={seed}')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'fanlife-studio'}), timeout=300) as r:
            data = r.read()
            return data if data[:4] in (b'\x89PNG', b'\xff\xd8\xff\xe0', b'\xff\xd8\xff\xe1', b'\xff\xd8\xff\xdb') or len(data) > 20000 else f'not an image: {data[:200]!r}'
    except urllib.error.HTTPError as e:
        return f'HTTP {e.code}: {e.read().decode(errors="replace")[:300]}'
    except Exception as e:  # noqa: BLE001
        return f'{type(e).__name__}: {e}'


def main() -> int:
    job, out = json.loads(Path(sys.argv[1]).read_text()), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    log = []
    for p in job['panels']:
        prompt = f"{job.get('style', '')}\n\nPANEL: {p['prompt']}\n\n{NEG}"
        refs = [Path(r) for r in p.get('refs', [])]
        for m in p.get('models') or job['models']:
            t0 = time.time()
            if m.startswith('pollinations'):
                res = pollinations(m, prompt, p.get('aspect', '16:9'), p.get('seed', 7))
                time.sleep(16)
            elif m.startswith('gpt-image'):
                res = openai(m, prompt, p.get('aspect', '16:9'))
            else:
                res = gemini(m, prompt, p.get('aspect', '16:9'), refs)
            dt = round(time.time() - t0, 1)
            if isinstance(res, bytes):
                f = out / f"{p['id']}--{m.replace(':', '-')}.png"
                f.write_bytes(res)
                log.append({'panel': p['id'], 'model': m, 'seconds': dt, 'bytes': len(res), 'file': f.name})
            else:
                log.append({'panel': p['id'], 'model': m, 'seconds': dt, 'refused': res})
            print(json.dumps(log[-1])[:500], flush=True)
    (out / 'log.json').write_text(json.dumps(log, indent=1))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

"""A depth map for a panel: Depth Anything V2 Small (ONNX, Apache-2.0) when it is there, a saliency estimate when not.

The model is downloaded on the GitHub runner (classified-demo.yml) and cached; its path is CLASSIFIED_DEPTH_MODEL or
~/.cache/fanlife-classified/depth-anything-v2-small.onnx. Without it — or when it fails to load or run — the fallback
answers: a subject mask from spectral-residual saliency refined by GrabCut, plus a ground prior (lower in frame = nearer).
Either way the result is float32 HxW in 0..1, larger = nearer, edge-snapped to the picture with a guided filter.
The pipeline never stops because a model is missing; it says which one it used.
"""
from __future__ import annotations

import os
from pathlib import Path

import cv2
import numpy as np

MODEL_URL = 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx'
DEFAULT_MODEL = Path.home() / '.cache' / 'fanlife-classified' / 'depth-anything-v2-small.onnx'
_SESSION = {}


def model_path() -> Path:
    return Path(os.environ.get('CLASSIFIED_DEPTH_MODEL') or DEFAULT_MODEL)


def guided(I: np.ndarray, p: np.ndarray, r: int, eps: float) -> np.ndarray:
    """He et al.'s guided filter (grey guide): smooths p while keeping I's edges."""
    k = (2 * r + 1, 2 * r + 1)
    box = lambda a: cv2.boxFilter(a, -1, k, borderType=cv2.BORDER_REFLECT)
    mI, mp = box(I), box(p)
    cov = box(I * p) - mI * mp
    var = box(I * I) - mI * mI
    a = cov / (var + eps)
    b = mp - a * mI
    return box(a) * I + box(b)


def _norm(d: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(d, 2), np.percentile(d, 98)
    return np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1).astype(np.float32)


def _gray(rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0


def model_depth(rgb: np.ndarray) -> np.ndarray | None:
    p = model_path()
    if not p.exists() or p.stat().st_size < 1_000_000:
        return None
    try:
        import onnxruntime as ort
        if str(p) not in _SESSION:
            so = ort.SessionOptions()
            so.log_severity_level = 3
            _SESSION[str(p)] = ort.InferenceSession(str(p), so, providers=['CPUExecutionProvider'])
        s = _SESSION[str(p)]
        inp = s.get_inputs()[0]
        H, W = rgb.shape[:2]
        shp = inp.shape
        h = shp[2] if isinstance(shp[2], int) else 518
        w = shp[3] if isinstance(shp[3], int) else max(14, int(round(518 * W / H / 14)) * 14)
        x = cv2.resize(rgb, (w, h), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
        x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
        x = x.transpose(2, 0, 1)[None].astype(np.float32)
        out = np.asarray(s.run(None, {inp.name: x})[0], np.float32).squeeze()
        if out.ndim != 2:
            return None
        d = cv2.resize(out, (W, H), interpolation=cv2.INTER_CUBIC)
        return _norm(d)
    except Exception:  # noqa: BLE001 — any failure falls back; the caller reports which path was taken
        return None


def saliency(gray: np.ndarray) -> np.ndarray:
    """Spectral residual saliency (Hou & Zhang 2007) at a small size."""
    small = cv2.resize(gray, (128, max(8, int(128 * gray.shape[0] / gray.shape[1]))))
    f = np.fft.fft2(small)
    amp, ph = np.log(np.abs(f) + 1e-8), np.angle(f)
    res = amp - cv2.blur(amp, (3, 3))
    sal = np.abs(np.fft.ifft2(np.exp(res + 1j * ph))) ** 2
    sal = cv2.GaussianBlur(sal.astype(np.float32), (0, 0), 3)
    return _norm(cv2.resize(sal, (gray.shape[1], gray.shape[0]), interpolation=cv2.INTER_CUBIC))


def fallback_depth(rgb: np.ndarray) -> np.ndarray:
    """Three plateaus, not a gradient (a threshold through a gradient tears objects in half): the background and
    floor ≤ .3 (a gentle floor ramp), the subject GrabCut finds ≈ .7, and whatever of the subject stands on the
    bottom edge of the frame ≈ 1 (the nearest thing)."""
    H, W = rgb.shape[:2]
    gray = _gray(rgb)
    sal = saliency(gray)
    edges = cv2.GaussianBlur(np.hypot(cv2.Sobel(gray, cv2.CV_32F, 1, 0), cv2.Sobel(gray, cv2.CV_32F, 0, 1)), (0, 0), W / 60)
    edges = _norm(edges)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    centre = np.exp(-(((xx / W - .5) / .38) ** 2 + ((yy / H - .55) / .42) ** 2))
    prior = _norm(.55 * sal + .25 * edges + .2 * centre)
    s = 480 / W
    sm = cv2.resize(rgb, (480, max(8, int(H * s))))
    pr = cv2.resize(prior, (sm.shape[1], sm.shape[0]))
    mask = np.full(pr.shape, cv2.GC_PR_BGD, np.uint8)
    mask[pr > np.percentile(pr, 65)] = cv2.GC_PR_FGD
    mask[pr > np.percentile(pr, 93)] = cv2.GC_FGD
    mask[pr < np.percentile(pr, 30)] = cv2.GC_BGD
    fg = (pr > np.percentile(pr, 75)).astype(np.float32)
    try:
        bgm, fgm = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(cv2.cvtColor(sm, cv2.COLOR_RGB2BGR), mask, None, bgm, fgm, 4, cv2.GC_INIT_WITH_MASK)
        g = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1.0, 0.0).astype(np.float32)
        if 0.02 < g.mean() < 0.7:
            fg = g
    except cv2.error:
        pass
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((fg > .5).astype(np.uint8), 8)
    subj = np.zeros_like(fg)
    near = np.zeros_like(fg)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < .004 * fg.size:
            continue
        comp = (lab == i).astype(np.float32)
        touches = stats[i, cv2.CC_STAT_TOP] + stats[i, cv2.CC_STAT_HEIGHT] >= fg.shape[0] - 2
        (near if touches and stats[i, cv2.CC_STAT_AREA] < .25 * fg.size else subj)[:] += comp
    up = lambda a: cv2.resize(a, (W, H), interpolation=cv2.INTER_LINEAR)
    ground = np.clip((yy / H - .5) * 2, 0, 1) * .3
    d = np.maximum(ground, np.maximum(up(subj) * .7, up(near)))
    return d.astype(np.float32)


def depth_map(rgb: np.ndarray, allow_model: bool = True) -> tuple[np.ndarray, str]:
    """(depth 0..1 nearer=larger, method). Edge-snapped to the picture."""
    d, how = (model_depth(rgb), 'depth-anything-v2-small') if allow_model else (None, '')
    if d is None:
        d, how = fallback_depth(rgb), 'fallback-saliency'
    gray = _gray(rgb)
    if how == 'depth-anything-v2-small':
        r = max(4, rgb.shape[1] // 240)
        d = np.clip(guided(gray, d.astype(np.float32), r, 1e-3), 0, 1)
    return d.astype(np.float32), how

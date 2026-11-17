"""Recolour the red shirts on one of Hapoel's shared plates into another club's colour.

    python -m studio.fairytales.recolor_plate <work>/gn-stars.jpg <work>/pgn-stars.jpg 146 [--sat 1.0 --val 0.8 --add 0]

Hue is in degrees (PAO green 146, AEK gold 45). Only saturated red (shirts, socks) in the top half of the plate is
touched: skin is under saturation .35 and stays, and the town's lit windows below the horizon stay warm. Owner,
17.11.2026: the PAO and AEK Good Night films showed the stars as red players.
"""
from __future__ import annotations

import argparse

import cv2
import numpy as np


def red_mask(bgr: np.ndarray, ymax: float = 0.5) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    hd = np.minimum(h, 180 - h)                                     # distance from red, OpenCV hue units
    core = ((hd < 9) & (s > .38) & (v > .15)).astype(np.uint8)
    near = cv2.dilate(core, np.ones((9, 9), np.uint8)).astype(np.float32)
    w = np.clip((12 - hd) / 3, 0, 1) * np.clip((s - .38) / .1, 0, 1) * np.clip((v - .02) / .04, 0, 1) * near
    w[int(bgr.shape[0] * ymax):] = 0
    return hsv, s, v, w


def recolor(bgr: np.ndarray, hue_deg: float, sat_k: float = 1.0, val_k: float = 0.8, val_add: float = 0.0,
            ymax: float = 0.5) -> np.ndarray:
    hsv, s, v, w = red_mask(bgr, ymax)
    out = hsv.copy()
    out[..., 0] = hue_deg / 2
    out[..., 1] = np.clip(s * sat_k, 0, 1) * 255
    out[..., 2] = np.clip(v * val_k + val_add, 0, 1) * 255
    g = cv2.cvtColor(out.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)
    w3 = cv2.GaussianBlur(w, (0, 0), 0.7)[..., None]
    return (bgr * (1 - w3) + g * w3).astype(np.uint8)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('hue', type=float)
    ap.add_argument('--sat', type=float, default=1.0); ap.add_argument('--val', type=float, default=0.8)
    ap.add_argument('--add', type=float, default=0.0); ap.add_argument('--ymax', type=float, default=0.5)
    a = ap.parse_args()
    src = cv2.imread(a.src)
    out = recolor(src, a.hue, a.sat, a.val, a.add, a.ymax)
    cv2.imwrite(a.dst, out, [cv2.IMWRITE_JPEG_QUALITY, 96])
    changed = np.abs(out.astype(int) - src).sum(2) > 30
    print(f'{a.dst}: {int(changed.sum())} px recoloured')

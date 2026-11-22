"""THE ALBUM's painted look (owner, 22.11.2026): every sticker face, photographed or drawn, finished the same way —
smoothed flats of colour in a few bands, a strong warm grade, and ink lines where the picture turns (XDoG), with a
dark contour around the figure. A filter over the picture, never a new likeness: a photo stays that man's photo, a
drawn face stays the drawing of his measured traits."""
import numpy as np


def paint(im, bands=12, ink_k=60, mono=False):
    """`im` an RGBA PIL image (the cut figure); returns the painted RGBA, alpha untouched"""
    import cv2
    from PIL import Image
    rgba = np.asarray(im.convert('RGBA'))
    a = rgba[..., 3]
    bgr = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2BGR)
    h, w = a.shape
    up = 2 if max(h, w) < 1200 else 1
    big = cv2.resize(bgr, (w * up, h * up), interpolation=cv2.INTER_CUBIC) if up > 1 else bgr.copy()
    # flats: edge-keeping smoothing, then a few bands of colour in Lab (the brush), blended back for the modelling
    p = big.copy()
    for _ in range(3):
        p = cv2.bilateralFilter(p, 9, 38, 9)
    am = cv2.resize(a, (p.shape[1], p.shape[0])) > 40
    lab = cv2.cvtColor(p, cv2.COLOR_BGR2LAB)
    Z = lab[am].reshape(-1, 3).astype(np.float32)
    if len(Z) > bands * 4:
        _, lb, cen = cv2.kmeans(Z, bands, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1), 2, cv2.KMEANS_PP_CENTERS)
        q = lab.copy()
        q[am] = cen.astype(np.uint8)[lb.flatten()]
        q = cv2.cvtColor(q, cv2.COLOR_LAB2BGR)
        p = cv2.addWeighted(q, 0.62, p, 0.38, 0)
    # the grade: richer colour, firmer light (a poster, not a snapshot)
    hsv = cv2.cvtColor(p, cv2.COLOR_BGR2HSV).astype(np.float32)
    if not mono:
        hsv[..., 1] *= 1.22
    hsv[..., 2] = np.clip((hsv[..., 2] - 128) * 1.14 + 131, 0, 255)
    p = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    # ink: extended difference of Gaussians on the original light
    g = cv2.cvtColor(big, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    d = cv2.GaussianBlur(g, (0, 0), 1.0 * up) - 0.98 * cv2.GaussianBlur(g, (0, 0), 1.6 * up)
    e = np.where(d >= 0.01, 1.0, 1 + np.tanh(ink_k * (d - 0.01)))
    e = cv2.GaussianBlur(np.clip(e, 0, 1), (0, 0), 0.6 * up)
    ink = np.array([18, 22, 30], np.float32)  # warm black, BGR
    out = p.astype(np.float32) * e[..., None] + ink * (1 - e[..., None])
    out = cv2.resize(np.clip(out, 0, 255).astype(np.uint8), (w, h), interpolation=cv2.INTER_AREA) if up > 1 else np.clip(out, 0, 255).astype(np.uint8)
    res = np.dstack([cv2.cvtColor(out, cv2.COLOR_BGR2RGB), a])
    return Image.fromarray(res, 'RGBA')


def contour(im, weight, colour=(24, 20, 17)):
    """a dark even line around the figure (outside its edge), the way a painted sticker is cut"""
    from PIL import Image, ImageFilter
    a = im.split()[3]
    edge = Image.new('RGBA', im.size, colour + (0,))
    edge.putalpha(a.filter(ImageFilter.MaxFilter(weight)).filter(ImageFilter.GaussianBlur(0.6)))
    edge.alpha_composite(im)
    return edge

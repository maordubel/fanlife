"""THE ALBUM — the neck library (owner, 28.11.2026: "make several types of realistic necks; more thorough, cleaner,
more realistic"). A card shows a man's face but rarely his neck: his collar, a scarf or the frame cuts it. The sticker
needs a neck running from HIS jaw into OUR shirt's collar, so it is built here, the way a portrait painter models one:

  shape    a column under the jaw, slightly waisted, flaring into the shoulders and filling the collar's opening;
  light    a cylinder lit from the front (sides turn away), the jaw's CAST SHADOW following his own jawline (landmarks),
           the two neck muscles (sternocleidomastoid) running from behind the ears to the notch above the breastbone,
           the larynx where the type has one, the notch itself, and the collar's contact shadow;
  colour   his own skin (the cheek's median) in the lights, a warmer, redder version of it in the shadows (skin is
           translucent: its shadows are never grey), and a fine grain so it sits beside a printed face;
  types    slim · average · athletic · strong (an older, broad neck) — each with or without a larynx — and a stubble
           layer under the jaw for a bearded or unshaven face.

Everything is measured from the face, so the same type fits every head; the type is chosen from his face (width and
beard), never at random. Usage from cards.py: `neck(size, spec)`; `python3 scripts/album/necks.py --sheet out.png`
draws the library for review."""
import math
import numpy as np

# width of the neck at its narrowest, as a share of the jaw's width (jaw landmarks 4..12), and its features
TYPES = {
    'slim':     {'width': .54, 'muscles': .55, 'larynx': .9, 'flare': .9},
    'average':  {'width': .60, 'muscles': .75, 'larynx': .6, 'flare': 1.0},
    'athletic': {'width': .68, 'muscles': 1.0, 'larynx': .35, 'flare': 1.15},
    'strong':   {'width': .76, 'muscles': .7, 'larynx': .2, 'flare': 1.25},
}


def choose(face_w, jaw_w, beard):
    """the type from his face: a wide jaw for its face carries a strong neck, a narrow one a slim neck; footballers
    default to athletic"""
    r = jaw_w / max(face_w, 1)
    kind = 'slim' if r < .62 else 'average' if r < .70 else 'athletic' if r < .80 else 'strong'
    return {'kind': kind, 'stubble': beard}


def _smooth(x, e0, e1):
    t = np.clip((x - e0) / max(e1 - e0, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def _jaw_y(jaw, xs):
    """the jawline's y at each x (landmarks 2..14, the lower jaw), held flat beyond its ends"""
    pts = sorted(jaw[2:15], key=lambda p: p[0])
    px = np.array([p[0] for p in pts]); py = np.array([p[1] for p in pts])
    return np.interp(xs, px, py)


def neck(size, s):
    """RGBA float array (H, W, 4). `s`: cx, jaw (17 landmark points), chin (y), jaw_w, top (y where it starts, hidden
    behind the face), foot (y of the collar's front edge), opening (x0, x1, y of the collar opening's top) or None,
    fh (face height), skin (RGB), kind, stubble (0..1), seed"""
    W, H = size
    t_ = TYPES[s['kind']]
    cx, chin, fh = s['cx'], s['chin'], s['fh']
    top, foot = int(s['top']), int(min(H, s['foot'] + fh * .12))
    half0 = s['jaw_w'] * t_['width'] / 2
    ys = np.arange(H, dtype=np.float32)[:, None]
    xs = np.arange(W, dtype=np.float32)[None, :]
    # --- shape: the half-width at each row
    span = max(1.0, foot - top)
    t = np.clip((ys - top) / span, 0, 1)
    half = half0 * (1 - .05 * np.sin(np.pi * np.clip((ys - chin) / max(1, foot - chin), 0, 1)))   # a slight waist
    if s.get('opening'):
        ox0, ox1, oy = s['opening']
        ho = (ox1 - ox0) / 2 * 1.04 + 2
        k = _smooth(ys, chin + (oy - chin) * .62, oy + fh * .03)
        half = half + (max(ho, half0) - half) * k * t_['flare'] ** .2
    else:
        half = half * (1 + .3 * _smooth(ys, chin + (foot - chin) * .5, foot) * t_['flare'])
    dx = xs - cx
    u = dx / np.maximum(half, 1)
    edge = max(1.5, fh * .012)
    alpha = np.clip((half - np.abs(dx)) / edge + .5, 0, 1) * (ys >= top) * (ys <= foot)
    # --- light (1 = his lit skin)
    L = .97 - .38 * np.abs(u) ** 2.4                                       # the cylinder turning away at the sides
    jy = _jaw_y(s['jaw'], np.arange(W, dtype=np.float32))[None, :]
    depth = fh * (.20 - .10 * np.clip(np.abs(u), 0, 1))                       # the jaw's shadow is long under the chin
    below = np.clip(ys - jy, 0, None)
    L = L * (1 - .50 * np.exp(-below / np.maximum(depth * .55, 1)) * (ys > jy - 2))
    # the two neck muscles: from behind the ears (outside, high) to the notch (centre, low): a lit ridge with a shadow inside
    nl = np.clip((ys - chin) / max(1, foot - chin), 0, 1)
    for side in (-1, 1):
        mx = cx + side * half * (.78 - .62 * nl)
        d = (xs - mx) * side                                                   # >0 outside the ridge
        ridge = np.exp(-(d / (half * .16 + 1)) ** 2)
        groove = np.exp(-((d + half * .2) / (half * .12 + 1)) ** 2)
        w = t_['muscles'] * _smooth(ys, chin + fh * .05, chin + fh * .2) * (1 - _smooth(ys, foot - fh * .08, foot))
        L = L + w * (.08 * ridge - .11 * groove)
    # the larynx: a small rounded rise a third of the way down, lit above, shaded below
    if t_['larynx'] > 0:
        ly = chin + (foot - chin) * .36
        rx, ry = half0 * .2, fh * .055
        e = ((xs - cx) / rx) ** 2 + ((ys - ly) / ry) ** 2
        bump = np.exp(-e)
        L = L + t_['larynx'] * (.08 * bump * (ys < ly) - .10 * bump * (ys >= ly))
    # the notch above the breastbone, and the collar's contact shadow
    ny = foot - fh * .1
    L = L - .10 * np.exp(-(((xs - cx) / (half0 * .22)) ** 2 + ((ys - ny) / (fh * .05)) ** 2))
    L = L * (1 - .30 * np.exp(-np.abs(foot - fh * .1 - ys) / (fh * .045)))
    L = np.clip(L, .28, 1.04)
    # --- colour: his skin in the light, a warmer redder shade of it in the dark
    skin = np.array(s['skin'], np.float32)
    lit = np.clip(skin * 1.02, 0, 255)
    dark = skin * np.array([.62, .46, .42], np.float32)
    k = np.clip((L - .28) / .76, 0, 1)[..., None]
    rgb = dark * (1 - k) + lit * k
    rgb = rgb * (L[..., None] / np.maximum(.28 + .76 * k, 1e-3)) ** .35        # keep the value range of L
    # stubble: a cool, grainy darkening under the jaw, thinning down the neck
    rng = np.random.default_rng(s.get('seed', 7))
    if s.get('stubble', 0) > 0:
        zone = np.exp(-np.clip(ys - jy, 0, None) / (fh * .11)) * (ys > jy - fh * .02)
        grain = rng.random((H, W)).astype(np.float32)
        hair = s['stubble'] * zone * (.55 + .45 * (grain > .45))
        rgb = rgb * (1 - .42 * hair[..., None]) + np.array([38, 36, 40], np.float32) * (.42 * hair[..., None])
    # the grain of a printed face
    rgb = rgb + rng.normal(0, 3.2, (H, W, 1)).astype(np.float32)
    out = np.zeros((H, W, 4), np.float32)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = alpha * 255
    return out


def sheet(path):
    """the library, every type on one skin, with and without stubble, on a plain shirt line — for review"""
    from PIL import Image, ImageDraw
    tiles = []
    skins = [(232, 186, 150), (198, 140, 100), (140, 92, 62)]
    for kind in TYPES:
        for skin, stub in zip(skins, (0, .8, 0)):
            W, H = 260, 300
            fh, cx = 150, 130
            jaw = [(cx - 70 + 140 * i / 16, 40 + 90 * math.sin(math.pi * i / 16) ** .8) for i in range(17)]
            chin = max(p[1] for p in jaw)
            a = neck((W, H), {'cx': cx, 'jaw': jaw, 'chin': chin, 'jaw_w': 120, 'top': 60, 'foot': 250, 'opening': (cx - 52, cx + 52, 215),
                               'fh': fh, 'skin': skin, 'kind': kind, 'stubble': stub, 'seed': 3})
            im = Image.fromarray(a.astype('uint8'), 'RGBA')
            bg = Image.new('RGBA', (W, H), (210, 40, 50, 255))
            bg.alpha_composite(im)
            d = ImageDraw.Draw(bg)
            d.polygon(jaw + [(cx + 70, 0), (cx - 70, 0)], fill=tuple(skin) + (255,))
            d.text((8, H - 16), f'{kind}{" + stubble" if stub else ""}', fill=(255, 255, 255))
            tiles.append(bg)
    cols = 3
    S = Image.new('RGB', (cols * 260, ((len(tiles) + cols - 1) // cols) * 300), 'white')
    for i, t in enumerate(tiles):
        S.paste(t.convert('RGB'), ((i % cols) * 260, (i // cols) * 300))
    S.save(path)


if __name__ == '__main__':
    import sys
    sheet(sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else 'necks.png')

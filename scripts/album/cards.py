#!/usr/bin/env python3
"""THE ALBUM — stickers from the owner's card pack (owner, 28.11.2026: "cut the faces from the graphics I supplied and
set them nicely under our SVG kits, every player by his own picture, for every player in the database").

Input: the card pack the owner keeps on Drive (index.csv + cards/*.jpg, see START-HERE.txt there). For every player-club
record of the pack that the People Registry knows (people-stints.json):
  1. his cards, the ones printed for THIS club first, then the clearest frontal face;
  2. the card enlarged, the man cut from it (rembg), and only his HEAD and the top of his neck kept — the card's shirt,
     hands, logos, numbers and lettering never reach the sticker;
  3. his club's measured shirt of his years (the same SVG kit the album already uses — rule club-shirt-only), its inside
     collar removed so his own neck runs into it, fitted to his face's width and set with the collar under his chin;
     a soft collar shadow sits on the neck;
  4. the album's painted finish (paint.py) and contour, then THE ALBUM frame of stickers.py — same eye line, same head
     size, same plate, on every sticker.
Edition players (album-edition-1.json) are written over their slot (public/album/stickers/<club>/<slot>.webp, ledger
album-stickers.json); every other player of the pack goes to the roster set public/album/roster/<club>/<person>.webp,
listed in content/generated/album-roster.json (code numbers after the edition's 36).

Usage: python3 scripts/album/cards.py --pack <dir with index.csv and cards/> [--club id] [--people pl_x,pl_y] [--limit N]
                                      [--sheet out.jpg] [--dry]
"""
import argparse, base64, csv, io, json, re, sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stickers as S  # noqa: E402
import paint as PNT  # noqa: E402

ROOT = S.ROOT
ROSTER_DIR = ROOT / 'public/album/roster'
ROSTER = ROOT / 'content/generated/album-roster.json'
KITS = ROOT / 'content/generated/album-roster-kits.json'   # club:eid -> kit svg (scripts/album/card-kits.ts)
TEMPLATE = json.loads((ROOT / 'scripts/kits/studio-template.json').read_text())
SHIRT_VB = (0, 20, 336, 298)
COLLAR_Y = 39 * 340 / 721 + 19.5
UP = 1000          # the card is enlarged to this height before anything is cut
SHIRT_SPAN = 3.2  # the shirt across the shoulders, in face widths


def club_words(club, name):
    w = {x.lower() for x in re.split(r'[\s\-.]+', name) if len(x) > 3}
    w |= {x for x in club.split('-') if len(x) > 3}
    w -= {'athens', 'club', 'football'}
    return w


def cards_of(rows, club, cname):
    """his cards, this club's first (its name in the card's section), then the others"""
    words = club_words(club, cname)
    def rank(r):
        t = r['card_title'].lower()
        sect = t.split('/')[0]
        return (0 if any(w in sect for w in words) else 1, 0 if 'panini' in t else 1)
    seen, out = set(), []
    for r in sorted(rows, key=rank):
        if r['image_file'] not in seen:
            seen.add(r['image_file']); out.append(r)
    return out


def enlarge(im):
    """the card enlarged, its print grain and JPEG noise taken out first (a small card's noise became stipple)"""
    import cv2
    import numpy as np
    from PIL import Image, ImageFilter
    small = cv2.fastNlMeansDenoisingColored(cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR), None, 5, 5, 7, 21)
    im = Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGR2RGB))
    s = UP / im.height
    big = im.resize((round(im.width * s), UP), Image.LANCZOS)
    return big.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=3))


_LBF = None


def jaw_points(im, f):
    """the 68 facial landmarks (OpenCV LBF, the model stickers.py already uses: ALBUM_LBF), or None"""
    global _LBF
    import os
    import cv2
    import numpy as np
    path = os.environ.get('ALBUM_LBF')
    if not path:
        return None
    if _LBF is None:
        _LBF = cv2.face.createFacemarkLBF()
        _LBF.loadModel(path)
    g = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY)
    ok, lm = _LBF.fit(g, np.array([f]))
    return np.array(lm[0]).reshape(-1, 2) if ok else None


def head_cut(card, session):
    """the head and his real neck from the card. The cut follows HIS jawline (landmarks): inside the face and above
    the ears everything stays (hair included); under and beside the jaw only his skin stays, so the card's collar,
    shirt, scarf or turtleneck never comes along. {'im','f','neck_end','neck_l','neck_r','neck_row','chin'} or None"""
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter, ImageChops
    from rembg import remove
    im = enlarge(card.convert('RGB'))
    f = S.face_of(im)
    if not f:
        return None
    fx, fy, fw, fh = f
    a = remove(im, session=session[0], only_mask=True).convert('L')
    a = ImageChops.multiply(a, remove(im, session=session[1], only_mask=True).convert('L'))
    if sum(a.crop((fx, fy, fx + fw, fy + fh)).histogram()[128:]) < 0.5 * fw * fh:
        return None
    lm = jaw_points(im, f)
    cx = fx + fw / 2
    if lm is not None:
        jaw = [(float(x), float(y)) for x, y in lm[0:17]]
        chin = lm[8][1]
        ear = min(lm[0][1], lm[16][1])
        cx = float(lm[27][0] * .5 + lm[8][0] * .5)
    else:
        jaw = [(fx + fw * (.02 + .96 * i / 16), fy + fh * (.45 + .55 * np.sin(np.pi * i / 16))) for i in range(17)]
        chin, ear = fy + fh * 1.0, fy + fh * .45
    # the head as one round shape (hair and ears whole); under the ears only his face (inside the jawline) stays
    hw = (jaw[-1][0] - jaw[0][0]) / 2
    head = Image.new('L', im.size, 0)
    ImageDraw.Draw(head).ellipse((cx - fw * .78, fy - fh * .75, cx + fw * .78, fy + fh * 1.12), fill=255)
    lower = Image.new('L', im.size, 0)
    ImageDraw.Draw(lower).rectangle((0, ear + fh * .1, im.width, im.height), fill=255)
    inside = Image.new('L', im.size, 0)
    jc = [(cx + (x - cx) * 1.14, y + fh * .025) for x, y in jaw]   # a little outside the fitted jawline: never a bitten cheek
    ImageDraw.Draw(inside).polygon(jc + [(jc[-1][0] + fw * .1, ear - fh * .1), (jc[0][0] - fw * .1, ear - fh * .1)], fill=255)
    keep = ImageChops.subtract(head, ImageChops.subtract(lower, inside)).filter(ImageFilter.GaussianBlur(fw * .02))
    arr = np.array(ImageChops.multiply(a, keep), dtype=np.float32)
    # under and beside the jaw: his skin only, inside a neck's width
    rgb = np.array(im, dtype=np.float32)
    cheek = rgb[int(fy + fh * .55):int(fy + fh * .72), int(fx + fw * .28):int(fx + fw * .72)].reshape(-1, 3)
    ref = np.median(cheek, axis=0)
    dist = np.sqrt(((rgb - ref) ** 2).sum(-1))
    lum = rgb.mean(-1) / max(ref.mean(), 1)
    chroma = rgb / np.maximum(rgb.sum(-1, keepdims=True), 1) - ref / max(ref.sum(), 1)
    hue_d = np.sqrt((chroma ** 2).sum(-1)) * 255
    skin = ((dist < 55) | ((hue_d < 7) & (dist < 85) & (lum > .3) & (lum < 1.08))).astype(np.float32)
    nhalf = hw * .62                                  # a neck is about 60% of the jaw's width
    neck = Image.new('L', im.size, 0)
    ImageDraw.Draw(neck).polygon([(cx - nhalf * .85, jaw[5][1]), (cx + nhalf * .85, jaw[11][1]), (cx + nhalf * .9, chin + fh * .8), (cx - nhalf * .9, chin + fh * .8)], fill=255)
    nk = np.array(neck.filter(ImageFilter.GaussianBlur(fw * .04)), dtype=np.float32) / 255
    face_part = arr.copy()
    arr = np.maximum(arr, np.array(a, dtype=np.float32) * nk * skin)
    # where his real neck ends: the first row under the chin where skin no longer fills the neck's middle
    x0, x1 = int(cx - nhalf * .6), int(cx + nhalf * .6)
    end = int(chin)
    for y in range(int(chin), min(arr.shape[0], int(chin + fh * .8))):
        if (arr[y, x0:x1] > 128).mean() < .6:
            break
        end = y
    arr[end + 1:] = 0
    # his neck's own tones at its foot (or, with no neck on the card, his cheek in the jaw's shade)
    r0 = max(int(chin), end - 4)
    if end - chin > fh * .06:
        row = rgb[r0:end + 1, int(cx - nhalf):int(cx + nhalf) + 1].mean(0)
    else:
        u = np.linspace(-1, 1, int(2 * nhalf) + 1)[:, None]
        row = ref[None, :] * .8 * (1 - .2 * u ** 2)
    k = max(3, int(len(row) / 4) | 1)
    row = cv2.GaussianBlur(row[None].astype(np.float32), (k, 1), 0)[0]
    u = np.linspace(-1, 1, len(row))[:, None]
    row = .7 * row + .3 * np.median(row, axis=0) * (1 - .15 * u ** 2)
    fade = max(3, int(fh * .10))   # the real neck's foot fades over the drawn continuation lying under it
    for i, y in enumerate(range(max(int(chin), end - fade), end + 1)):
        arr[y] *= 1 - (i + 1) / (fade + 2)
    arr = np.maximum(arr, face_part)   # the face's own curve (chin, jaw) is never cut flat by the neck's end
    al = Image.fromarray(arr.clip(0, 255).astype('uint8')).filter(ImageFilter.MedianFilter(3))
    if al.getbbox() is None:
        return None
    out = im.convert('RGBA')
    out.putalpha(al)
    # a beard or stubble: the chin under the mouth clearly darker than his cheek
    by0, by1 = int(chin - fh * .14), int(chin - fh * .03)
    chin_px = rgb[max(0, by0):max(1, by1), int(cx - hw * .3):int(cx + hw * .3)].reshape(-1, 3)
    darkness = 1 - (np.median(chin_px.mean(-1)) / max(ref.mean(), 1)) if len(chin_px) else 0
    beard = float(np.clip((darkness - .12) / .25, 0, 1))
    return {'im': out, 'f': f, 'chin': float(chin), 'jaw_top': float(min(jaw[4][1], jaw[12][1])), 'neck_end': end,
            'neck_l': cx - nhalf, 'neck_r': cx + nhalf, 'neck_row': row, 'jaw': jaw, 'cx': cx, 'skin': ref,
            'jaw_w': float(jaw[13][0] - jaw[3][0]), 'face_w': float(jaw[16][0] - jaw[0][0]), 'beard': beard}


def shirt_layer(pg, kit, f, size, target=None, chin_y=None):
    """his club's shirt, fitted under his chin: (RGBA layer the size of the canvas, collar front y) or None"""
    import dress as D
    src = D.shirt_svg(kit)
    if not src:
        return None
    from PIL import Image
    fx, fy, fw, fh = f
    width = round(fw * SHIRT_SPAN / .94)
    sc = width / SHIRT_VB[2]
    shirt = D.render_shirt(pg, src, width)
    # the collar opening is cut right through the shirt: inside it his own neck shows, never the shirt's back or lining
    raw = (ROOT / 'public' / kit.lstrip('/')).read_text()
    nk = re.escape(TEMPLATE['neck'])
    import numpy as np
    from PIL import ImageFilter
    band_d = 'M262 10C300 2 420 2 456 12C456 60 420 102 360 104C300 102 262 60 262 10Z'
    def region(d):
        """where a template shape lands on the rendered shirt: drawn alone in the kit board's own placement
        (kit-render.js: the 721-wide template at translate(0 19.5) scale(340/721))"""
        vx, vy, vw, vh = SHIRT_VB
        hh = round(width * vh / vw)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vx} {vy} {vw} {vh}" width="{width}" height="{hh}">'
               f'<g transform="translate(0 19.5) scale({340/721:.6f})"><path d="{d}" fill="#000"/></g></svg>')
        pg.set_viewport_size({'width': width, 'height': hh})
        pg.set_content(f'<html><style>body{{margin:0;background:transparent}} svg{{display:block}}</style><body>{svg}</body></html>')
        m = Image.open(io.BytesIO(pg.locator('body > svg').screenshot(omit_background=True))).split()[3]
        return np.array(m.resize(shirt.size)) > 127
    hole = region(TEMPLATE['neck'])
    band = region(band_d)
    # his neck covers the opening and the back of the collar behind it — never the collar's front rib
    cover = hole.copy()
    for x in np.where(hole.any(0))[0]:
        yb = np.where(hole[:, x])[0].max()
        cover[:yb + 1, x] = True   # above the collar's front edge nothing of the shirt is in front of his neck
    neck_mask = Image.fromarray((cover * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.8))
    chin = chin_y if chin_y is not None else fy + fh * 1.06
    top = round(chin + fh * .10 - (COLLAR_Y - SHIRT_VB[1]) * sc)
    hb = np.where(hole.any(1))[0]
    if target is not None and len(hb):
        # the collar's front edge goes where his real neck ends on the card (within a natural neck length)
        t = min(max(target, chin + fh * .24), chin + fh * .5)
        top = round(t - hb.max())
    left = round(fx + fw / 2 - width / 2)
    W, H = size
    layer = Image.new('RGBA', (W, max(H, top + shirt.height)), (0, 0, 0, 0))
    layer.alpha_composite(shirt, (max(0, left), max(0, top)), (max(0, -left), max(0, -top)))
    nm = Image.new('L', layer.size, 0)
    nm.paste(neck_mask.crop((max(0, -left), max(0, -top), neck_mask.width, neck_mask.height)), (max(0, left), max(0, top)))
    foot = top + (hb.max() if len(hb) else 0)
    hx = np.where(hole.any(0))[0]
    opening = (left + hx.min(), left + hx.max(), top + hb.min()) if len(hx) else None
    return layer, top, nm, foot, opening


def collar_shadow(size, f, top):
    """a soft shadow the collar throws on the neck"""
    from PIL import Image, ImageDraw, ImageFilter
    fx, fy, fw, fh = f
    m = Image.new('L', size, 0)
    cx, cy = fx + fw / 2, top + fh * .42
    ImageDraw.Draw(m).ellipse((cx - fw * .42, cy - fh * .22, cx + fw * .42, cy + fh * .16), fill=120)
    m = m.filter(ImageFilter.GaussianBlur(fw * .08))
    sh = Image.new('RGBA', size, (20, 12, 8, 0))
    sh.putalpha(m)
    return sh


def dressed(card, kit, pg, session):
    """the card's head on his club's shirt, his neck running into the collar, painted and contoured like every album
    face: (RGBA, face box) or None"""
    import numpy as np
    from PIL import Image, ImageChops, ImageDraw, ImageFilter
    h = head_cut(card, session)
    if not h:
        return None
    head, f = h['im'], h['f']
    fx, fy, fw, fh = f
    sl = shirt_layer(pg, kit, f, head.size, target=max(h['neck_end'], h['chin'] + fh * .3), chin_y=h['chin'])
    if not sl:
        return None
    layer, top, cover, foot, opening = sl
    W, H = layer.size
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    import necks as NK
    spec = NK.choose(h['face_w'], h['jaw_w'], h['beard'])
    arr = NK.neck((W, H), {'cx': h['cx'], 'jaw': h['jaw'], 'chin': h['chin'], 'jaw_w': h['jaw_w'], 'top': h['jaw_top'], 'foot': foot,
                           'opening': opening, 'fh': fh, 'skin': h['skin'], 'kind': spec['kind'], 'stubble': spec['stubble'] * .9,
                           'seed': int(fx * 7 + fy)})
    # where his real neck shows on the card, the modelled one takes its exact tone at the join
    hy0, hy1 = int(h['neck_end'] - fh * .1), int(h['neck_end'])
    if hy1 - hy0 > 3 and h['neck_end'] - h['chin'] > fh * .06:
        ha = np.array(head)[hy0:hy1]
        m = (ha[..., 3] > 200) & (arr[hy0:hy1, :, 3] > 200)
        if m.sum() > 50:
            ratio = np.clip(ha[..., :3][m].mean(0) / np.maximum(arr[hy0:hy1, :, :3][m].mean(0), 1), .75, 1.3)
            arr[..., :3] = np.clip(arr[..., :3] * ratio, 0, 255)
    neck = Image.fromarray(arr.astype('uint8'), 'RGBA')
    h['spec'] = spec
    canvas.alpha_composite(neck)                       # 1 the neck column behind everything
    canvas.alpha_composite(layer)                      # 2 the shirt
    over = neck.copy()                                 # 3 inside the opening the neck is in front of the collar's back
    over.putalpha(ImageChops.multiply(neck.split()[3], cover))
    canvas.alpha_composite(over)
    # 4 the collar's contact shadow on the neck, just above the rib
    sh = Image.new('L', (W, H), 0)
    cx = (h['neck_l'] + h['neck_r']) / 2
    ImageDraw.Draw(sh).ellipse((cx - fw * .45, foot - fh * .12, cx + fw * .45, foot + fh * .05), fill=55)
    sh = ImageChops.multiply(sh.filter(ImageFilter.GaussianBlur(fw * .05)), cover)
    dark = Image.new('RGBA', (W, H), (25, 14, 8, 0)); dark.putalpha(sh)
    canvas.alpha_composite(dark)
    # 5 his real head and neck on top, never below the collar's front edge
    clip = Image.new('L', head.size, 255)
    ImageDraw.Draw(clip).rectangle((0, foot - fh * .02, head.width, head.height), fill=0)
    clip = clip.filter(ImageFilter.GaussianBlur(fh * .03))
    hd = head.copy(); hd.putalpha(ImageChops.multiply(head.split()[3], clip))
    canvas.alpha_composite(hd)
    # the join between his real neck and its continuation is repainted from both sides (OpenCV inpainting)
    import cv2
    rgba = np.array(canvas)
    seam = np.zeros(rgba.shape[:2], np.uint8)
    ys, ye = int(h['neck_end'] - fh * .05), int(h['neck_end'] + fh * .03)
    cv2.ellipse(seam, (int((h['neck_l'] + h['neck_r']) / 2), int((ys + ye) / 2)), (max(1, int((h['neck_r'] - h['neck_l']) * .42)), max(1, int((ye - ys) / 2))), 0, 0, 360, 255, -1)
    seam &= (rgba[..., 3] > 200).astype(np.uint8) * 255
    if seam.any():
        bgr = cv2.cvtColor(rgba[..., :3], cv2.COLOR_RGB2BGR)
        fixed = cv2.inpaint(bgr, seam, max(3, int(fh * .04)), cv2.INPAINT_TELEA)
        m = cv2.GaussianBlur(seam.astype(np.float32) / 255, (0, 0), max(2.5, fh * .025))[..., None]
        rgba[..., :3] = (cv2.cvtColor(fixed, cv2.COLOR_BGR2RGB) * m + rgba[..., :3] * (1 - m)).astype(np.uint8)
        canvas = Image.fromarray(rgba, 'RGBA')
    bb = canvas.split()[3].getbbox()
    canvas = canvas.crop((0, 0, canvas.width, bb[3]))
    painted = PNT.paint(canvas, bands=14, ink_k=40)
    line = max(3, round(f[2] / 45) * 2 + 1)
    return PNT.contour(painted, line), f


# ---------------------------------------------------------------------------------------------------------------------
# THE RETRO STICKER (owner, 28.11.2026: "take inspiration from the cards and make our own unique style — interesting,
# fun, nostalgic, retro, in our fun branding"). Our own frame, not a card publisher's: a die-cut ivory sticker, the club's
# colour in sunburst rays with a halftone corner, an 80s side tab with the club code and his years, a tilted name
# ribbon (first name in Shrikhand, surname in Anton), a position burst, the FAN LIFE roundel. Club colour, ivory and ink
# only — no rival colour can enter (the per-club colour bans hold).
# ---------------------------------------------------------------------------------------------------------------------
RW, RH = 240, 330
PANEL = (14, 14, 212, 252)          # x, y, w, h — the coloured field the player stands in
R_EYE, R_FACE = 0.36, 0.30          # eyes at 36% of the field, face a quarter of its height: every sticker alike
IVORY, INK = '#FBF6EA', '#15130F'
RETRO_FONTS = [('Shrikhand', 'shrikhand-latin-400-normal', 400, False), ('Shrikhand', 'shrikhand-latin-ext-400-normal', 400, True),
               ('Bowlby', 'bowlby-one-latin-400-normal', 400, False)]
POS = {'GK': 'GK', 'DF': 'DEF', 'MF': 'MID', 'FW': 'FWD'}


def retro_css():
    import base64 as b64
    f = ROOT / 'public/fonts'
    out = [S.font_css()]
    for fam, file, w, ext in RETRO_FONTS:
        if (f / f'{file}.woff2').exists():
            rng = 'U+0100-024F,U+1E00-1EFF' if ext else 'U+0000-00FF,U+2010-2027'
            out.append(f"@font-face{{font-family:'{fam}';font-weight:{w};src:url(data:font/woff2;base64,{b64.b64encode((f / f'{file}.woff2').read_bytes()).decode()}) format('woff2');unicode-range:{rng}}}")
    return '\n'.join(out)


def shade(hex_, k):
    r, g, b = (int(hex_[i:i + 2], 16) for i in (1, 3, 5))
    if k < 1:
        r, g, b = r * k, g * k, b * k
    else:
        r, g, b = r + (255 - r) * (k - 1), g + (255 - g) * (k - 1), b + (255 - b) * (k - 1)
    return '#%02X%02X%02X' % (round(r), round(g), round(b))


def sticker_halo(im, weight):
    """the classic sticker cut: an even ivory border outside his ink line"""
    return PNT.contour(im, weight, colour=(251, 246, 234))


def retro_svg(st, club, photo_b64, wh, logo_b64):
    c, on = club['primary'], club['on']
    dark, light = shade(c, .72), shade(c, 1.16)
    x, y, w, h = PANEL
    pw, ph, fx, fy, fw, fh = wh
    sc = (R_FACE * h) / fh
    cx, cy = x + w / 2, y + R_EYE * h
    dx, dy = cx - (fx + fw / 2) * sc, cy - (fy + fh * .42) * sc
    rays = ''.join(f'<path d="M{cx:.1f} {cy:.1f} L{cx + 420 * __import__("math").cos(a):.1f} {cy + 420 * __import__("math").sin(a):.1f} '
                   f'L{cx + 420 * __import__("math").cos(a + .2618):.1f} {cy + 420 * __import__("math").sin(a + .2618):.1f} Z" fill="{dark}" opacity=".55"/>'
                   for a in [i * .5236 for i in range(12)])
    parts = st['name'].split(' ')
    first, last = (' '.join(parts[:-1]), parts[-1]) if len(parts) > 1 else ('', parts[0])
    last = last.upper()
    fs, sq = S.fit(last, 168, 36, 0.5, 22)
    ffs, fsq = S.fit(first, 150, 15, 0.56, 9)
    years = S.esc(S.years_of(st))
    code = S.esc(club['code'])
    num = f"{st['slot']:02d}"
    pos = POS.get((st.get('pos') or [''])[0], '')
    burst = ''
    if pos:
        import math
        pts = ' '.join(f'{(22 if i % 2 == 0 else 16) * math.cos(i * math.pi / 10 - math.pi / 2):.1f},{(22 if i % 2 == 0 else 16) * math.sin(i * math.pi / 10 - math.pi / 2):.1f}' for i in range(20))
        burst = (f'<g transform="translate({x + w - 26} {y + 28}) rotate(10)"><polygon points="{pts}" fill="{INK}" transform="translate(2 2)"/>'
                 f'<polygon points="{pts}" fill="{IVORY}" stroke="{INK}" stroke-width="1.6"/>'
                 f'<text y="4.5" text-anchor="middle" font-family="Bowlby" font-size="11" fill="{INK}">{pos}</text></g>')
    meta = S.esc(club['name'].upper())
    mfs, msq = S.fit(meta, 150, 7.2, 0.72, 5.4)
    by = y + h - 58  # the ribbon
    return f'''<svg viewBox="0 0 {RW} {RH}" width="{RW}" xmlns="http://www.w3.org/2000/svg">
<defs>
<clipPath id="field"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7"/></clipPath>
<pattern id="half" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.6" fill="{dark}"/></pattern>
<linearGradient id="fade" x1="0" y1="1" x2=".8" y2=".2"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="halfmask"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#fade)"/></mask>
<radialGradient id="glow" cx=".5" cy="{R_EYE}" r=".55"><stop offset="0" stop-color="{light}" stop-opacity=".9"/><stop offset="1" stop-color="{c}" stop-opacity="0"/></radialGradient>
<filter id="paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="lift" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="3" dy="3" stdDeviation="0" flood-color="{INK}" flood-opacity=".35"/></filter>
</defs>
<rect width="{RW}" height="{RH}" rx="16" fill="{IVORY}"/>
<rect x="4.5" y="4.5" width="{RW-9}" height="{RH-9}" rx="12" fill="none" stroke="{INK}" stroke-opacity=".22" stroke-width=".8" stroke-dasharray="3 2.4"/>
<rect x="{x+3}" y="{y+3}" width="{w}" height="{h}" rx="7" fill="{INK}"/>
<g clip-path="url(#field)">
 <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>{rays}
 <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#glow)"/>
 <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="url(#half)" mask="url(#halfmask)" opacity=".8"/>
 <image href="data:image/png;base64,{photo_b64}" x="{dx:.1f}" y="{dy:.1f}" width="{pw*sc:.1f}" height="{ph*sc:.1f}" filter="url(#lift)"/>
</g>
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="none" stroke="{INK}" stroke-width="2"/>
<g transform="translate({x} {y})"><path d="M0 7 Q0 0 7 0 L30 0 L30 {h*.52:.0f} L0 {h*.52+18:.0f} Z" fill="{IVORY}" stroke="{INK}" stroke-width="1.6"/>
 <text transform="translate(21 {h*.52-6:.0f}) rotate(-90)" font-family="Anton" font-size="15" letter-spacing="1" fill="{INK}">{code}<tspan fill="{c}" dx="4">{years}</tspan></text></g>
{burst}
<g transform="translate({RW/2} {by+24}) rotate(-4)">
 <rect x="-104" y="-22" width="208" height="54" fill="{INK}" transform="translate(3 3)"/>
 <rect x="-104" y="-22" width="208" height="54" fill="{IVORY}" stroke="{INK}" stroke-width="2"/>
 <path d="M-104 -22 L-116 -6 L-104 10 Z M104 -22 L116 -6 L104 10 Z" fill="{dark}" stroke="{INK}" stroke-width="1.6"/>
 <text y="-6" text-anchor="middle" font-family="Shrikhand" font-size="{ffs:.1f}" fill="{c}" {fsq}>{S.esc(first)}</text>
 <text y="{2+fs*.78:.1f}" text-anchor="middle" font-family="Anton" font-size="{fs:.1f}" letter-spacing=".6" fill="{INK}" {sq}>{S.esc(last)}</text>
</g>
<g transform="translate(16 {RH-34})"><rect width="54" height="22" rx="3" fill="{INK}"/><circle cx="0" cy="11" r="4" fill="{IVORY}"/><circle cx="54" cy="11" r="4" fill="{IVORY}"/>
 <text x="27" y="16.5" text-anchor="middle" font-family="Anton" font-size="14" letter-spacing="1" fill="{IVORY}">{code}{S.DASH}{num}</text></g>
<text x="{RW/2+12}" y="{RH-25}" text-anchor="middle" font-family="Archivo" font-weight="800" font-size="{mfs:.1f}" letter-spacing="1.4" fill="{INK}" {msq}>{meta}</text>
<text x="{RW/2+12}" y="{RH-15}" text-anchor="middle" font-family="Archivo" font-weight="600" font-size="5.6" letter-spacing="2.2" fill="{INK}" opacity=".6">FANLIFE · THE ALBUM</text>
<circle cx="{RW-34}" cy="{RH-28}" r="19" fill="{IVORY}" stroke="{INK}" stroke-width="1.6"/>
<image href="data:image/png;base64,{logo_b64}" x="{RW-51}" y="{RH-45}" width="34" height="34"/>
<rect width="{RW}" height="{RH}" rx="16" fill="#000" filter="url(#paper)"/>
</svg>'''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pack', required=True)
    ap.add_argument('--club')
    ap.add_argument('--people')
    ap.add_argument('--limit', type=int, default=100000)
    ap.add_argument('--sheet')
    ap.add_argument('--out', help='write the stickers here instead of public/ (a preview run)')
    ap.add_argument('--fragment', help='write this run\'s ledger rows here instead of the ledgers (one club per job; merged after)')
    a = ap.parse_args()
    from PIL import Image
    from rembg import new_session
    from playwright.sync_api import sync_playwright

    pack = Path(a.pack)
    rows = [r for r in csv.DictReader(open(pack / 'index.csv', encoding='utf-8-sig')) if r['image_file'] and (pack / r['image_file']).is_file()]
    stints = {s['eid']: s for s in json.loads((ROOT / 'content/generated/people-stints.json').read_text())['stints']}
    edition = json.loads((ROOT / 'content/generated/album-edition-1.json').read_text())['wings']
    clubs = json.loads((ROOT / 'content/generated/album-clubs.json').read_text())
    kits = json.loads(KITS.read_text()) if KITS.exists() else {}
    in_ed = {(c, s['person_id']): s for c, ws in edition.items() for s in ws}
    ledger = json.loads(S.LEDGER.read_text())
    roster = json.loads(ROSTER.read_text()) if ROSTER.exists() else {'note': '', 'stickers': {}}
    roster['note'] = 'THE ALBUM roster set: every player of the owner’s card pack outside edition one, his card face on his club’s measured shirt. Written by scripts/album/cards.py.'
    want = set(a.people.split(',')) if a.people else None

    groups = defaultdict(list)
    for r in rows:
        if a.club and r['club'] != a.club:
            continue
        groups[(r['club'], r['player'])].append(r)
    jobs = []
    for (club, player), rs in groups.items():
        if club not in clubs:
            continue
        ids = [t.strip() for t in rs[0]['database_ids'].split('|')]
        st = next((stints[i] for i in ids if i in stints), None) or next((stints[f'{club}:{i}'] for i in ids if f'{club}:{i}' in stints), None)
        if not st or (want and st['id'] not in want):
            continue
        jobs.append((club, st, rs))
    # roster numbers after the edition's 36, oldest first, stable across runs
    taken = {v['code'] for v in roster['stickers'].values()}
    nxt = defaultdict(lambda: 37)
    for v in roster['stickers'].values():
        c, n = v['club'], int(v['code'].split(S.DASH)[1])
        nxt[c] = max(nxt[c], n + 1)
    jobs.sort(key=lambda j: (j[0], j[1].get('from') or 9999, j[1]['name']))

    logo = Image.open(ROOT / 'public/brand/fanlife/logo-512.png').convert('RGBA').resize((160, 160), Image.LANCZOS)
    b = io.BytesIO(); logo.save(b, 'PNG'); logo_b64 = base64.b64encode(b.getvalue()).decode()
    css = retro_css()
    session = (new_session('u2net'), new_session('silueta'))  # the general models hold a card's dark or busy backgrounds best (tested 28.11)
    made, failed, sheet = 0, [], []
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page()
        sp = br.new_page(viewport={'width': 240, 'height': 330}, device_scale_factor=2)
        for club, st, rs in jobs:
            if made >= a.limit:
                break
            ed = in_ed.get((club, st['id']))
            key = f"{club}:{st['id']}"
            prev = roster['stickers'].get(key)
            kit = (ed or {}).get('kit') or kits.get(st['eid'])
            if not kit:
                failed.append((key, st['name'], 'no club shirt')); continue
            pic, used = None, None
            for r in cards_of(rs, club, clubs[club]['name']):
                got = dressed(Image.open(pack / r['image_file']), kit, pg, session)
                if got:
                    pic, used = got, r; break
            if not pic:
                failed.append((key, st['name'], 'no clear face on any card')); continue
            cut, f = pic
            cut = sticker_halo(cut, max(7, round(f[2] / 18) * 2 + 1))
            bb = io.BytesIO(); cut.save(bb, 'PNG')
            if ed:
                row = dict(ed)
            else:
                code = prev['code'] if prev else f"{clubs[club]['code']}{S.DASH}{nxt[club]:02d}"
                if not prev:
                    nxt[club] += 1
                row = {'slot': int(code.split(S.DASH)[1]), 'name': st['name'], 'from': st.get('from'), 'to': st.get('to'), 'kit': kit}
            svg = retro_svg({**row, 'pos': st.get('pos')}, clubs[club], base64.b64encode(bb.getvalue()).decode(), (*cut.size, *f), logo_b64)
            sp.set_content(f'<html><style>{css} body{{margin:0;background:transparent}} svg{{display:block}}</style><body>{svg}</body></html>')
            sp.wait_for_timeout(150)
            png = Image.open(io.BytesIO(sp.locator('body > svg').screenshot(omit_background=True))).convert('RGBA')
            src = {'file': used['card_title'], 'via': 'card', 'image': used['image_file']}
            if a.out:
                dest = Path(a.out) / club / (f"{row['slot']:02d}-{st['id']}.webp")
            elif ed:
                dest = S.OUT_DIR / club / f"{ed['slot']}.webp"
            else:
                dest = ROSTER_DIR / club / f"{st['id']}.webp"
            dest.parent.mkdir(parents=True, exist_ok=True)
            png.save(dest, 'WEBP', quality=86, method=6)
            if not a.out:
                if ed:
                    sid = f"{club}:{ed['slot']}"
                    old = ledger['stickers'].get(sid, {})
                    ledger['stickers'][sid] = {**old, 'person_id': st['id'], 'name': ed['name'], 'code': f"{clubs[club]['code']}{S.DASH}{ed['slot']:02d}",
                                               'status': 'photo', 'portrait': 'card', 'frame': 'club', 'source': src, 'file': f"/album/stickers/{club}/{ed['slot']}.webp"}
                else:
                    roster['stickers'][key] = {'club': club, 'person_id': st['id'], 'eid': st['eid'], 'name': st['name'], 'from': st.get('from'), 'to': st.get('to'),
                                               'pos': st.get('pos'), 'code': f"{clubs[club]['code']}{S.DASH}{row['slot']:02d}", 'kit': kit, 'source': src,
                                               'file': f"/album/roster/{club}/{st['id']}.webp"}
            made += 1
            sheet.append(png)
            print(key, 'edition' if ed else 'roster', st['name'], '←', used['card_title'][:70], flush=True)
        br.close()
    if a.fragment:
        frag = {'edition': {k: v for k, v in ledger['stickers'].items() if (v.get('portrait') == 'card' and (not a.club or k.startswith(a.club + ':')))},
                'roster': roster['stickers'], 'failed': [{'id': k, 'name': n, 'reason': why} for k, n, why in failed]}
        Path(a.fragment).write_text(json.dumps(frag, ensure_ascii=False, indent=1) + '\n')
    elif not a.out:
        S.LEDGER.write_text(json.dumps(ledger, ensure_ascii=False, indent=1) + '\n')
        roster['stickers'] = dict(sorted(roster['stickers'].items()))
        roster['failed'] = [{'id': k, 'name': n, 'reason': why} for k, n, why in failed]
        ROSTER.write_text(json.dumps(roster, ensure_ascii=False, indent=1) + '\n')
    if a.sheet and sheet:
        cols = min(6, len(sheet))
        W = Image.new('RGB', (cols * 480, ((len(sheet) + cols - 1) // cols) * 660), (236, 228, 210))
        for i, p in enumerate(sheet):
            W.paste(p, ((i % cols) * 480, (i // cols) * 660), p)
        W.save(a.sheet, quality=90)
    for k, n, why in failed:
        print('FAILED', k, n, why)
    print(f'album:cards — {made} pressed, {len(failed)} failed')


if __name__ == '__main__':
    main()

"""THE ALBUM — the painted man wears his club's real shirt (owner, 24.11.2026: "the kit must look like he is really
wearing it, the neck coming out of the shirt, realistic").

The approved painted face (faces.py) is kept as it is. His club's measured shirt of his years (the kit drawing, its
crest, maker and sponsor) is fitted to his own shoulders, its inside collar cut away so his painted neck runs into it,
and shaded by the folds and light of the shirt he was painted in. Then the same open painter (RealVisXL + Lightning,
faces.py) repaints only the seam: the neck into the collar and the shoulder line, so the join is painted, not pasted.

Usage: python3 scripts/album/dress.py [--club <id>] [--ids club:slot,...] [--limit N] [--redo] [--no-paint] [--sheet out.jpg]
"""
import argparse, io, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stickers as S  # noqa: E402

ROOT = S.ROOT
OUT = ROOT / 'content/generated/album-dressed'
TEMPLATE = json.loads((ROOT / 'scripts/kits/studio-template.json').read_text())
SHIRT_VB = (0, 20, 336, 298)   # the shirt on the kit board (kit-render.js: template 721 wide at translate(0 19.5) scale(340/721))
COLLAR_Y = 39 * 340 / 721 + 19.5  # the top of the collar opening on the board (template neck path, its top edge)
SHOULDER = (118, 222)          # the board's shoulder seams' x at the collar's foot: the shirt is scaled so these meet his shoulders


def shirt_svg(kit_path):
    """the kit drawing with the inside of the collar taken out: his own neck shows there"""
    f = ROOT / 'public' / kit_path.lstrip('/')
    if not kit_path or not f.exists():
        return None
    src = f.read_text()
    neck = re.escape(TEMPLATE['neck'])
    src = re.sub(r'<path d="' + neck + r'"[^>]*/>', '', src)
    return src


def render_shirt(pg, src, width):
    from PIL import Image
    vx, vy, vw, vh = SHIRT_VB
    h = round(width * vh / vw)
    svg = re.sub(r'<svg ([^>]*?)viewBox="[^"]+"', lambda m: f'<svg {m.group(1)}viewBox="{vx} {vy} {vw} {vh}"', src, count=1)
    svg = re.sub(r'<svg ([^>]*?)>', lambda m: '<svg ' + re.sub(r'\s(width|height)="[^"]*"', '', m.group(1)) + f' width="{width}" height="{h}">', svg, count=1)
    pg.set_viewport_size({'width': width, 'height': h})
    pg.set_content(f'<html><style>body{{margin:0;background:transparent}} svg{{display:block}}</style><body>{svg}</body></html>')
    pg.wait_for_timeout(150)
    return Image.open(io.BytesIO(pg.locator('body > svg').screenshot(omit_background=True))).convert('RGBA')


def body_mask(im, session):
    from PIL import Image
    from rembg import remove
    return remove(im.convert('RGB'), session=session, only_mask=True).convert('L').resize(im.size, Image.LANCZOS)


def fit(face_im, body, f):
    """where the shirt goes: its collar under his chin, its shoulder seams on his shoulders (measured on his body)"""
    import numpy as np
    fx, fy, fw, fh = f
    chin = fy + fh * 1.08
    a = np.array(body) > 128
    rows = [y for y in range(int(chin + fh * .55), min(a.shape[0], int(chin + fh * 1.1)))]
    widths = []
    for y in rows:
        xs = np.where(a[y])[0]
        if len(xs):
            widths.append(xs.max() - xs.min())
    span = float(np.median(widths)) if widths else fw * 3.2
    span = max(fw * 2.6, min(span, fw * 4.2))
    scale = span / (SHIRT_VB[2] * .94)          # the board's shirt is 94% of its width across the sleeves
    width = round(SHIRT_VB[2] * scale)
    left = fx + fw / 2 - width / 2
    top = chin + fh * .14 - (COLLAR_Y - SHIRT_VB[1]) * scale
    return width, round(left), round(top), scale


def neck_mask(face_im, f, front_y):
    """his painted neck (skin like his cheeks) between his jaw and the collar's front: laid over the shirt's back collar"""
    import numpy as np
    from PIL import Image, ImageFilter
    fx, fy, fw, fh = f
    a = np.array(face_im.convert('RGB'), dtype=np.float32)
    cheek = a[int(fy + fh * .55):int(fy + fh * .7), int(fx + fw * .25):int(fx + fw * .75)].reshape(-1, 3)
    ref = np.median(cheek, axis=0)
    d = np.sqrt(((a - ref) ** 2).sum(-1))
    lum = a.mean(-1) / max(ref.mean(), 1)
    skin = (d < 70) | ((d < 110) & (lum < 1.0))  # the neck is the cheek's colour, often in shadow
    m = np.zeros(skin.shape, bool)
    y0, y1 = int(fy + fh * .55), int(min(skin.shape[0], front_y))
    x0, x1 = int(fx + fw * .12), int(fx + fw * .88)
    m[y0:y1, x0:x1] = skin[y0:y1, x0:x1]
    im = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.MaxFilter(3))
    return im.filter(ImageFilter.GaussianBlur(1.5))


def shading(face_im, shirt_a, box):
    """the light and folds of the shirt he was painted in, as a multiplier around 1"""
    import numpy as np
    from PIL import ImageFilter
    g = np.array(face_im.convert('L').filter(ImageFilter.GaussianBlur(2)), dtype=np.float32)
    x, y = box
    h, w = shirt_a.shape
    H, W = g.shape
    sub = np.zeros((h, w), np.float32)
    y0, y1, x0, x1 = max(0, y), min(H, y + h), max(0, x), min(W, x + w)
    sub[y0 - y:y1 - y, x0 - x:x1 - x] = g[y0:y1, x0:x1]
    on = (shirt_a > 0.5) & (sub > 0)
    m = float(np.median(sub[on])) if on.any() else 128.
    k = np.clip(sub / max(m, 1), 0.55, 1.3)
    k = 1 + (k - 1) * .85
    k[sub == 0] = 1
    return k


def below_jaw(W, H, f):
    """everything under his jaw line (an ellipse around the face is kept out of the repaint)"""
    from PIL import Image, ImageDraw
    fx, fy, fw, fh = f
    m = Image.new('L', (W, H), 255)
    ImageDraw.Draw(m).ellipse((fx + fw * .1, fy - fh * .2, fx + fw * .9, fy + fh * 1.04), fill=0)
    ImageDraw.Draw(m).rectangle((0, 0, W, fy + fh * .7), fill=0)
    return m


def dress(face_im, st, pg, session):
    """(dressed picture, the seam to repaint) or None"""
    import numpy as np
    from PIL import Image, ImageFilter, ImageChops
    src = shirt_svg(st.get('kit'))
    f = S.face_of(face_im)
    if not src or not f:
        return None
    body = body_mask(face_im, session)
    width, left, top, sc = fit(face_im, body, f)
    from PIL import Image
    shirt = render_shirt(pg, src, width)
    sa = np.array(shirt.split()[3], dtype=np.float32) / 255
    k = shading(face_im, sa, (left, top))
    rgb = np.array(shirt.convert('RGB'), dtype=np.float32) * k[..., None]
    shirt_lit = Image.fromarray(np.clip(rgb, 0, 255).astype('uint8')).convert('RGBA')
    shirt_lit.putalpha(shirt.split()[3])
    W, H = face_im.size
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    layer.alpha_composite(shirt_lit, (max(0, left), max(0, top)), (max(0, -left), max(0, -top)))
    out = face_im.convert('RGBA')
    out.alpha_composite(layer)
    front = top + ((91 - 39) * 340 / 721 + COLLAR_Y - SHIRT_VB[1]) * sc  # the collar's front edge (template neck path foot)
    # the seam: around the collar opening and the shirt's outline, plus his old painted shirt where the kit does not reach
    la = layer.split()[3]
    edge = ImageChops.subtract(la.filter(ImageFilter.MaxFilter(15)), la.filter(ImageFilter.MinFilter(15)))
    fx, fy, fw, fh = f
    chin = fy + fh
    collar = Image.new('L', (W, H), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(collar).ellipse((fx + fw * .02, chin - fh * .1, fx + fw * .98, chin + fh * .62), fill=255)
    collar = ImageChops.multiply(collar, below_jaw(W, H, f))
    below = Image.new('L', (W, H), 0)
    ImageDraw.Draw(below).rectangle((0, chin + fh * .2, W, H), fill=255)
    collar = ImageChops.lighter(collar, ImageChops.multiply(collar.filter(ImageFilter.MaxFilter(9)), below))
    left_over = ImageChops.multiply(ImageChops.multiply(body, below), ImageChops.invert(la.point(lambda v: 255 if v > 40 else 0)))
    seam = ImageChops.lighter(ImageChops.lighter(ImageChops.multiply(edge, below), collar), left_over)
    seam = seam.point(lambda v: 255 if v > 30 else 0).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(4))
    return out.convert('RGB'), seam, layer


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--club')
    ap.add_argument('--ids')
    ap.add_argument('--limit', type=int, default=999)
    ap.add_argument('--redo', action='store_true')
    ap.add_argument('--no-paint', action='store_true')
    ap.add_argument('--strength', type=float, default=0.8)
    ap.add_argument('--steps', type=int, default=8)
    ap.add_argument('--sheet')
    a = ap.parse_args()
    from PIL import Image
    from playwright.sync_api import sync_playwright
    from rembg import new_session
    edition = json.loads((ROOT / 'content/generated/album-edition-1.json').read_text())
    clubs = json.loads((ROOT / 'content/generated/album-clubs.json').read_text())
    ledger = json.loads(S.LEDGER.read_text())['stickers']
    session = new_session('u2net_human_seg')
    inpaint = None
    if not a.no_paint:
        import torch
        import faces as FC
        from diffusers import StableDiffusionXLInpaintPipeline, EulerDiscreteScheduler
        from huggingface_hub import hf_hub_download
        inpaint = StableDiffusionXLInpaintPipeline.from_pretrained(FC.MODEL, torch_dtype=torch.float32, use_safetensors=True)
        inpaint.scheduler = EulerDiscreteScheduler.from_config(inpaint.scheduler.config, timestep_spacing='trailing')
        inpaint.load_lora_weights(hf_hub_download(*FC.LIGHTNING))
        inpaint.fuse_lora()
        inpaint.set_progress_bar_config(disable=True)
        inpaint.enable_attention_slicing()
        inpaint.vae.enable_slicing()
    want = set(a.ids.split(',')) if a.ids else None
    made, sheet = 0, []
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page()
        for club, rows in edition['wings'].items():
            if a.club and club != a.club:
                continue
            for st in rows:
                sid = f'{club}:{st["slot"]}'
                if (want and sid not in want) or made >= a.limit:
                    continue
                src = S.FACES_DIR / club / f'{st["slot"]}.webp'
                out = OUT / club / f'{st["slot"]}.webp'
                if not src.exists() or (ledger.get(sid) or {}).get('status') == 'photo' or (out.exists() and not a.redo):
                    continue
                face_im = Image.open(src).convert('RGB')
                r = dress(face_im, st, pg, session)
                if not r:
                    print(sid, 'no shirt or no face', flush=True)
                    continue
                pic, seam, _ = r
                if inpaint is not None:
                    import torch
                    import faces as FC
                    t = (ledger.get(sid) or {}).get('traits') or S.SRC.era_default(st.get('from'))
                    colour = FC.colour_name(clubs[club]['primary'])
                    prompt = (f'portrait of a footballer wearing a {colour} football shirt, his neck rising naturally out of the shirt collar, '
                              f'realistic fabric folds and stitching, shoulders, {FC.STYLE}')
                    g = torch.Generator().manual_seed(FC.seed_of(st['person_id']) + 7)
                    done = inpaint(prompt=prompt, image=pic, mask_image=seam, width=pic.width, height=pic.height, strength=a.strength,
                                   num_inference_steps=a.steps, guidance_scale=0, generator=g).images[0].resize(pic.size, Image.LANCZOS)
                    pic = Image.composite(done, pic, seam)  # outside the seam, nothing changes: his face and the shirt's marks stay exact
                    import gc; gc.collect()
                out.parent.mkdir(parents=True, exist_ok=True)
                pic.save(out, 'WEBP', quality=90, method=6)
                made += 1
                sheet.append(pic)
                print(sid, 'dressed', st['name'], flush=True)
        br.close()
    if a.sheet and sheet:
        side = 384
        cols = min(6, len(sheet))
        W = Image.new('RGB', (cols * side, ((len(sheet) + cols - 1) // cols) * side), (40, 40, 40))
        for i, p in enumerate(sheet):
            W.paste(p.resize((side, side)), ((i % cols) * side, (i // cols) * side))
        W.save(a.sheet, quality=90)
    print(f'album:dress — {made} dressed now')


if __name__ == '__main__':
    main()

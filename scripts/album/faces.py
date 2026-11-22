"""THE ALBUM — painted portraits for men with no free photograph (owner, 22.11.2026).

The structure is ours: the drawn figure (his measured traits — skin, hair colour and length, curls, beard, moustache —
or his era's usual look, and his club's measured shirt of his years) is rendered and handed to an open image model
(Stable Diffusion XL, CreativeML OpenRAIL++-M, commercial use allowed; LCM-LoRA for few steps; CPU, free in GitHub
Actions) as the starting picture. The model paints it in the album's style; the club's real shirt is laid back over
it, and the same paint filter as the photographs finishes it. Seeded by his person id: the same man, the same face,
every run. The face is NOT his likeness — the back of the sticker says so.

Usage: python3 scripts/album/faces.py [--club <id>] [--ids club:slot,...] [--limit N] [--redo] [--sheet out.png]
"""
import argparse, base64, hashlib, io, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stickers as S  # noqa: E402
import paint as PNT  # noqa: E402

ROOT = S.ROOT
OUT = S.FACES_DIR
MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'  # CreativeML OpenRAIL++-M: commercial use allowed
LCM = 'latent-consistency/lcm-lora-sdxl'
SIDE = 768
SKIN_WORDS = ['very fair', 'fair', 'light olive', 'olive', 'tanned', 'brown', 'dark brown']
HAIR_WORDS = {'black': 'black', 'dark': 'dark brown', 'brown': 'brown', 'light': 'light brown', 'blond': 'blond', 'red': 'ginger', 'grey': 'grey', 'white': 'white'}
STYLE = ('painted illustration, realistic face, ink outlines, painterly shading, vivid warm colours, vintage football card art, '
         'head and shoulders, front view, plain white background')
NEG = ('cartoon, chibi, anime, flat vector, simple face, photo, blurry, deformed face, asymmetric eyes, extra eyes, text, letters, '
       'watermark, logo, border, frame, oval frame, vignette, close-up, cropped head, hat, cap, headband, glasses, woman, child')
HEAD = 0.66  # the painted crop: this share of the window's width around the face — the face a third of the model's canvas


COLOURS = {'red': (200, 30, 40), 'dark red': (140, 20, 30), 'green': (20, 130, 60), 'white': (240, 240, 240), 'black': (20, 20, 20),
           'blue': (30, 70, 170), 'navy blue': (20, 30, 80), 'sky blue': (110, 170, 220), 'yellow': (240, 200, 30),
           'gold': (200, 160, 60), 'brown': (110, 60, 30), 'orange': (240, 120, 30), 'maroon': (110, 20, 40), 'grey': (130, 130, 130)}


def colour_name(hex_):
    r, g, b = int(hex_[1:3], 16), int(hex_[3:5], 16), int(hex_[5:7], 16)
    return min(COLOURS, key=lambda k: sum((u - v) ** 2 for u, v in zip(COLOURS[k], (r, g, b))))


def prompt_of(st, t, shirt='#C81E28'):
    skin = SKIN_WORDS[S.SRC.SKIN.index(t['skin'])] if t.get('skin') in S.SRC.SKIN else 'olive'
    hair = HAIR_WORDS.get(t.get('hairName'), 'dark brown')
    ln = t.get('length', 'short')
    hair_txt = 'bald head' if ln == 'bald' else f"{'curly ' if t.get('curly') else ''}{ln} {hair} hair"
    face = ', full beard' if t.get('beard') else (', moustache' if t.get('moustache') else ', clean shaven')
    yr = st.get('from') or st.get('to')
    era = f', {yr // 10 * 10}s hairstyle' if yr else ''
    look = f'{hair_txt}{face}, {skin} skin'
    return f'portrait of a footballer, {look}, man in his twenties{era}, plain {colour_name(shirt)} football shirt, {STYLE}'


def render(pg, st, t, head_on=True, crop=False):
    """the drawn figure (or its shirt only) as a square RGBA picture: the window and its margin, or the head crop"""
    from PIL import Image
    x, y, w, h = S.WIN
    pad = S.FIG_PAD
    g = S.drawn_figure(st, x, y, w, h, t, head_on=head_on).replace('style="filter:drop-shadow(5px 4px 0 rgb(0 0 0 / .28))"', '')
    vx, vy, side = box(crop)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIDE}" height="{SIDE}" viewBox="{vx} {vy} {side} {side}">{g}</svg>'
    pg.set_viewport_size({'width': SIDE, 'height': SIDE})
    pg.set_content(f'<html><style>body{{margin:0;background:transparent}} svg{{display:block}}</style><body>{svg}</body></html>')
    pg.wait_for_timeout(120)
    return Image.open(io.BytesIO(pg.locator('body > svg').screenshot(omit_background=True))).convert('RGBA')


def box(crop):
    """(x, y, side) of the square in sticker units: the whole window with its margin, or the head crop"""
    x, y, w, h = S.WIN
    if crop:
        side = w * HEAD
        return x + w / 2 - side / 2, y + h * S.EYE_Y - side * .46, side
    side = max(w, h) + 2 * S.FIG_PAD
    return x + w / 2 - side / 2, y + h / 2 - side / 2, side


def seed_of(person_id):
    return int(hashlib.sha256(person_id.encode()).hexdigest()[:8], 16)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--club')
    ap.add_argument('--ids')
    ap.add_argument('--limit', type=int, default=999)
    ap.add_argument('--redo', action='store_true')
    ap.add_argument('--strength', type=float, default=0.78)
    ap.add_argument('--steps', type=int, default=6)
    ap.add_argument('--sheet')
    a = ap.parse_args()
    import torch
    from diffusers import StableDiffusionXLPipeline, LCMScheduler
    from PIL import Image, ImageFilter
    from playwright.sync_api import sync_playwright

    edition = json.loads((ROOT / 'content/generated/album-edition-1.json').read_text())
    clubs = json.loads((ROOT / 'content/generated/album-clubs.json').read_text())
    ledger = json.loads(S.LEDGER.read_text())['stickers']
    pipe = StableDiffusionXLPipeline.from_pretrained(MODEL, torch_dtype=torch.float32, variant='fp16', use_safetensors=True)
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
    pipe.load_lora_weights(LCM)
    pipe.fuse_lora()
    pipe.set_progress_bar_config(disable=True)
    torch.set_num_threads(max(1, torch.get_num_threads()))
    want = set(a.ids.split(',')) if a.ids else None
    made, sheet = 0, []
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page(viewport={'width': SIDE, 'height': SIDE})
        for club, rows in edition['wings'].items():
            if a.club and club != a.club:
                continue
            for st in rows:
                sid = f'{club}:{st["slot"]}'
                if want and sid not in want:
                    continue
                if made >= a.limit:
                    break
                led = ledger.get(sid) or {}
                if led.get('status') == 'photo':
                    continue  # he has his own photograph: never a painted stranger
                out = OUT / club / f'{st["slot"]}.webp'
                if out.exists() and not a.redo:
                    continue
                t = led.get('traits') or S.SRC.era_default(st.get('from'))
                fig = None
                for k in range(4):  # a painting the press cannot use (no clear face, a close-up, a crowd) is painted again
                    g = torch.Generator().manual_seed(seed_of(st['person_id']) + k)
                    cand = pipe(prompt=prompt_of(st, t, clubs[club]['primary']), negative_prompt=NEG, width=SIDE, height=SIDE,
                                num_inference_steps=a.steps, guidance_scale=2.0, generator=g).images[0]
                    f = S.face_of(cand)
                    if f and 0.12 * SIDE <= f[2] <= 0.5 * SIDE and f[1] + f[3] < 0.86 * SIDE:  # a clear face, head and shoulders
                        fig = cand
                        break
                    print(sid, 'repaint', k + 1, flush=True)
                if fig is None:
                    continue
                out.parent.mkdir(parents=True, exist_ok=True)
                fig.save(out, 'WEBP', quality=88, method=6)
                made += 1
                sheet.append(fig.convert('RGBA'))
                print(sid, 'painted', st['name'], flush=True)
        br.close()
    if a.sheet and sheet:
        cols = min(6, len(sheet))
        rows_ = (len(sheet) + cols - 1) // cols
        W = Image.new('RGBA', (cols * SIDE, rows_ * SIDE), (40, 40, 40, 255))
        for i, f in enumerate(sheet):
            W.alpha_composite(f, ((i % cols) * SIDE, (i // cols) * SIDE))
        W.convert('RGB').save(a.sheet, quality=90)
    print(f'album:faces — {made} painted now')


if __name__ == '__main__':
    main()

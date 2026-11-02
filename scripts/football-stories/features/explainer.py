"""FAN LIFE feature film of the week (owner, 2.11.2026) — 16:9, about a minute: what the feature is, how it plays, why
it is different, filmed on the live site on a phone screen, narrated by the series voice, closed with the subscribe call
and YouTube's end screen.

    python3 scripts/football-stories/features/explainer.py <week.json> <out dir>

The pictures are captured from https://fanlife.dubelteam.com when it renders (Playwright, a phone viewport). A club
whose page for the feature is not open yet is passed over for the next club in the week's order; with no open club
the film is not made, and the report says why.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'matchday'))
sys.path.insert(0, str(HERE.parent))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

import film as F  # noqa: E402  (16:9)
import subscribe as SUB  # noqa: E402
from render import read_audio, resample, run, write_wav  # noqa: E402
from studio.audio import CROWD, fx, score  # noqa: E402
from studio.captions import Captions  # noqa: E402
from studio.common import FPS, H, INK, PAPER, ROOT, W, Palette, hex_rgb  # noqa: E402
from studio.edit import cam_push, fit, pop, slam, slide_in  # noqa: E402
from studio.motion import Layer, Pose, Shot, ShotRenderer, blend_entry  # noqa: E402
from studio.paper import CANVAS, crumpled, halftone_overlay  # noqa: E402
from studio.sprites import SpriteFactory, key_of  # noqa: E402

SITE = 'https://fanlife.dubelteam.com'
SR = F.SR
CW, CH = CANVAS
CLOSED = re.compile(r'in preparation|not open yet|coming soon|page not found|404', re.I)


def capture(feature: dict, clubs: list[dict], work: Path) -> tuple[dict | None, dict]:
    """The feature on a phone, at each shot. Returns (club, {shot name: png}) or (None, {}) when no club has it open."""
    from playwright.sync_api import sync_playwright
    tried = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True,
                            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 FanLife-Studio')
        for c in clubs:
            url = SITE + feature['path'].replace('{club}', c['id'])
            page = ctx.new_page()
            try:
                r = page.goto(url, wait_until='networkidle', timeout=45000)
                page.wait_for_timeout(2500)
                text = page.inner_text('body')[:4000]
                if (r and r.status >= 400) or CLOSED.search(text):
                    tried.append({'club': c['id'], 'url': url, 'why': f'closed ({r.status if r else "no answer"})'})
                    page.close()
                    continue
                for label in ('Accept', 'Got it', 'OK', 'Continue', 'Skip'):
                    try:
                        page.get_by_role('button', name=re.compile(f'^{label}$', re.I)).first.click(timeout=800)
                    except Exception:
                        pass
                shots = {}
                for sh in feature['shots']:
                    if sh.get('click'):
                        try:
                            page.get_by_role('button', name=re.compile(sh['click'], re.I)).first.click(timeout=3000)
                            page.wait_for_timeout(2500)
                        except Exception:
                            pass
                    if sh.get('scroll'):
                        page.mouse.wheel(0, sh['scroll'])
                        page.wait_for_timeout(1200)
                    p = work / f"cap-{sh['name']}.png"
                    page.screenshot(path=str(p))
                    shots[sh['name']] = p
                page.close()
                b.close()
                return {**c, 'url': url, 'tried': tried}, shots
            except Exception as e:
                tried.append({'club': c['id'], 'url': url, 'why': str(e)[:160]})
                page.close()
        b.close()
    return None, {'tried': tried}


def phone(screen: Path, h: int = 900) -> Image.Image:
    """A phone in the house inks: ink bezel, rounded screen, a hard second-plate shadow — no gloss, no brand."""
    sc = Image.open(screen).convert('RGB')
    sw = round(h * sc.width / sc.height)
    sc = sc.resize((sw, h), Image.LANCZOS)
    pad, rad, sh = 22, 54, 18
    w2, h2 = sw + pad * 2, h + pad * 2
    im = Image.new('RGBA', (w2 + sh, h2 + sh), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([sh, sh, w2 + sh - 1, h2 + sh - 1], rad, fill=hex_rgb(INK) + (255,))
    d.rounded_rectangle([0, 0, w2 - 1, h2 - 1], rad, fill=(28, 26, 22, 255), outline=hex_rgb(INK) + (255,), width=6)
    mask = Image.new('L', (sw, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, h - 1], rad - pad + 8, fill=255)
    im.paste(sc, (pad, pad), mask)
    return im


def tinted(seed: int, hexcol: str) -> Image.Image:
    base = np.asarray(crumpled(seed, CANVAS).convert('RGB'), 'float32') / 255
    col = np.array(hex_rgb(hexcol), 'float32') / 255
    r, g, b = hex_rgb(hexcol)
    dark = 0.75 if (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 else 0.45
    out = base * col * (1 - dark) + base * 0.16 * dark
    return halftone_overlay(Image.fromarray(np.clip(out * 255, 0, 255).astype('uint8')), cell=9, strength=0.10).convert('RGB')


def main():
    week = json.loads(Path(sys.argv[1]).read_text())
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    feat = week['film']
    work = out / 'work-film'
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    club, shots = capture(feat, feat['clubs'], work)
    if not club:
        (out / 'film-report.json').write_text(json.dumps({'made': False, 'feature': feat['feature'], 'why': 'no club has this feature open', **shots}, indent=2))
        print('film not made: no club has', feat['feature'], 'open', flush=True)
        return
    accent = club.get('primary') or '#D71920'
    pal = Palette('fl', 'FAN LIFE', accent, PAPER, [])
    epn = int(week['week'].split('-W')[1])
    beats = [{'kind': 'title', 'say': feat['hook']}]
    for i, b in enumerate(feat['beats']):
        beats.append({'kind': 'step', 'shot': b['shot'], 'say': b['say'], 'n': i + 1})
    beats.append({'kind': 'end', 'say': f"Play {feat['name']} on FAN LIFE, with your own club. " + SUB.pick('end_voice', epn)})
    if (SUB.ART / 'endscreen-ground.jpg').exists():
        beats.append({'kind': 'endscreen', 'dur': 20.0})
    t, plan = 0.0, []
    for i, b in enumerate(beats):
        p = {**b, 'i': i, 'start': t}
        if b.get('say'):
            wav = work / f'v-{i}.wav'
            d, words = F.voice_beat(b['say'], {}, wav)
            lead = 0.9 if i == 0 else 0.45
            p.update(wav=wav, words=words, voice_at=t + lead)
            dur = max(lead + d + 0.6, 3.0 if b['kind'] != 'end' else 7.0)
        else:
            dur = b['dur']
        p['frames'] = round(dur * FPS)
        p['dur'] = p['frames'] / FPS
        t += p['dur']
        plan.append(p)
    total = t
    files, cues_all, prev_last = [], [], None
    acc = hex_rgb(accent)
    stub_at = 2 if len(plan) > 3 else None
    with SpriteFactory(pal, work / 'sprites') as sp:
        for p in plan:
            layers, cues, shake = [], [], []
            dur, k = p['dur'], p['kind']
            cam, entry = cam_push(1.0, 1.05, 30, -10, dur), 'fade'
            if k == 'title':
                world, entry = tinted(3, accent), 'black'
                ttl = fit(F.cropped(sp.open_title(key_of('t', feat['feature']), feat['name'], f"FAN LIFE · {club['name']}")), 1500, 520)
                layers.append(Layer(ttl, slam(W / 2, H * 0.40, 0.5, s0=1.4, rot=-1.5), settle=1e9))
                hook = fit(F.cropped(sp.label(key_of('h', feat['feature']), feat['hook'], 'paper', 52)), 1500, 140)
                layers.append(Layer(hook, slide_in(W / 2, H * 0.72, 1.1, frm=(0, 300), rot0=-2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                cues += [(0.0, 'whoosh'), (0.5, 'stamp'), (1.1, 'paper')]
                shake.append((0.5, 10))
            elif k == 'step':
                world = tinted(10 + p['i'], accent)
                ph = phone(shots[p['shot']], 900)
                layers.append(Layer(ph, slide_in(W * 0.30, H * 0.5, 0.15, frm=(0, 700), rot0=-4, rot1=-1.2, dur=0.6), settle=1e9, space='world'))
                plate = fit(F.cropped(sp.turning(key_of('s', feat['feature'], p['n']), f"{p['n']:02d}", feat['name'])), 760, 300)
                layers.append(Layer(plate, slide_in(W * 0.70, H * 0.36, 0.45, frm=(700, 0), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                cues += [(0.15, 'whoosh'), (0.45, 'paper')]
                if p['i'] == stub_at:
                    layers += SUB.stub_layers(sp, 'fl-' + feat['feature'], SUB.pick('stub', epn), W - 450, H * 0.66, 1.0, min(4.2, dur - 1.4), 700, cues)
            elif k == 'end':
                world, entry = crumpled(4, CANVAS, '#2A2620').convert('RGB'), 'wipe'
                badge = F.img(ROOT / 'public/brand/fanlife/logo-512.png').resize((340, 340), Image.LANCZOS)
                layers.append(Layer(badge, slam(300, H * 0.42, 0.25, s0=1.8, rot=-8, dur=0.3), settle=1e9))
                head = fit(F.cropped(sp.cta_headline(key_of('e', feat['feature']), f"Play {feat['name']} on FAN LIFE", SUB.pick('end_line', epn))), 1200, 260)
                layers.append(Layer(head, slide_in(560 + head.width / 2, H * 0.36, 0.55, frm=(900, 0), rot0=2, rot1=-1, dur=0.5, drift=False), settle=1e9))
                url = fit(F.cropped(sp.url_banner('fl-end', 'fanlife.dubelteam.com', 'Every club · trivia · games · the life of a supporter')), 1400, 200)
                layers.append(Layer(url, slam(560 + url.width / 2, H * 0.62, 1.4, s0=1.5, rot=-1.2, dur=0.3), settle=1e9))
                cues += [(0.25, 'stamp'), (0.55, 'whoosh'), (1.4, 'stamp'), (0.0, 'end')]
            else:   # the end screen
                world, cam = F.glass(SUB.ART / 'endscreen-ground.jpg'), F.still
                b2 = F.img(ROOT / 'public/brand/fanlife/logo-512.png').resize((150, 150), Image.LANCZOS)
                layers.append(Layer(b2, pop(110, 110, 0.3, rot=-6), settle=1e9))
                line = fit(F.cropped(sp.label('fl-next', SUB.pick('endscreen_line', epn), 'paper', 44)), 1300, 110)
                layers.append(Layer(line, slide_in(210 + line.width / 2, 120, 0.5, frm=(0, -200), rot0=0, rot1=-1, dur=0.5, drift=False), settle=1e9))
                cues += [(0.0, 'crowd-murmur')]
            caps = Captions(p['words'], p['voice_at'] - p['start'], accent) if p.get('words') and k == 'step' else None
            shot = Shot(index=p['i'], duration=dur, world=world, camera=cam, layers=layers, entry=entry, shake=shake, cues=cues, overlay=caps)
            r = ShotRenderer(shot)
            target = work / f"shot-{p['i']:02d}.mp4"
            proc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                                     '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', str(target)], stdin=subprocess.PIPE)
            g0 = round(p['start'] * FPS)
            last = None
            for fi in range(p['frames']):
                fr = blend_entry(shot, fi, r.frame(fi, g0 + fi), prev_last, acc)
                proc.stdin.write(fr.tobytes())
                last = fr
            proc.stdin.close()
            if proc.wait():
                raise SystemExit('encode failed')
            prev_last = last
            files.append(target)
            cues_all += [(p['start'] + ct, c) for ct, c in cues]
            print(f"beat {p['i']:02d} {k} {dur:.1f}s ✓", flush=True)
    (work / 'list.txt').write_text(''.join(f"file '{f}'\n" for f in files))
    picture = work / 'picture.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(work / 'list.txt'), '-c', 'copy', str(picture)])
    n = int(total * SR) + SR
    vo, sfx = np.zeros(n, np.float32), np.zeros(n, np.float32)
    rng = np.random.default_rng(7)
    for p in plan:
        if p.get('wav'):
            a = read_audio(p['wav'])
            i = int(p['voice_at'] * SR)
            vo[i:i + len(a)] += a[: n - i]
    for ct, kd in cues_all:
        i = int(ct * SR)
        if kd.startswith('crowd'):
            pth = CROWD.get(kd)
            if pth and pth.exists():
                a = read_audio(pth)[: int(5 * SR)]
                a *= np.minimum(1, np.arange(len(a))[::-1] / (1.5 * SR))
                sfx[i:i + len(a)] += a[: n - i] * 0.3
            continue
        a = resample(fx(kd, rng), 32000, SR)
        sfx[i:i + len(a)] += a[: n - i] * 0.5
    secs = [{'start': p['start'], 'end': p['start'] + p['dur'], 'mood': 'major' if p['kind'] in ('end', 'endscreen') else 'tense', 'energy': 0.45 if p['kind'] == 'step' else 0.35} for p in plan]
    mus = resample(score(secs, seed=epn), 32000, SR)[:n]
    mus = np.pad(mus, (0, n - len(mus)))
    for nm, arr in (('vo', vo), ('sfx', sfx), ('mus', mus)):
        write_wav(work / f'{nm}.wav', arr[: int(total * SR)])
    mix = work / 'mix.wav'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(work / 'vo.wav'), '-i', str(work / 'sfx.wav'), '-i', str(work / 'mus.wav'), '-filter_complex',
         '[2:a]volume=0.5[m];[m][0:a]sidechaincompress=threshold=0.03:ratio=7:attack=25:release=420[md];'
         '[0:a]highpass=f=70,acompressor=threshold=0.2:ratio=2.5:attack=5:release=120,volume=1.1[v];[1:a]volume=0.8[s];'
         f'[v][md][s]amix=inputs=3:normalize=0,afade=t=out:st={total - 1.5:.2f}:d=1.5,loudnorm=I=-14:TP=-1.5:LRA=11[a]', '-map', '[a]', '-ar', str(SR), '-ac', '2', str(mix)])
    name = f"fl-feature-{feat['feature']}"
    pub = out / f'{name}.mp4'
    for crf in (21, 23, 25, 27):
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(picture), '-i', str(mix), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf),
             '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-map_metadata', '-1', '-movflags', '+faststart', '-shortest', str(pub)])
        if pub.stat().st_size <= 45 * 1048576:
            break
    for kk, frac in enumerate((0.05, 0.25, 0.45, 0.65, 0.8, 0.95)):
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{total * frac:.2f}', '-i', str(pub), '-frames:v', '1', '-vf', 'scale=640:-2', str(out / f'{name}-frame-{kk}.jpg')])
    # the thumbnail: the title frame
    run(['ffmpeg', '-y', '-v', 'error', '-ss', '2.6', '-i', str(pub), '-frames:v', '1', '-vf', 'scale=1280:720', str(out / f'{name}-thumbnail.jpg')])
    shutil.rmtree(work)
    rep = {'made': True, 'feature': feat['feature'], 'club': club['id'], 'url': club['url'], 'tried': club.get('tried', []), 'seconds': round(total, 1),
           'mb': round(pub.stat().st_size / 1048576, 1), 'file': pub.name, 'title': feat['title'],
           'description': f"{feat['hook']} {feat['name']} on FAN LIFE, shown with {club['name']}: " + ' '.join(b['say'] for b in feat['beats']) +
                          f"\n\n▶ Play it: {club['url']}\n\nNarration is synthetic. #FANLIFE #FootballGames #FootballFans"}
    (out / 'film-report.json').write_text(json.dumps(rep, indent=2, ensure_ascii=False))
    print(json.dumps({k: rep[k] for k in ('feature', 'club', 'seconds', 'mb')}), flush=True)


if __name__ == '__main__':
    main()

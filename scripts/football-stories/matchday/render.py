"""I WAS THERE — the edit: an episode file + the owner's footage → the film (16:9) or a reel (9:16), with narration,
crowd sound, cards, captions, a QA report and a light preview.

    python3 scripts/football-stories/matchday/render.py <episode.json> <footage root> <out dir> [--cut film|reel]

The episode file is the edit decision list: shots (clip, in point, length, speed, layout, sound policy, cards) and
narration lines (text + where they start). Everything typed on screen comes from its `fixture` block, which names its
source. Rules: scripts/football-stories/matchday/RULES.md.

Order of work, each step checkable on its own:
  1. narration  — Kokoro (series.json voice), one WAV per line, names spoken from the episode's IPA table
  2. timeline   — shots laid end to end; lines placed, never overlapping
  3. cards      — PNG layers at the output size (cards.py)
  4. shots      — one encoded file per shot: HDR→SDR tone map, house grade, layout, cards, finish
  5. sound      — clip sound (muted where people talk), synthesised score where muted, narration on top, crowd
                  ducked under the voice, −14 LUFS / −1.5 dBTP
  6. master     — joined without re-encoding, sound laid on, ALL metadata stripped; captions; preview; report
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))

import cards as C  # noqa: E402
from studio.audio import score as synth_score  # noqa: E402

SR = 48000
FPS = 30
INK_HEX = '0x15130F'
SERIES = json.loads((HERE / 'series.json').read_text())


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:6])}… failed:\n{r.stderr[-2500:]}")
    return r


def probe(p: Path) -> dict:
    return json.loads(run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', str(p)]).stdout)


def is_hdr(meta: dict) -> bool:
    v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
    return v.get('color_transfer') in ('arib-std-b67', 'smpte2084')


# ── 1 · narration ────────────────────────────────────────────────────────────────────────────────────────────────────
_K = None


def kokoro():
    global _K
    if _K is None:
        import os
        from kokoro_onnx import Kokoro
        d = Path(os.environ.get('KOKORO_DIR', str(Path.home() / 'models')))
        _K = Kokoro(str(d / 'kokoro-v1.0.onnx'), str(d / 'voices-v1.0.bin'))
    return _K


def phonemes(text: str, ipa: dict[str, str], lang: str) -> str:
    """Phonemise a line, putting each listed name in as the IPA the episode gives (Kokoro spells unknown names)."""
    k = kokoro()
    names = sorted(ipa, key=len, reverse=True)
    if not names:
        return k.tokenizer.phonemize(text, lang)
    parts = re.split('(' + '|'.join(re.escape(n) for n in names) + ')', text)
    out = []
    for p in parts:
        if not p:
            continue
        out.append(ipa[p] if p in ipa else k.tokenizer.phonemize(p, lang))
    return ' '.join(s.strip() for s in out if s.strip())


def speak(text: str, ipa: dict, target: Path) -> float:
    v = SERIES['voice']
    k = kokoro()
    ph = phonemes(text, ipa, v['lang'])
    a, sr = k.create(ph, voice=v['voice'], speed=v['speed'], lang=v['lang'], is_phonemes=True)
    a = resample(np.asarray(a, dtype=np.float32), sr, SR)
    write_wav(target, a)
    return len(a) / SR


def resample(a: np.ndarray, sr: int, to: int) -> np.ndarray:
    if sr == to:
        return a
    n = int(len(a) * to / sr)
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)


def write_wav(path: Path, a: np.ndarray, sr: int = SR, ch: int = 1) -> None:
    import wave
    a = np.clip(a, -1, 1)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((a * 32767).astype('<i2').tobytes())


def read_audio(path: Path, start: float = 0, dur: float | None = None) -> np.ndarray:
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{start:.3f}', '-i', str(path)]
    if dur:
        cmd += ['-t', f'{dur:.3f}']
    cmd += ['-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
    r = subprocess.run(cmd, capture_output=True)
    return np.frombuffer(r.stdout, '<i2').astype(np.float32) / 32768 if r.returncode == 0 else np.zeros(0, np.float32)


# ── speech check (anonymity: RULES §4) ───────────────────────────────────────────────────────────────────────────────
_W = None


def speech_in(path: Path, start: float, dur: float) -> dict:
    """Transcribe the clip's own sound. Returns {'checked', 'speech', 'text'}; never guesses when Whisper is absent."""
    global _W
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return {'checked': False, 'speech': None, 'text': ''}
    if _W is None:
        _W = WhisperModel('small', device='cpu', compute_type='int8')
    tmp = Path('/tmp/_speech.wav')
    write_wav(tmp, read_audio(path, start, dur))
    segs, _ = _W.transcribe(str(tmp), vad_filter=True, beam_size=1)
    said = [s for s in segs if s.no_speech_prob < 0.5 and s.avg_logprob > -1.0 and len(s.text.strip()) > 3]
    return {'checked': True, 'speech': bool(said), 'text': ' | '.join(s.text.strip() for s in said)[:400]}


# ── 4 · shots ────────────────────────────────────────────────────────────────────────────────────────────────────────
TONE = ('zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,'
        'zscale=t=bt709:m=bt709:r=tv,format=yuv420p')
GRADE = 'eq=contrast=1.06:saturation=0.95:brightness=-0.015'


def orient(meta: dict) -> tuple[int, int]:
    v = next(s for s in meta['streams'] if s['codec_type'] == 'video')
    rot = 0
    for sd in v.get('side_data_list') or []:
        if 'rotation' in sd:
            rot = int(round(float(sd['rotation'])))
    w, h = int(v['width']), int(v['height'])
    return (h, w) if rot in (90, -90, 270, -270) else (w, h)


def chain(hdr: bool, scale: str, post: str = '', speed: float = 1.0, still: float | None = None, dur: float = 0) -> str:
    """Scale first (cheap, still HLG), then tone-map to SDR, grade, retime; `post` runs on the SDR picture."""
    steps = [scale, TONE if hdr else 'format=yuv420p', GRADE]
    if still is not None:
        steps += [f'fps={FPS}', 'loop=-1:1', f'trim=duration={dur:.3f}', 'setpts=N/FRAME_RATE/TB']
    else:
        steps += [f'setpts=PTS/{speed}', f'fps={FPS}']
    if post:
        steps.append(post)
    steps.append('setsar=1')
    return ','.join(steps)


def render_shot(shot: dict, frame: str, src: Path, meta: dict, layers: dict, out: Path, dur: float) -> None:
    W, H = (1920, 1080) if frame == 'wide' else (1080, 1920)
    speed = float(shot.get('speed', 1.0))
    hdr = is_hdr(meta)
    vw, vh = orient(meta)
    tall = vh > vw
    still = shot.get('still')
    inputs: list[str] = (['-ss', f'{still:.3f}', '-i', str(src)] if still is not None
                         else ['-ss', f"{shot.get('in', 0):.3f}", '-t', f'{dur * speed + 0.1:.3f}', '-i', str(src)])
    lp = lambda png: ['-loop', '1', '-t', f'{dur:.3f}', '-i', str(png)]  # noqa: E731
    dim = f",eq=brightness=-{shot['dim']}" if shot.get('dim') else ''
    if frame == 'wide' and tall:          # vertical clip set into newsprint, taped
        inputs += lp(layers['paper']) + lp(layers['tape'])
        g = (f"[0:v]{chain(hdr, 'scale=-2:940', 'pad=iw+16:ih+16:8:8:color=' + INK_HEX + dim, speed, still, dur)}[c];"
             f"[1:v]fps={FPS},format=yuv420p[bg];[bg][c]overlay=192:54[v0];[v0][2:v]overlay=0:0[v1]")
        nxt, cur = 3, 'v1'
    elif frame == 'tall' and not tall:    # wide clip between newsprint bands
        inputs += lp(layers['band'])
        g = (f"[0:v]{chain(hdr, 'scale=1080:-2', dim.lstrip(','), speed, still, dur)}[c];"
             f"[1:v]fps={FPS},format=yuv420p[bg];[bg][c]overlay=0:'656+(608-h)/2'[v0]")
        nxt, cur = 2, 'v0'
    else:                                 # full frame, with the house finish
        inputs += lp(layers['finish'])
        fit = f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}'
        g = f"[0:v]{chain(hdr, fit, dim.lstrip(','), speed, still, dur)}[c];[c][1:v]overlay=0:0[v0]"
        nxt, cur = 2, 'v0'
    for c in shot.get('_cards', []):
        a, b = c['at'], min(c.get('until', dur), dur)
        inputs += lp(c['png'])
        fade = f"format=rgba,fade=t=in:st={a:.2f}:d=0.35:alpha=1"
        if b < dur - 0.05:
            fade += f",fade=t=out:st={max(a, b - 0.3):.2f}:d=0.3:alpha=1"
        y = "'max(0,(1-min(1,(t-%.2f)/0.45))*H*0.4)'" % a if c.get('anim') == 'rise' else '0'
        g += f";[{nxt}:v]{fade}[k{nxt}];[{cur}][k{nxt}]overlay=0:{y}:enable='gte(t,{a:.2f})'[o{nxt}]"
        cur = f'o{nxt}'
        nxt += 1
    g += f';[{cur}]format=yuv420p[out]'
    tmp = out.with_name(out.stem + '.tmp.mp4')
    run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', g, '-map', '[out]', '-t', f'{dur:.3f}',
         '-r', str(FPS), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-an', str(tmp)])
    tmp.rename(out)


# ── 5 · sound ────────────────────────────────────────────────────────────────────────────────────────────────────────
def rms_db(a: np.ndarray) -> float:
    return 20 * math.log10(max(1e-6, float(np.sqrt(np.mean(a ** 2))) if len(a) else 1e-6))


def build_sound(plan: list[dict], lines: list[dict], total: float, sections: list[dict], out: Path) -> None:
    n = int(total * SR) + SR
    bed = np.zeros(n, np.float32)
    for s in plan:
        if s['sound'] != 'clip':
            continue
        a = read_audio(s['src'], s.get('in', 0), s['dur'] * s.get('speed', 1.0))
        if s.get('speed', 1.0) != 1.0:
            a = resample(a, int(SR * s['speed']), SR)
        if not len(a):
            continue
        a = a * 10 ** ((-20 - rms_db(a)) / 20) * s.get('gain', 1.0)          # even the clips out around −20 dBFS
        f = int(0.12 * SR)
        env = np.ones(len(a), np.float32)
        env[:f] = np.linspace(0, 1, f)
        env[-f:] = np.linspace(1, 0, f)
        i = int(s['t0'] * SR)
        seg = (a * env)[: n - i]
        bed[i:i + len(seg)] += seg
    # score where the picture asked for it (muted road/city shots), from the studio's own synthesiser
    if sections:
        sc = resample(synth_score(sections), 32000, SR) * 10 ** (-12 / 20)
        bed[: len(sc)] += sc[: n]
    voice = np.zeros(n, np.float32)
    for ln in lines:
        a = read_audio(ln['wav'])
        i = int(ln['t'] * SR)
        voice[i:i + len(a)] += a[: n - i]
    # duck the bed 9 dB under the voice, with a soft attack and release
    act = (np.abs(voice) > 0.01).astype(np.float32)
    k = int(0.35 * SR)
    act = np.convolve(act, np.ones(k, np.float32) / k, mode='same')
    duck = 1 - (1 - 10 ** (-9 / 20)) * np.clip(act * 3, 0, 1)
    mix = bed * duck + voice * 1.15
    tail = int(1.2 * SR)
    end = int(total * SR)
    mix[end - tail:end] *= np.linspace(1, 0, tail)
    mix[end:] = 0
    raw = out.with_name('mix-raw.wav')
    write_wav(raw, mix[:end])
    # two-pass loudness to −14 LUFS / −1.5 dBTP
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(raw), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
                        '-f', 'null', '-'], capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rindex('{'):])
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af',
         f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
         f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", '-ar', str(SR), '-ac', '2', str(out)])


# ── captions ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def ts(t: float, sep=',') -> str:
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f'{int(h):02d}:{int(m):02d}:{int(s):02d}{sep}{int((s % 1) * 1000):03d}'


def word_times(ln: dict) -> list[tuple[str, float, float]]:
    """Words spread across the line by their length (the line itself is timed exactly)."""
    words = ln['text'].split()
    w = [len(re.sub(r'\W', '', x)) + 2 for x in words]
    tot = sum(w)
    t, out = ln['t'], []
    for word, wi in zip(words, w):
        d = ln['dur'] * wi / tot
        out.append((word, t, t + d))
        t += d
    return out


def srt(lines: list[dict], out: Path) -> None:
    cues = []
    for ln in lines:
        wt = word_times(ln)
        chunk = []
        for item in wt:
            chunk.append(item)
            if len(' '.join(x[0] for x in chunk)) > 34 or item is wt[-1]:
                cues.append((chunk[0][1], chunk[-1][2], ' '.join(x[0] for x in chunk)))
                chunk = []
    out.write_text('\n'.join(f'{i}\n{ts(a)} --> {ts(b)}\n{txt}\n' for i, (a, b, txt) in enumerate(cues, 1)))


# ── the run ──────────────────────────────────────────────────────────────────────────────────────────────────────────
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('episode', type=Path)
    ap.add_argument('footage', type=Path)
    ap.add_argument('out', type=Path)
    ap.add_argument('--cut', default='film', choices=['film', 'reel'])
    a = ap.parse_args()
    ep = json.loads(a.episode.read_text())
    cut = ep[a.cut]
    frame = 'wide' if a.cut == 'film' else 'tall'
    W, H = (1920, 1080) if frame == 'wide' else (1080, 1920)
    out = a.out / a.cut
    work = out / 'work'
    shutil.rmtree(out, ignore_errors=True)
    work.mkdir(parents=True)
    folder = a.footage / ep['folder']
    f = C.F(ep['fixture'])
    report = {'episode': ep['id'], 'cut': a.cut, 'frame': [W, H], 'voice': SERIES['voice'], 'shots': [], 'speech': {}}

    # 1 · narration
    ipa = ep.get('ipa', {})
    lines = []
    for i, ln in enumerate(cut.get('lines', [])):
        wav = work / f'line-{i:02d}.wav'
        d = speak(ln['text'], ipa, wav)
        lines.append({**ln, 'wav': wav, 'dur': d})

    # 2 · timeline
    t = 0.0
    plan = []
    metas = {}
    for i, s in enumerate(cut['shots']):
        src = folder / s['clip']
        metas.setdefault(s['clip'], probe(src))
        s = {**s, 'src': src, 't0': t, 'i': i}
        plan.append(s)
        t += s['dur']
    total = t
    prev_end = 0.0
    for ln in lines:
        start = max(plan[ln['shot']]['t0'] + ln.get('offset', 0.4), prev_end + 0.25)
        ln['t'] = start
        prev_end = start + ln['dur']
        home = plan[ln['shot']]
        if prev_end > home['t0'] + home['dur'] + plan[min(len(plan) - 1, ln['shot'] + 1)]['dur']:
            print(f"warning: line '{ln['text'][:30]}…' runs past the shot after its own", flush=True)
    if lines and prev_end > total - 0.5:
        print('warning: narration runs to the very end', flush=True)

    # sound policy per shot (mute where people talk)
    sections = []
    for s in plan:
        pol = s.get('sound', 'auto')
        if pol in ('auto', 'clip') and s.get('still') is None:
            chk = speech_in(s['src'], s.get('in', 0), s['dur'] * s.get('speed', 1.0))
            report['speech'][f"{s['i']:02d} {s['clip']}"] = chk
            if pol == 'auto':
                pol = 'mute' if (chk['speech'] or not chk['checked']) else 'clip'
        if s.get('still') is not None:
            pol = 'mute'
        s['sound'] = pol
        if s.get('score'):
            sections.append({'start': s['t0'], 'end': s['t0'] + s['dur'], **s['score']})

    # 3 · cards
    layers: dict = {}
    with C.Painter(ep['accent']) as P:
        layers['finish'] = C.finish(P, work / 'finish.png', (W, H))
        if frame == 'wide':
            layers['tape'] = C.w_tape(P, work / 'tape.png')
        for s in plan:
            cs = []
            for c in s.get('cards', []):
                png = work / f"card-{s['i']:02d}-{c['kind']}.png"
                k = c['kind']
                if k == 'open':
                    C.w_open(P, f, png)
                elif k == 'chapter':
                    C.w_chapter(P, f, c['n'], c['title'], png)
                elif k == 'fulltime':
                    (C.w_fulltime if frame == 'wide' else C.t_fulltime)(P, f, png)
                elif k == 'end':
                    (C.w_end if frame == 'wide' else C.t_end)(P, f, png)
                elif k == 'hook':
                    C.t_hook(P, f, c['hook'], c['accent'], png)
                cs.append({'png': png, 'at': c.get('at', 0.0), 'until': c.get('until', s['dur']), 'anim': c.get('anim')})
            s['_cards'] = cs
            vw, vh = orient(metas[s['clip']])
            if frame == 'wide' and vh > vw and not s.get('paper'):
                s['paper'] = {'title': ''}
            if frame == 'tall' and vw > vh and not s.get('band'):
                s['band'] = {'headline': ''}
            if s.get('paper'):
                p = s['paper']
                s['_paper'] = C.w_paper(P, f, p.get('n'), p['title'], p.get('lines', []), work / f"paper-{s['i']:02d}.png")
            if s.get('band'):
                b = s['band']
                s['_band'] = C.t_band(P, f, b['headline'], b.get('sub', ''), work / f"band-{s['i']:02d}.png")
        # burned captions on the reel: one layer per spoken word
        if frame == 'tall':
            caps = []
            for li, ln in enumerate(lines):
                wt = word_times(ln)
                for c0 in range(0, len(wt), 3):
                    chunk = wt[c0:c0 + 3]
                    for j, (w_, a_, b_) in enumerate(chunk):
                        png = work / f'cap-{li:02d}-{c0 + j:03d}.png'
                        C.t_caption(P, [x[0] for x in chunk], j, png)
                        caps.append((png, a_, b_ if j < len(chunk) - 1 else chunk[-1][2]))
            report['captions_burned'] = len(caps)

    # 4 · shots
    files = []
    for s in plan:
        lay = {**layers, 'paper': s.get('_paper'), 'band': s.get('_band')}
        target = work / f"shot-{s['i']:02d}.mp4"
        render_shot(s, frame, s['src'], metas[s['clip']], lay, target, s['dur'])
        files.append(target)
        report['shots'].append({'i': s['i'], 'clip': s['clip'], 'in': s.get('in', 0), 'dur': s['dur'], 'sound': s['sound'],
                                'hdr': is_hdr(metas[s['clip']]), 't0': round(s['t0'], 2)})
        print(f"shot {s['i']:02d} {s['clip']} ✓", flush=True)
    lst = work / 'list.txt'
    lst.write_text(''.join(f"file '{p}'\n" for p in files))
    joined = work / 'joined.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(joined)])
    if frame == 'tall' and caps:
        inputs, graph, cur = ['-i', str(joined)], '', '0:v'
        for k, (png, a_, b_) in enumerate(caps, 1):
            inputs += ['-i', str(png)]
            graph += f"[{cur}][{k}:v]overlay=0:0:enable='between(t,{a_:.2f},{b_:.2f})'[c{k}];"
            cur = f'c{k}'
        capped = work / 'captioned.mp4'
        run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', graph + f'[{cur}]format=yuv420p[out]', '-map', '[out]',
             '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', str(capped)])
        joined = capped

    # 5 · sound
    mix = work / 'mix.wav'
    build_sound(plan, lines, total, sections, mix)

    # 6 · master (metadata stripped), captions, preview, thumbnail frame, report
    name = f"{ep['id']}-{a.cut}"
    master = out / f'{name}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-i', str(joined), '-i', str(mix), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '256k', '-map_metadata', '-1', '-map_chapters', '-1', '-metadata', f"title={ep['title']}",
         '-movflags', '+faststart', '-shortest', str(master)])
    srt(lines, out / f'{name}.en.srt')
        run(['ffmpeg', '-y', '-v', 'error', '-i', str(master), '-c:v', 'libx264', '-preset', 'veryfast',
         '-crf', '25', '-c:a', 'aac', '-b:a', '128k', '-map_metadata', '-1', '-movflags', '+faststart', str(out / f'{name}-preview.mp4')])
    for k, frac in enumerate((0.05, 0.2, 0.4, 0.6, 0.8, 0.95)):
        run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{total * frac:.2f}', '-i', str(master), '-frames:v', '1', '-vf',
             'scale=960:-2' if frame == 'wide' else 'scale=540:-2', str(out / f'frame-{k}.jpg')])
    # QA: loudness, length, tags
    lr = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(master), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                        capture_output=True, text=True).stderr
    mm = probe(master)
    tags = {**(mm['format'].get('tags') or {})}
    for st in mm['streams']:
        tags.update({f"{st['codec_type']}:{k}": v for k, v in (st.get('tags') or {}).items()})
    bad = [k for k in tags if any(x in k.lower() for x in ('location', 'iso6709', 'make', 'model', 'creation'))]
    report.update({
        'duration': round(float(mm['format']['duration']), 2), 'planned': round(total, 2),
        'lufs': float(re.findall(r'I:\s+(-?[\d.]+) LUFS', lr)[-1]), 'true_peak': float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', lr)[-1]),
        'identifying_tags_left': bad, 'lines': [{'text': l['text'], 't': round(l['t'], 2), 'dur': round(l['dur'], 2)} for l in lines],
        'bytes': master.stat().st_size,
    })
    (out / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False, default=str))
    shutil.rmtree(work)
    print(json.dumps({k: report[k] for k in ('duration', 'lufs', 'true_peak', 'identifying_tags_left')}), flush=True)
    if bad:
        sys.exit(f'identifying tags left in the master: {bad}')


if __name__ == '__main__':
    main()

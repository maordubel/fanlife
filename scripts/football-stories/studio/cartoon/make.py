"""Make one cartoon Short: voice → beat sheet → HyperFrames → the mix → a vertical MP4 of at most 30 seconds.

    python3 -m studio.cartoon.make --text "This is the bottle that cost a goalkeeper the World Cup. …" --out /tmp/s.mp4 \
        [--primary '#B02D10' --on '#FFFBF2' --bans yellow --tag 'FAN LIFE · CLASSIFIED'] [--voice fake]

The voice is a normal guy talking, not the documentary narrator (the guide's rule): Kokoro `am_michael` unless
STORIES_SHORTS_VOICE says otherwise. The music is one of the owner's own tracks, far under the voice; the effects are the
studio's own synthesised ones (audio.fx), placed on the gags. Free, local, no paid service anywhere.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np

from ..common import StageError, read_json, write_json
from . import anim, build, plates, scene, sound, stage

MAX_S = 30.0
FPS = 30


def _wav(path: Path) -> np.ndarray:
    from ..audio import SR, _read
    return _read(path, SR)


def voice(text: str, work: Path, cache: Path, fake: bool = False) -> tuple[Path, list[dict], float]:
    work.mkdir(parents=True, exist_ok=True)
    if fake:
        from comic.produce import fake_voice
        wav = work / 'voice.wav'
        meta = fake_voice(text, wav)
        with wave.open(str(wav)) as w:
            dur = w.getnframes() / w.getframerate()
        return wav, meta['words'], dur
    from .. import voice as V
    # a Short's narrator: Gemini's upbeat storyteller (free tier) or, when it is spent, Kokoro's Michael
    want = {'STORIES_KOKORO_VOICE': os.environ.get('STORIES_SHORTS_VOICE', 'am_michael'),
            'STORIES_GEMINI_VOICE': os.environ.get('STORIES_SHORTS_GEMINI_VOICE', 'Puck'), 'STORIES_GEMINI_STYLE': 'short'}
    prev = {k: os.environ.get(k) for k in want}
    os.environ.update(want)
    try:
        v = V.voice_script({'chapters': [{'beats': [{'narration': text}]}]}, work / 'voice', cache, lambda m: print(m, flush=True))
    finally:
        for k, val in prev.items():
            if val is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = val
    b = v['beats'][0]
    return work / 'voice' / b['file'], b['words'], float(b['duration'])


def mix(voice_wav: Path, duration: float, cues: list[tuple[float, str]], out: Path, music_tags: list[str], seed: str, log) -> Path:
    from ..audio import SR, _write, fx, level_fx, level_music, owner_score, resolve_music, speech_db
    n = int(duration * SR)
    v = np.zeros(n, 'float32')
    a = _wav(voice_wav)
    i0 = int(0.1 * SR)
    v[i0:i0 + len(a)] += a[: max(0, n - i0)]
    vdb = speech_db(v)
    rng = np.random.default_rng(7)
    sfx = np.zeros(n, 'float32')
    for t, kind in cues:
        try:
            s = level_fx(kind, fx(kind, rng), vdb, rng)
        except Exception:  # noqa: BLE001 — an effect the synthesiser lacks is skipped, never a failed Short
            continue
        j = int(max(0.0, t) * SR)
        if j < n:
            sfx[j:j + len(s)] += s[: n - j]
    try:
        music, tid = owner_score([{'start': 0.0, 'end': duration, 'mood': 'drive'}], resolve_music(None, music_tags, seed), log)
        music = level_music(music[:n] if len(music) >= n else np.pad(music, (0, n - len(music))), vdb)
        log(f'Cartoon Short: music {tid}')
    except Exception as e:  # noqa: BLE001
        log(f'Cartoon Short: no owner track could be had ({e}); voice and effects only')
        music = np.zeros(n, 'float32')
    total = v + sfx + music
    peak = float(np.max(np.abs(total)) or 1.0)
    if peak > 0.89:
        total *= 0.89 / peak
    _write(out, total.astype('float32'), SR)
    return out


def make(text: str, cartoon: list | None, out: Path, work: Path, *, primary: str, on_primary: str, bans: list[str], tag: str,
         masthead: str = '', music_tags: list[str] | None = None, fake_voice: bool = False, log=print, cache: Path | None = None,
         club_id: str | None = None, season: str | None = None, engine: str | None = None, cast_sheet: list | None = None) -> dict:
    """`engine`: 'illustrated' (default — the owner's drawn library, owner 8.11.2026) or 'drawn' (the code-drawn
    character, kept as the fallback when the library is not on this runner)."""
    if isinstance(cartoon, dict):  # {"beats": [...], "cast_sheet": [...]}
        cast_sheet = cast_sheet or cartoon.get('cast_sheet')
        cartoon = cartoon.get('beats')
    has_story_art = isinstance(cartoon, list) and any(isinstance(b, dict) and b.get('scene') for b in cartoon)
    engine = engine or os.environ.get('STORIES_SHORTS_LOOK') or (
        'animated' if has_story_art and os.environ.get('GEMINI_API_KEY') else 'illustrated' if plates.has_library() else 'drawn')
    work.mkdir(parents=True, exist_ok=True)
    wav, words, vdur = voice(text, work, cache or work / 'cache', fake_voice)
    duration = round(vdur + 0.75, 3)
    if duration > MAX_S:
        raise StageError('SHORT_TOO_LONG', f'the cartoon Short would run {duration:.1f}s (30 s at most)')
    beats = scene.plan(scene.split_beats(text, cartoon), words)
    proj = work / 'hf'
    if proj.exists():
        shutil.rmtree(proj)
    shots = None
    if engine == 'animated':
        gen_cache = Path(os.environ.get('STORIES_GENART_CACHE') or ((cache or work / 'cache').parent / 'genart'))
        art = anim.draw_story(beats, cast_sheet or [], gen_cache, bans, log)
        _, cues, shots = anim.compose(proj, beats, art, words, duration, accent=primary, bans=bans, tag=tag, fps=FPS)
    elif engine == 'illustrated':
        _, cues, shots = stage.compose(proj, beats, words, duration, accent=primary, bans=bans, tag=tag, masthead=masthead,
                                       club_id=club_id, season=season, fps=FPS, salt=f'{club_id}:{text[:40]}')
    else:
        pal = build.palette(primary, on_primary, bans)
        _, cues = build.compose(proj, beats, words, duration, pal, tag=tag, bans=bans, masthead=masthead, fps=FPS)
    write_json(work / 'beats.json', {'beats': beats, 'cues': cues, 'shots': shots, 'engine': engine})
    from ..hyperframes.render import hf_render
    silent = work / 'picture.mp4'
    hf_render(proj, silent, FPS, log)
    if shots is not None:
        audio = sound.mix(wav, duration, shots, cues, work / 'mix.wav', music_tags or ['upbeat', 'energy'], text[:40], log)
    else:
        audio = mix(wav, duration, cues, work / 'mix.wav', music_tags or ['upbeat', 'energy'], text[:40], log)
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(silent), '-i', str(audio), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                    '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
    return {'file': str(out), 'seconds': duration, 'beats': len(beats), 'gags': [b['gag'] for b in beats if b['gag']],
            'engine': 'cartoon', 'look': engine, 'plates': [s['plate_key'] for s in shots] if shots else []}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', required=True)
    ap.add_argument('--cartoon', type=Path)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--work', type=Path, default=Path('/tmp/cartoon-short'))
    ap.add_argument('--primary', default='#B02D10')
    ap.add_argument('--on', default='#FFFBF2')
    ap.add_argument('--bans', default='yellow')
    ap.add_argument('--tag', default='FAN LIFE · FOOTBALL STORIES')
    ap.add_argument('--voice', choices=['kokoro', 'fake'], default='kokoro')
    ap.add_argument('--look', choices=['animated', 'illustrated', 'drawn'])
    ap.add_argument('--club')
    a = ap.parse_args(argv)
    cartoon = read_json(a.cartoon) if a.cartoon else None
    r = make(a.text, cartoon, a.out, a.work, primary=a.primary, on_primary=a.on, bans=[b for b in a.bans.split(',') if b],
             tag=a.tag, fake_voice=a.voice == 'fake', engine=a.look, club_id=a.club)
    print(json.dumps(r))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

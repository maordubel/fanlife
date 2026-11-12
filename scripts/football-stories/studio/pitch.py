"""The pitch desk: each director proposes the next film he wants to make (owner, 4.11.2026: "each director proposes the
next film and the script he loves most, each time a different club, a different event").

    python3 -m studio.pitch            (from scripts/football-stories; STORIES_URL + FAN_LIFE_CRON_SECRET + GEMINI_API_KEY)
    python3 -m studio.pitch --dry      (prints the round, saves nothing)

Run by .github/workflows/stories-pitch.yml — every day, and when the owner presses "Ask for new pitches" in the studio
(the listener starts it). One round = one pitch per director:

1. **What is not pitched again** — the studio answers `pitch_history`: every event already filmed and every club+event
   pitched in the last days (any director). An event is a match, a tie, a season or a rivalry (`event_key`, the same key
   as lib/stories/pitches.ts → eventKey).
2. **The candidates** — `director.candidates(club_ids)` (the director's brain, studio/director.py): the strongest
   stories in each club's archive, over every club whose matches the research stage can read
   (content/generated/stories-seasons.json, and its compiled pack when one is on disk).
3. **Rotation** — each director, in turn, gets a shortlist: nothing taken, no club another director already took this
   round, and the clubs he pitched least recently first (a club he never pitched comes before all of them). So every
   round is three clubs and three events, and a director does not come back to the same club day after day.
4. **The pitch** — `writer.write_pitch(director, shortlist, cache_dir, log)` picks his favourite and writes it (title,
   logline, cold open, three acts, why). A pitch that names something outside his shortlist is refused, not saved.
5. **Saved** through `pitch_save` with how the run went. Google's free writer is wait-aware (studio/gemini.py): when it
   answers WRITER_QUOTA_DAY / WRITER_BUSY the round stops, keeps what it has, and reports `waiting` with the time the
   quota comes back — the listener starts the run again by itself then, and the studio says so in its banner.
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import time
from pathlib import Path

from .common import ROOT, StageError
from .directors import DIRECTORS
from .worker import WAIT_CODES, Studio, report_keys, retry_at

STOP_CODES = ('WRITER_NO_CREDIT', 'WRITER_KEY', 'WRITER_NOT_CONFIGURED')  # writer.STOP_CODES, kept here so the desk imports no writer

SHORTLIST = 8


def event_key(x: dict) -> str:
    """lib/stories/pitches.ts → eventKey, the same string: club|kind|what."""
    kind = x.get('kind') or 'season'
    if kind == 'rivalry':
        what = str(x.get('opponent') or '').lower()
    elif kind == 'season':
        what = str(x.get('season') or '')
    else:
        what = ','.join(sorted(x.get('match_ids') or []))
    return f"{x.get('club_id')}|{kind}|{what}"


def readable_clubs(root: Path = ROOT) -> list[str]:
    """Clubs whose matches the research stage can read; when compiled packs are on disk, only those with one."""
    idx = json.loads((root / 'content' / 'generated' / 'stories-seasons.json').read_text())
    ids = [c for c, seasons in idx.get('clubs', {}).items() if seasons]
    compiled = root / 'content' / 'compiled'
    on_disk = {p.stem for p in compiled.glob('*.json')} if compiled.exists() else set()
    # Hapoel Tel Aviv researches from The Worker's own archive, not a compiled pack
    return [c for c in ids if not on_disk or c in on_disk or c == 'hapoel-tel-aviv']


def shortlist(cands: list[dict], director_id: str, taken: set[str], clubs_this_round: set[str], history: list[dict],
              size: int = SHORTLIST) -> list[dict]:
    """The candidates one director may choose from this round, best rotation first, at most two per club."""
    last_by_him: dict[str, str] = {}
    last_any: dict[str, str] = {}
    for h in history:
        last_any[h['club_id']] = max(last_any.get(h['club_id'], ''), h.get('date') or '')
        if h.get('director') == director_id:
            last_by_him[h['club_id']] = max(last_by_him.get(h['club_id'], ''), h.get('date') or '')
    ok = [c for c in cands if c.get('club_id') not in clubs_this_round and event_key(c) not in taken]
    ok.sort(key=lambda c: (last_by_him.get(c['club_id'], ''), last_any.get(c['club_id'], '')))  # never pitched ('') first
    out, per = [], {}
    for c in ok:
        if per.get(c['club_id'], 0) >= 2:
            continue
        per[c['club_id']] = per.get(c['club_id'], 0) + 1
        out.append(c)
        if len(out) >= size:
            break
    return out


def fits(p: dict, offered: list[dict]) -> bool:
    """A pitch must be one of the candidates the director was offered (same club and event)."""
    return any(p.get('club_id') == c.get('club_id') and event_key(p) == event_key(c) for c in offered)


def round_of(club_ids: list[str], history: dict, cache_dir: Path, log, *, candidates=None, write_pitch=None) -> dict:
    """One round: {pitches, status}. `candidates`/`write_pitch` default to the director's brain (studio/director.py,
    studio/writer.py); tests pass fakes."""
    if candidates is None or write_pitch is None:
        try:
            from . import director as brain
            from . import writer
            candidates = candidates or brain.candidates
            write_pitch = write_pitch or writer.write_pitch
        except (ImportError, AttributeError) as e:
            raise StageError('PITCH_NOT_READY', f'The directors cannot pitch yet: {e}') from e
    cands = candidates(club_ids)
    log(f'Candidates: {len(cands)} across {len({c["club_id"] for c in cands})} clubs')
    taken = {h['event'] for h in history.get('pitched', [])} | {f['event'] for f in history.get('films', [])}
    filmed_matches = {m for f in history.get('films', []) for m in f.get('match_ids') or []}
    cands = [c for c in cands if not (set(c.get('match_ids') or []) & filmed_matches and c.get('kind') == 'match')]
    pitches: list[dict] = []
    clubs_now: set[str] = set()
    for d in DIRECTORS:
        offered = shortlist(cands, d['id'], taken, clubs_now, history.get('pitched', []))
        if not offered:
            log(f"{d['name']}: nothing left to pitch that is not taken")
            continue
        try:
            p = write_pitch(d, offered, cache_dir, log)
        except StageError as e:
            if e.code in WAIT_CODES:
                log(f"{d['name']}: the writer is waiting [{e.code}] — the round stops here")
                return {'pitches': pitches, 'status': {'state': 'waiting', 'retryAt': retry_at(e.code), 'note': str(e)[:280]}}
            if e.code in STOP_CODES:  # the key or its billing: the next director would get the same refusal
                log(f"{d['name']}: the writer cannot work [{e.code}] — the round stops here")
                return {'pitches': pitches, 'status': {'state': 'failed', 'note': str(e)[:280]}}
            log(f"{d['name']}: no pitch [{e.code}] {e}")
            continue
        if not p or not fits(p, offered):
            log(f"{d['name']}: the pitch named something outside the shortlist — not saved")
            continue
        p = {**p, 'director': d['id']}
        pitches.append(p)
        taken.add(event_key(p))
        clubs_now.add(p['club_id'])
        log(f"{d['name']}: {p.get('title')} ({p['club_id']} · {p.get('kind')} · {p.get('season')})")
    status = {'state': 'done' if pitches else 'failed', 'note': None if pitches else 'No director could pitch this round'}
    return {'pitches': pitches, 'status': status}


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description='Each director pitches the next film.')
    ap.add_argument('--dry', action='store_true', help='print the round, save nothing')
    a = ap.parse_args(argv)
    log = lambda m: print(time.strftime('%H:%M:%S'), m, flush=True)  # noqa: E731
    base = os.environ.get('STORIES_URL') or os.environ.get('FAN_LIFE_RESEARCH_URL') or 'https://fanlife.dubelteam.com'
    secret = os.environ.get('FAN_LIFE_CRON_SECRET', '')
    if len(secret) < 32 and not a.dry:
        print('FAN_LIFE_CRON_SECRET is not set: the pitch desk cannot talk to the studio.', file=sys.stderr)
        return 1
    st = Studio(base, secret, ('pitch-' + os.environ.get('GITHUB_RUN_ID', socket.gethostname()))[:60])
    if not a.dry:
        report_keys(st, log)
    history = {'pitched': [], 'films': []} if a.dry else st.call({'op': 'pitch_history', 'days': 14})
    cache = Path(os.environ.get('STORIES_PITCH_CACHE', 'stories-pitch-cache'))
    cache.mkdir(parents=True, exist_ok=True)
    try:
        out = round_of(readable_clubs(), history, cache, log)
    except StageError as e:
        out = {'pitches': [], 'status': {'state': 'failed', 'note': f'[{e.code}] {e}'[:280]}}
    if a.dry:
        print(json.dumps(out, indent=1, ensure_ascii=False))
        return 0
    r = st.call({'op': 'pitch_save', 'pitches': out['pitches'], 'status': out['status']})
    log(f"Saved {r.get('saved')} pitch(es); refused: {r.get('refused') or 'none'}; status {out['status']['state']}")
    return 0 if out['status']['state'] != 'failed' else 1


if __name__ == '__main__':
    raise SystemExit(main())

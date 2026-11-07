"""Club-specific editorial context, separate from evidence of a particular historical event.

The reviewed world packs are shared with FanLife. They include contemporary details, so a pack is
context for the writer, not proof that a name, ground or supporter practice applied in a past year.
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from .common import ROOT


def profile(club_id: str, root: Path = ROOT) -> dict:
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', club_id or ''):
        return {'status': 'unavailable', 'entries': []}
    p = root / 'club-packs' / club_id / 'world.json'
    if not p.exists():
        p = root / 'scripts' / 'football-stories' / 'studio' / 'dossiers' / 'club-context' / (club_id + '.json')
    try:
        world = json.loads(p.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        # Some eligible clubs have an approved core pack but no reviewed world profile yet.
        try:
            core = json.loads((root / 'club-packs' / club_id / 'core.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return {'club_id': club_id, 'status': 'unavailable', 'entries': []}
        if core.get('clubId') != club_id:
            return {'club_id': club_id, 'status': 'unavailable', 'entries': []}
        sources = {x.get('id'): x for x in core.get('sources') or [] if isinstance(x, dict)}
        entries = []
        for item in core.get('rivals') or []:
            if item.get('status') != 'approved' or not item.get('conflictFree'):
                continue
            value = item.get('value') or {}
            refs = [sources[x] for x in item.get('sources') or [] if x in sources]
            if isinstance(value.get('name'), str) and refs:
                entries.append({'section': 'rivals', 'text': value['name'], 'sources': refs})
        return {'club_id': club_id, 'status': 'partial-core', 'entries': entries,
                'research_gaps': 'No reviewed supporter-culture profile is available; use only the approved archive context and do not invent a club voice.'}
    if world.get('clubId') != club_id:
        return {'club_id': club_id, 'status': 'unavailable', 'entries': []}
    entries = []
    for section in ('nicknames', 'ground', 'founded', 'emblem', 'colours', 'terrace', 'facts', 'flavour', 'culture'):
        items = world.get(section) or []
        for item in items if isinstance(items, list) else [items]:
            if not isinstance(item, dict):
                continue
            source_list = [x for x in item.get('sources') or [] if isinstance(x, dict) and str(x.get('url', '')).startswith('https://')]
            pubs = {str(x.get('publisher') or '').casefold().strip() for x in source_list if x.get('publisher')}
            line = item.get('line') or item.get('text')
            if not isinstance(line, str) or len(pubs) < 2 or item.get('confidence', 0) < 2:
                continue
            entries.append({'section': section, 'text': line[:350], 'sources': source_list[:5]})
    return {'club_id': club_id, 'status': 'reviewed-context', 'review': world.get('review'),
            'voice': world.get('voice') or {}, 'entries': entries[:35], 'research_gaps': world.get('note') or ''}

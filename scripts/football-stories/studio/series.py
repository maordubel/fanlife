"""The brand book of every series the studio makes (owner, 8.11.2026: "keep the perfect branding of every subject on
its own, with the right hook"). One place says, per series, what it promises, how it hooks, how it is titled, how its
thumbnail looks, how it looks and sounds — the writers, the Flow pack and the desk read it from here, so a CLASSIFIED
FILE never sounds like an I WAS THERE vlog and an animated Short never looks like a documentary.

The Shorts writer (studio/flowkit.py) reads its rules from here; studio/tests/test_studio_system.py holds every series to
a full entry. The narrator follows the series too: the documentary narrator (Gemini Charon, Kokoro George), the Shorts
storyteller (Gemini Puck, Kokoro Michael), CLASSIFIED's George (the owner's Take B).
"""
from __future__ import annotations

SERIES: dict[str, dict] = {
    'documentary': {
        'name': 'Football Stories',
        'tag': 'FAN LIFE · FOOTBALL STORIES',
        'promise': 'One club, one night or one season, told from the archive: what happened, why it mattered, who was there.',
        'hook': 'Open on the moment the story turns (the goal, the whistle, the empty stand), then the question the film '
                'answers. The die-hard\'s pride ("you think you know this night") or the absurd made plain ("it really happened").',
        'title': 'The club or the player first, one concrete detail, one tension the film resolves; under 60 characters.',
        'thumbnail': 'A face cut-out or the supporter from behind, a newspaper cutting with the real headline, the score '
                     'or the date big; the club\'s own colours, never a rival\'s.',
        'look': 'The owner\'s drawn library and the archive, cut on the narrator, maps and scoreboards drawn by the studio.',
        'sound': 'The documentary narrator, the owner\'s music under him, the real crowd where the archive has a goal.',
        'length': '8–14 minutes',
    },
    'classified': {
        'name': 'CLASSIFIED',
        'tag': 'FAN LIFE · CLASSIFIED',
        'promise': 'The strangest true stories in football, opened like a case file: the evidence, the versions, the verdict.',
        'hook': 'Is-this-real: the absurd fact said straight in the first line ("A sheikh walked onto the pitch and the goal '
                'was taken back"). Never a question you cannot answer from the file.',
        'title': 'The absurd fact in under 60 characters, the name inside it, no "you won\'t believe".',
        'thumbnail': 'The case board: the owner\'s panel as a pinned print, red string, a CLASSIFIED stamp, one word.',
        'look': 'VOX case board (comic/casefile.py): the owner\'s panels, still prints, string, the stamp once per chapter.',
        'sound': 'A low, close narrator; room tone; one stamp; no music under the evidence.',
        'length': '6–10 minutes',
    },
    'vlog': {
        'name': 'I WAS THERE',
        'tag': 'FAN LIFE · I WAS THERE',
        'promise': 'A supporter\'s own day at the match, filmed by him, framed by the archive.',
        'hook': 'The terrace, the noise, the first person: "I was in Gate 21 when…" — the moment, then the day that led to it.',
        'title': 'Club v Club, the score, the feeling in a few words, then "| I WAS THERE".',
        'thumbnail': 'The owner\'s own frame from the stand, the score huge, I WAS THERE as a stamp.',
        'look': 'The owner\'s footage first, the archive card for the match, the episode number.',
        'sound': 'The real stand, the owner\'s voice or the narrator, the crowd kept loud.',
        'length': '3–8 minutes',
    },
    'short': {
        'name': 'Animated Shorts',
        'tag': 'FAN LIFE · SHORTS',
        'promise': 'One true football story in under 30 seconds, acted by cartoon players in the story\'s real colours.',
        'hook': 'The premise in the first two seconds, readable as a thumbnail ("This bottle of water knocked Brazil out of '
                'a World Cup."). The die-hard\'s pride or the absurd. One picture per sentence; the payoff on the last words; '
                'the last line loops to the first.',
        'title': 'The hook in under 60 characters, the club or the player named.',
        'thumbnail': 'The first frame: the object or the man of the hook, big, in the cartoon style.',
        'look': 'Google Flow (the owner\'s AI Pro plan): Nano Banana character sheets, Omni Flash clips, 9:16, cut by '
                'studio/cartoon/flowcut.py with captions in the house face and one stamp.',
        'sound': 'A friendly narrator (not the documentary voice), the clips\' own sound, the owner\'s music ducked.',
        'length': '20–30 seconds',
        'flow_style': ('2D animated cartoon in exactly the style of the reference characters: bold clean dark outlines, flat '
                       'cel colours with soft painted shading, expressive faces, slightly exaggerated proportions, a richly '
                       'painted background with strong depth and cinematic light'),
        'flow_still_style': ('A frame from a 2D animated cartoon (bold clean dark outlines, flat cel colours with soft painted '
                             'shading, a richly painted background), vertical 9:16'),
        'flow_sheet_style': ('Character design sheet for a 2D animated cartoon (bold clean dark outlines, flat cel colours with '
                             'soft painted shading, expressive face, slightly exaggerated proportions, big readable silhouette). '
                             'Full body, head to boots, standing three-quarter view, on a plain warm light-grey background'),
    },
    'promo': {
        'name': 'FAN LIFE promos',
        'tag': 'FAN LIFE',
        'promise': 'What FAN LIFE and the channel are, shown in 20–30 seconds, every claim true.',
        'hook': 'The fan\'s pride ("You think you know your club?") or the surprising true thing, then one call to action.',
        'title': 'What the viewer gets, in under 60 characters.',
        'thumbnail': 'The feature itself, the FAN LIFE mark.',
        'look': 'The illustrated library or Flow clips; the FAN LIFE mark at the end.',
        'sound': 'The friendly narrator, the owner\'s music.',
        'length': '20–30 seconds',
    },
}


def of(kind: str) -> dict:
    return SERIES.get(kind) or SERIES['documentary']


def brief_for_writer(kind: str) -> str:
    """The series' own rules, as the writer reads them."""
    s = of(kind)
    return (f"SERIES — {s['name']} ({s['tag']}). Promise: {s['promise']}\nHOOK: {s['hook']}\nTITLE: {s['title']}\n"
            f"THUMBNAIL: {s['thumbnail']}\nLENGTH: {s['length']}")

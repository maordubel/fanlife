"""The house screenwriters (studio/house.py): a whole script written in code from the evidence ledger, no model.

How a house writer works — the same way a good documentary writer works with a stats book open on the desk:

  1  READ    the story block the record proves (studio/director.story): the shape of the season, its moments ranked
             (finals, deciders, derbies, comebacks, late winners, biggest wins and worst defeats), its runs, the turning
             point, the three acts, the honours, the season summary per competition.
  2  CHOOSE  the cold open (the strongest moment, its result withheld), the chapters (the acts of a season, the legs of a
             tie, the eras of a rivalry) and, inside each chapter, the matches that carry it — by the moment's weight.
  3  WRITE   every chapter as a mini-drama (script.mini_drama): what the club WANTS, what stands in the way, the CLOCK,
             the TURN, the PAYOFF, and a cliff edge into the next chapter. The opening's question is answered after the
             midpoint, on the scoreboard. Three voices: the Chronicler (linear, urgent), the Terrace Poet ("we", warm),
             the Myth-Maker (cold open on a trailer card, non-linear, rhetorical).
  4  CUT     to the length the record carries: the lowest-weighted match beats go first; a film is made shorter, never
             padded (docs/rules/writer-salvage.md).
  5  CHECK   with the writer's own validation; a beat the checks refuse is cut, and studio/salvage.py repairs the rest
             honestly. A script that cannot pass is not handed over.

The words around the facts are craft, not facts: a want, a clock, a turn, a question. Every number, score, date, name and
competition in a sentence comes from a claim the beat cites (script.fact_guard holds that, line by line).
"""
from __future__ import annotations

import copy
import hashlib
import random
import re

from .common import StageError
from .script import (CLOCKED, FILM_WORDS_PER_MINUTE, MONTHS, OBSTACLE, PAYOFF_VISUALS, RESULT_CUES, TURNED, WANT, film_kind, scorelines,
                     story_of, target_words, validate_script)

FLOOR_MINUTES = 1.0       # below this the record carries no film
LIBRARY = ('terrace-crowd', 'tunnel', 'supporter', 'terrace-empty')
_BEAT_AT = re.compile(r'Chapter (\d+) beat (\d+):')
_SENT = re.compile(r'(?<=[.!?])\s+')


# ── the record, read once ─────────────────────────────────────────────────────────────────────────────────────────────
def spoken(name: str | None) -> str:
    """A name as the narrator says it, with no full stop inside it (a sentence ends at a full stop: "St. Pauli" broke
    the hook's sentence count; the owner prefers "Saint Pauli", 13.11.2026)."""
    n = str(name or '').strip()
    n = re.sub(r'\bSt\.\s*', 'Saint ', n)
    return re.sub(r'\.(?=\S)', '', n).replace('.', '')


def day(d: str) -> str:
    return f'{int(d[8:10])} {MONTHS[int(d[5:7]) - 1]} {d[:4]}'


def month(d: str) -> str:
    return f'{MONTHS[int(d[5:7]) - 1]} {d[:4]}'


class Book:
    """The ledger as a writer reads it."""

    def __init__(self, ledger: dict, kind: str):
        self.ledger, self.kind = ledger, kind
        self.club = spoken(ledger.get('club_name')) or 'the club'
        self.season = str(ledger.get('season') or '')
        self.by = {c['id']: c for c in ledger.get('claims') or []}
        self.story = story_of(ledger) if any((c.get('fact') or {}).get('kind') == 'match' for c in self.by.values()) else {}
        self.matches = [m for m in self.story.get('matches') or [] if m['id'] in self.by]
        self.order = {m['id']: i for i, m in enumerate(self.matches)}
        self.mstory = {m['id']: m for m in self.matches}
        self.moments = [m for m in self.story.get('moments') or [] if m['id'] in self.mstory]
        self.weight = {m['id']: m['weight'] for m in self.moments}
        self.why = {m['id']: m['why'] for m in self.moments}
        self.runs = list(self.story.get('runs') or [])
        self.honours = [h for h in self.story.get('honours') or [] if h.get('id') in self.by]
        comps = (ledger.get('summary') or {}).get('by_competition') or {}
        self.comps = comps
        self.main = ('All competitions' if 'All competitions' in comps else
                     max(comps, key=lambda k: comps[k].get('played', 0)) if comps else None)
        self.top = self.moments[0]['id'] if self.moments else (self.matches[-1]['id'] if self.matches else None)
        self.quotes = [c for c in self.by.values() if (c.get('fact') or {}).get('kind') == 'quote' and c['fact'].get('text')]

    def f(self, mid: str) -> dict:
        return self.by[mid]['fact']

    def opp(self, mid: str) -> str:
        return spoken(self.f(mid).get('opponent')) or 'the opposition'

    def score(self, mid: str) -> str:
        f = self.f(mid)
        a, b = f['club_goals'], f['opponent_goals']
        return f'{max(a, b)}–{min(a, b)}'

    def comp(self, mid: str, stage: bool = True) -> str:
        f = self.f(mid)
        c = spoken(f.get('competition'))
        st = str(f.get('stage') or '').strip()
        return f'{c}, {st.lower() if st[:1].isupper() and not st.split()[0].isupper() else st}' if stage and st else c

    def scorers(self, mid: str) -> list[dict]:
        return [s for s in self.f(mid).get('scorers') or [] if isinstance(s, dict) and s.get('name') and isinstance(s.get('minute'), int)
                and not s.get('own_goal')]

    def goal_index(self, mid: str) -> int | None:
        sc = self.f(mid).get('scorers') or []
        for i, s in enumerate(sc):
            if isinstance(s, dict) and isinstance(s.get('minute'), int):
                return i
        return None

    def tags(self, mid: str) -> list[str]:
        return list(self.mstory.get(mid, {}).get('tags') or [])

    def outcome(self, mid: str) -> str:
        return self.f(mid)['outcome']

    def through(self, mid: str):
        return self.mstory.get(mid, {}).get('through')

    def venue(self, mid: str) -> str | None:
        v = self.f(mid).get('venue')
        v = v.get('name') if isinstance(v, dict) else v
        return spoken(v) if isinstance(v, str) and v.strip() else None

    def run_ids(self, run: dict) -> list[str]:
        a, b = self.order.get(run.get('from')), self.order.get(run.get('to'))
        return [m['id'] for m in self.matches[a:b + 1]] if a is not None and b is not None and b >= a else []

    def tally(self, ids: list[str]) -> dict:
        fs = [self.f(i) for i in ids if i in self.by]
        return {'n': len(fs), 'w': sum(f['outcome'] == 'win' for f in fs), 'd': sum(f['outcome'] == 'draw' for f in fs),
                'l': sum(f['outcome'] == 'loss' for f in fs), 'gf': sum(f['club_goals'] for f in fs), 'ga': sum(f['opponent_goals'] for f in fs)}


# ── the three voices ─────────────────────────────────────────────────────────────────────────────────────────────────
# Word banks per writer. A line here is craft — a want, an obstacle, a clock, a turn, a question — and holds no fact.
VOICE = {
    'chronicler': {
        'who': '{club}', 'they': 'they',
        'want': ['What {club} needed now was simple: results, and fast.', '{club} had one job in this stretch, and it had to be done before the run-in.',
                 '{club} needed wins, and needed them now.', 'Every match from here had to count for {club}.'],
        'obstacle': ['But nothing about it came easy.', 'But the fixture list had other ideas.', 'Yet every side they met wanted the same thing.',
                     'But the opposition had not read the script.', 'But doubt was never far away.'],
        'clock': ['And the weeks were running out.', 'The clock on the season kept moving, match after match.', 'Before long, there would be no time left to fix anything.'],
        'turn': ['Then everything changed.', 'Then came the night that turned it.', 'Until one match tipped the whole season.', 'Then, out of nowhere, a change.',
                 'Until that night, nobody saw it coming.', 'Then the momentum swung.'],
        'cliff': ['So what would the next stretch bring?', 'Could they hold on to it?', 'And what was waiting next?', 'How long could it last?'],
        'end': ['That was the season, every match of it on the record.', 'The final whistle of the season blew on all of it.'],
        'win': ['{who} beat {opp} {score}.', '{who} won {score} against {opp}.', '{who} defeated {opp} {score}.'],
        'draw': ['{who} drew {score} with {opp}.', '{who} were held {score} by {opp}.'],
        'loss': ['{who} lost {score} to {opp}.', '{who} suffered a {score} defeat against {opp}.', '{who} were beaten {score} by {opp}.'],
        'joy': ['At last, the release.', 'That was the roar the whole season had waited for.', 'Finally, the night belonged to them.',
                'The stadium shook with it.', 'Job done, and the whole ground knew what it meant.', 'A statement, and everyone heard it.'],
        'grief': ['The silence afterwards said everything.', 'It hurt, and everyone knew it.', 'There was nothing left to say on the way home.',
                  'A night to forget, and nobody could.'],
        'level': ['Nothing settled, everything still to play for.', 'A point, and a question left hanging.', 'Honours even, and the pressure only grew.'],
        'streak': ['Week after week, nobody could find a way past them.', 'The kind of run supporters count on their fingers.', 'Momentum, at last.'],
        'slump': ['And nobody could find the way out.', 'Every week the same question, and no answer.'],
        'chapters': {'Act I': 'The Start', 'Act II': 'The Middle', 'Act III': 'The Run-In', 'Epilogue': 'The Verdict'},
        'cams': ('push', 'whip', 'pull'),
        'visuals': ('score', 'goal', 'versus', 'matchday', 'score', 'ticket'),
        'art': ('tunnel', 'terrace-crowd'),
    },
    'poet': {
        'who': 'we', 'they': 'we',
        'want': ['All we wanted was a reason to believe again.', 'We needed a run, and we needed it before the spring.', 'We were chasing something, and every one of us could feel it.',
                 'What we wanted was simple: to go home happy, week after week.'],
        'obstacle': ['But this is our club, and nothing is ever simple.', 'But every ground we went to wanted to stop us.', 'Only, the other lot had read the same script.',
                     'But we have been here before, and it never ends simply.', 'But hope is a dangerous thing for supporters like us.'],
        'clock': ['And the weeks went by faster than the trains home.', 'Before we knew it, the season was running out under our feet.', 'Every weekend left felt like the last one.'],
        'turn': ['Then something changed on the terraces.', 'Then came a night we still talk about.', 'Until, out of nowhere, it turned.',
                 'Then, just when we had stopped expecting it, it changed.', 'Until one evening made us believe again.', 'Then the songs got louder.'],
        'cliff': ['So, would we dare to hope?', 'And what was waiting for us next?', 'Could it really be happening?', 'Would it last?'],
        'end': ['And that is how we remember it, every match of it.', 'We kept the ticket stubs. The record keeps the rest.'],
        'win': ['we beat {opp} {score}.', 'we won {score} against {opp}.', 'we defeated {opp} {score}.'],
        'draw': ['we drew {score} with {opp}.', 'we were held {score} by {opp}.'],
        'loss': ['we lost {score} to {opp}.', 'we suffered a {score} defeat against {opp}.', 'we were beaten {score} by {opp}.'],
        'joy': ['And we sang all the way home.', 'Nobody in our end wanted to leave.', 'That night, we were the happiest people in the world.',
                'Strangers hugging in the stand, every one of us.', 'We did not want that night to end.'],
        'streak': ['Every weekend the same feeling: we could not lose.', 'We started to believe, and we were right to.', 'Week after week, we kept turning up and they kept delivering.'],
        'slump': ['And still we went, every single week.', 'We kept going anyway. That is what we do.'],
        'grief': ['A long, quiet way home.', 'We went home with our heads down, and came back the next week anyway.', 'Nobody said much on the way home.'],
        'level': ['A point, a shrug, and back on the road.', 'Not a win, not a defeat, and still all to play for.'],
        'chapters': {'Act I': 'Setting Off', 'Act II': 'On The Road', 'Act III': 'Coming Home', 'Epilogue': 'What It Meant'},
        'cams': ('drift', 'slow', 'pull'),
        'visuals': ('ticket', 'score', 'matchday', 'score', 'versus'),
        'art': ('terrace-crowd', 'supporter', 'terrace-empty'),
    },
    'mythmaker': {
        'who': '{club}', 'they': 'they',
        'want': ['Every great story needs a hunger. This one had it.', 'They wanted it. They needed it. They would have to take it.',
                 'Glory does not wait. {club} had to go and take it.'],
        'obstacle': ['But legends are never handed anything.', 'But every hero meets a wall.', 'Yet the gods of football had other plans.',
                     'But glory has a price.', 'Yet the shadows were gathering.'],
        'clock': ['And the clock was ticking.', 'Time was the enemy now.', 'Before the end, there would be one last test.'],
        'turn': ['Then the story turned.', 'Then, the twist.', 'Until one night rewrote everything.', 'Then fate stepped in.',
                 'Until the moment everything changed.', 'Then the tide turned.'],
        'cliff': ['What happens when everything is on the line?', 'Would the legend hold?', 'And then?', 'Who would blink first?'],
        'end': ['Some seasons are played. This one was told.', 'The record keeps the scores. The terrace keeps the myth.'],
        'win': ['{who} beat {opp} {score}.', '{who} won {score} against {opp}.'],
        'draw': ['{who} drew {score} with {opp}.', '{who} were held {score} by {opp}.'],
        'loss': ['{who} lost {score} to {opp}.', '{who} were beaten {score} by {opp}.'],
        'joy': ['And the roar. Oh, the roar.', 'Glory, at last.', 'And the night was theirs.', 'A night carved into the club for ever.'],
        'streak': ['Unstoppable.', 'Nobody could touch them.', 'A force, not a team.'],
        'slump': ['Darkness, week after week.', 'The fall seemed to have no floor.'],
        'grief': ['Silence. Only silence.', 'A wound that would take years to close.', 'The dream, broken.'],
        'level': ['Neither side could break the other.', 'A stalemate, and the tension only grew.'],
        'chapters': {'Act I': 'Origins', 'Act II': 'The Trial', 'Act III': 'The Reckoning', 'Epilogue': 'Legacy'},
        'cams': ('orbit', 'slow', 'push', 'whip'),
        'visuals': ('versus', 'goal', 'score', 'matchday'),
        'art': ('tunnel', 'terrace-crowd', 'supporter'),
    },
}
# The release, said out loud: two words of joy and two of release in one line (studio/drama.read reads them), so the
# score sheet hears the joy the record proves — said only after a win or a tie won.
JOY = {'chronicler': ['At last! The roar, the celebrations, the joy of it: finally, {done}.',
                      'And then the whistle. At last, {done}: the celebrations, the joy, the roar of a whole ground.'],
       'poet': ['At last, the roar! We sang all the way home, dancing, celebrating: finally, {done}.',
                'And then the whistle, and the joy. {Done}, and we celebrated all night: at last.'],
       'mythmaker': ['Glory, at last. The roar erupted, the celebrations began: finally, {done}.',
                     'And then: the whistle, the roar, the joy. At last, {done}. Glory.']}
# Lines for a film about one match or one tie (a season's words — "the run-in", "match after match" — do not fit it).
MATCH_VOICE = {
    'chronicler': {'want': ['What {club} needed was simple: a result on the night.', '{club} had to win this one, and everyone in the ground knew it.'],
                   'clock': ['Kick-off was getting closer.', 'Ninety minutes, and no time to waste.', 'The minutes ticked towards kick-off.',
                             'Before the whistle, nothing was certain.', 'The last minutes before kick-off dragged.'],
                   'cliff': ['So what would happen when the whistle blew?', 'Who would blink first?', 'Could they do it?'],
                   'end': ['That was the night, every minute of it on the record.', 'The final whistle settled it for good.']},
    'poet': {'want': ['All we wanted was ninety minutes to remember.', 'We needed this one, and every one of us knew it.'],
             'clock': ['The walk to the ground never felt longer.', 'Kick-off was coming, and our hearts were going.',
                       'The last hours before the match crawled by.', 'Before the whistle, we could hardly breathe.', 'Minutes to go, and the songs got louder.'],
             'cliff': ['So, would it be our night?', 'Could we dare to believe?'],
             'end': ['We still talk about it. The record keeps the rest.', 'And that is how we remember that night.']},
    'mythmaker': {'want': ['They wanted it. They needed it. They would have to take it.', 'One night to win, and nothing else mattered.'],
                  'clock': ['The clock was ticking.', 'Ninety minutes. No more.', 'Time, the oldest enemy.', 'Before the whistle, silence.'],
                  'cliff': ['Who would still be standing at the final whistle?', 'And then?'],
                  'end': ['Some nights are played. This one was told.', 'The record keeps the score. The terrace keeps the myth.']},
}
ROLE_TITLE = {'the setup': 'The Setup', 'the fall': 'The Fall', 'the recovery': 'The Recovery', 'the rise': 'The Rise',
              'the struggle': 'The Struggle', 'the turn': 'The Turn', 'the charge': 'The Charge', 'the good times': 'The Good Times',
              'the run-in': 'The Run-In', 'the march': 'The March', 'the climax': 'The Climax', 'the slide': 'The Slide', 'the grind': 'The Grind'}
SHAPE = {'fall-and-recovery': 'fell apart and came back', 'rise-and-fall': 'climbed and then fell', 'turn-up': 'began in a struggle and turned',
         'turn-down': 'began well and then turned', 'rise': 'climbed, match after match', 'fall': 'slid, match after match', 'steady': 'ground on, week after week'}
WHY = {'final': 'a final', 'title-decided': 'the night the title was decided', 'comeback': 'a comeback', 'late-winner': 'a late winner',
       'decider': 'a decider', 'derby': 'the derby', 'turning-point': 'the turning point', 'biggest-win': 'the biggest win of the season',
       'worst-defeat': 'the worst defeat of the season', 'europe': 'a European night', 'streak-start': 'the start of a run', 'streak-end': 'the end of a run'}


class Pen:
    """One writer's hand over one book."""

    def __init__(self, writer: str, book: Book, seed: str):
        self.w, self.b = writer, book
        self.v = {**VOICE[writer], **(MATCH_VOICE[writer] if book.kind in ('match', 'tie') else {})}
        self.rng = random.Random(int(hashlib.sha256(f'{writer}|{seed}'.encode()).hexdigest()[:12], 16))
        self.used: set[str] = set()
        self.k = 0

    def pick(self, key: str, **kw) -> str:
        opts = [o for o in self.v[key] if o not in self.used] or self.v[key]
        s = self.rng.choice(opts)
        self.used.add(s)
        return self.fill(s, **kw)

    def fill(self, s: str, **kw) -> str:
        kw.setdefault('club', self.b.club)
        out = s.format(**kw)
        return out[:1].upper() + out[1:]

    def who(self) -> str:
        return self.fill(self.v['who'])

    def result(self, mid: str) -> str:
        b = self.b
        return self.pick(b.outcome(mid), who=self.who(), opp=b.opp(mid), score=b.score(mid))

    def cam(self) -> str:
        self.k += 1
        return self.v['cams'][self.k % len(self.v['cams'])]

    def art(self) -> str:
        return self.v['art'][self.rng.randrange(len(self.v['art']))]


# ── beats ────────────────────────────────────────────────────────────────────────────────────────────────────────────
def beat(narration: str, ids: list[str], visual: dict, weight: float = 0.5, req: bool = False, **kw) -> dict:
    b = {'narration': ' '.join(narration.split()), 'claim_ids': list(dict.fromkeys(i for i in ids if i)), 'visual': visual, **kw}
    b['_w'], b['_req'] = weight, req
    return b


def match_visual(pen: Pen, mid: str, prefer: str | None = None) -> dict:
    b = pen.b
    kinds = [prefer] if prefer else []
    kinds += list(pen.v['visuals'][pen.k % len(pen.v['visuals']):]) + list(pen.v['visuals'])
    for t in kinds:
        if t == 'goal':
            i = b.goal_index(mid)
            if i is not None:
                return {'type': 'goal', 'claim': mid, 'scorer': i}
            continue
        if t in ('score', 'versus', 'matchday', 'ticket'):
            v = {'type': t, 'claim': mid}
            if t in ('matchday', 'ticket'):
                v['backdrop'] = pen.art()
            return v
    return {'type': 'score', 'claim': mid}


def joy_beat(pen: Pen, mid: str) -> dict | None:
    f = pen.b.f(mid)
    if f['outcome'] != 'win' and pen.b.through(mid) is not True:
        return None
    won = f['outcome'] == 'win'
    done = ('we had won it' if won else 'we were through') if pen.w == 'poet' else ('they had won it' if won else 'they were through')
    line = JOY[pen.w][pen.rng.randrange(len(JOY[pen.w]))].format(done=done, Done=done[:1].upper() + done[1:])
    return beat(line, [mid], {'type': 'illustration', 'art': 'supporter' if pen.w == 'poet' else 'terrace-crowd', 'caption': ''}, 1.0, True,
                camera='orbit' if pen.w == 'mythmaker' else 'push', sfx='roar', pace='fast')


def match_beat(pen: Pen, mid: str, lead: str = '', weight: float = 0.5, req: bool = False, payoff: bool = False, bare: bool = False) -> dict:
    """One match told: when, where, the competition, the result, the scorers (with their minutes), and its feeling."""
    b = pen.b
    f = b.f(mid)
    tags = b.tags(mid)
    bits = [lead] if lead else []
    where = 'at home' if f.get('side') == 'home' else 'away' if f.get('side') == 'away' else ''
    v = b.venue(mid)
    place = f'at {v}' if v else where
    when = day(f['date']) if f.get('date') else ''
    form = pen.rng.randrange(3)
    if bare:
        bits.append(pen.result(mid))
    elif 'derby' in tags:
        bits.append(f'{b.opp(mid)} — the derby — {when}{", " + place if place else ""}.')
        bits.append(pen.result(mid))
    elif 'final' in tags:
        bits.append(f'The {b.comp(mid, stage=False)} final, {when}{", " + place if place else ""}.')
        bits.append(pen.result(mid))
    elif form == 0:
        bits.append(f'{when}{", " + place if place else ""}, {b.comp(mid)}.')
        bits.append(pen.result(mid))
    elif form == 1:
        r = pen.result(mid)
        bits.append(f'{b.comp(mid)}, {when}{", " + place if place else ""}: {r[:1].lower() + r[1:] if not r.startswith(b.club) else r}')
    else:
        bits.append(f'{(place[:1].upper() + place[1:] + ", ") if place else ""}{when}, {b.comp(mid)}.')
        bits.append(pen.result(mid))
    sc = b.scorers(mid)
    if sc:
        names = [f'{spoken(s["name"])} on {s["minute"]} minutes' for s in sc[:3]]
        bits.append(('The goals: ' if len(sc) > 1 else 'The goal: ') + ', '.join(names) + '.')
    thr = b.through(mid)
    us = 'we were' if pen.w == 'poet' else f'{b.club} were'
    if thr is True:
        bits.append(f'And {us} through.')
    elif thr is False:
        bits.append(f'And {us} out.')
    if payoff or 'final' in tags or weight >= 0.55:
        mood = 'joy' if (f['outcome'] == 'win' or thr is True) else 'grief' if (f['outcome'] == 'loss' or thr is False) else 'level'
        bits.append(pen.pick(mood))
    vis = match_visual(pen, mid, 'score' if payoff else None)
    extra = {'camera': pen.cam()}
    if vis['type'] == 'goal' or (payoff and f['outcome'] == 'win'):
        extra.update({'sfx': 'roar', 'pace': 'fast' if pen.w != 'poet' else 'normal'})
    elif f['outcome'] == 'loss':
        extra.update({'sfx': 'groan', 'pace': 'slow'})
    if 'europe' in tags and f.get('side') == 'away':
        vis['prop'] = 'passenger_plane'
    elif pen.w == 'poet' and f.get('side') == 'away' and vis['type'] in ('ticket', 'matchday'):
        vis['prop'] = 'supporters_bus'
    return beat(' '.join(x for x in bits if x), [mid], vis, weight, req, **extra)


def tally_line(pen: Pen, ids: list[str], lead: str = '') -> str:
    t = pen.b.tally(ids)
    if t['n'] < 2:
        return lead
    parts = [f'{t["n"]} matches']
    parts.append(', '.join(x for x in (f'{t["w"]} won' if t['w'] else '', f'{t["d"]} drawn' if t['d'] else '', f'{t["l"]} lost' if t['l'] else '') if x))
    goals = f'{t["gf"]} goals scored, {t["ga"]} conceded.'
    return f'{lead} {parts[0]}: {parts[1]}. {goals}'.strip()


# ── chapters ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def chapter_card(pen: Pen, n: int, title: str, ids: list[str], first_mid: str | None) -> dict:
    """The chapter's first beat: the card, the WANT, and what the stretch holds (counted from its matches)."""
    b = pen.b
    span = ''
    if ids:
        d0, d1 = b.f(ids[0])['date'], b.f(ids[-1])['date']
        span = f'From {month(d0)} to {month(d1)}.' if d0[:7] != d1[:7] else f'{month(d0)}.'
    line = tally_line(pen, ids, span)
    want = pen.pick('want')
    return beat(f'{want} {line}', ids, {'type': 'chapter', 'number': n, 'title': title, 'backdrop': 'paper'}, 1.0, True,
                camera=pen.cam())


def cliff_beat(pen: Pen, ids: list[str] | None = None) -> dict:
    """The chapter's cliff edge: an obstacle or a clock, then the question the next chapter answers."""
    return beat(f"{pen.pick('clock')} {pen.pick('cliff')}", ids or [], {'type': 'illustration', 'art': pen.art(), 'caption': ''}, 1.0, True,
                camera=pen.cam(), pace='slow')


def run_beat(pen: Pen, run: dict) -> dict | None:
    ids = pen.b.run_ids(run)
    if len(ids) < 3:
        return None
    b = pen.b
    what = {'unbeaten': 'without a defeat', 'wins': 'won in a row', 'winless': 'without a win', 'losses': 'lost in a row'}.get(run.get('kind'), '')
    if not what:
        return None
    label = {'unbeaten': 'Unbeaten run', 'wins': 'Winning run', 'winless': 'Without a win', 'losses': 'Losing run'}[run['kind']]
    good = run['kind'] in ('unbeaten', 'wins')
    text = (f'{len(ids)} matches {what}, from {b.opp(ids[0])} on {day(b.f(ids[0])["date"])} to {b.opp(ids[-1])} on {day(b.f(ids[-1])["date"])}. '
            + (pen.pick('streak') if good else pen.pick('slump')))
    return beat(text, [i for i in ids if i != b.top] + ['story'], {'type': 'run', 'claims': ids, 'label': label}, 0.9, False, camera=pen.cam())


ROAD = ('The road ran through {cities}.', 'Away from home, the journey ran through {cities}.', 'The trips that stretch took: {cities}.',
        'On the road: {cities}.')


def road_beat(pen: Pen, ids: list[str], req: bool = False) -> dict | None:
    """The stretch's away journeys, city after city, in date order (the place book's cities: studio/maps.place_of) —
    the film flies them on the atlas (docu/atlas.py). Only when at least two cities away from home are on record."""
    from .maps import city_of, place_of
    b = pen.b
    raw = str(b.ledger.get('club_name') or '')
    home = city_of(raw)
    cities, mids = [], []
    for mid in sorted(ids, key=lambda i: b.order.get(i, 0)):
        f = b.f(mid) if mid in b.by else {}
        if f.get('kind') != 'match' or f.get('side') != 'away':
            continue
        there = place_of(f, raw)
        far = not home or abs(there[1][0] - home[1][0]) + abs(there[1][1] - home[1][1]) > 1.0 if there else False
        if there and far and there[0] not in cities:   # a derby across the city is not a journey
            cities.append(there[0])
            mids.append(mid)
    if len(cities) < 2:
        return None
    cities, mids = cities[:4], mids[:4]
    names = ', '.join(cities[:-1]) + ' and ' + cities[-1]
    line = ROAD[pen.rng.randrange(len(ROAD))].format(cities=names)
    return beat(f'{line} {pen.pick("obstacle")}', mids, {'type': 'map', 'claims': mids, 'label': 'On the road'}, 0.85, req, camera=pen.cam())


def form_beat(pen: Pen, ids: list[str], label: str) -> dict | None:
    ids = sorted(dict.fromkeys(ids), key=lambda i: pen.b.order.get(i, 0))[:12]
    if len(ids) < 3:
        return None
    t = pen.b.tally(ids)
    text = f'Read the form across those weeks and it tells you everything: {t["w"]} wins, {t["d"]} draws, {t["l"]} defeats. {pen.pick("obstacle")}'
    return beat(text, [i for i in ids if i != pen.b.top], {'type': 'form', 'claims': ids, 'label': label[:40]}, 0.85, False, camera=pen.cam())


def race_beat(pen: Pen, mark: list[str]) -> dict | None:
    b = pen.b
    if len(b.matches) < 3:
        return None
    shape = SHAPE.get(b.story.get('shape') or '', 'went its own way')
    text = f'Count the wins, take away the defeats, and draw the line: this was a season that {shape}. {pen.pick("clock")}'
    return beat(text, ['story'], {'type': 'race', 'label': 'The season, match by match', 'mark': mark[:4]}, 0.95, True, camera=pen.cam())


def pick_matches(book: Book, ids: list[str], exclude: set[str], k: int) -> list[str]:
    """The matches that carry a stretch: the strongest moments first, then the tagged nights, in date order."""
    def w(i):
        tags = book.tags(i)
        return book.weight.get(i, 0) + 0.08 * len([t for t in tags if t not in ('first', 'last', 'streak-start', 'streak-end')])
    cand = [i for i in ids if i not in exclude]
    best = sorted(cand, key=lambda i: (-w(i), book.order.get(i, 0)))[:k]
    return sorted(best, key=lambda i: book.order.get(i, 0))


def act_chapter(pen: Pen, n: int, act: dict, exclude: set[str], per_act: int, extra: list[dict] | None = None,
                payoff: str | None = None) -> dict:
    b = pen.b
    ids = [i for i in act['ids'] if i in b.by]
    role = (act.get('note') or '').split(':')[0].strip()
    title = ROLE_TITLE.get(role) or pen.v['chapters'].get(act['name'], act['name'])
    beats = [chapter_card(pen, n, title, ids, ids[0] if ids else None)]
    chosen = pick_matches(b, ids, exclude | ({payoff} if payoff else set()), per_act)
    tp = b.story.get('turning_point')
    told = 0
    for i, mid in enumerate(chosen):
        lead = ''
        if mid == tp:
            r = pen.result(mid)
            beats.append(beat(f'{pen.pick("turn")} {b.opp(mid)}, {day(b.f(mid)["date"])}. {r}', [mid],
                              {'type': 'turning', 'title': 'The turn', 'subtitle': f'{b.opp(mid)}, {month(b.f(mid)["date"])}'[:60], 'backdrop': pen.art()},
                              0.95, False, camera=pen.cam()))
            told += 1
            continue
        elif told == 0 and i == 0:
            lead = pen.pick('obstacle')
        elif i >= len(chosen) // 2 and not any(TURN_LEAD.match(x['narration']) for x in beats[1:]) and tp not in chosen:
            lead = pen.pick('turn')
        beats.append(match_beat(pen, mid, lead, b.weight.get(mid, 0.3)))
        told += 1
    for x in extra or []:
        if not x:
            continue
        at = min((b.order.get(i, 10 ** 6) for i in x['claim_ids']), default=10 ** 6)
        pos = next((k for k, y in enumerate(beats) if k > 0 and y['visual'].get('type') not in ('chapter',)
                    and min((b.order.get(i, 10 ** 6) for i in y['claim_ids']), default=10 ** 6) > at), len(beats))
        beats.insert(max(1, pos), x)
    if payoff:
        beats.append(match_beat(pen, payoff, pen.pick('turn'), 1.0, True, payoff=True))
        j = joy_beat(pen, payoff)
        if j:
            beats.append(j)
    return {'title': title, 'beats': beats}


TURN_LEAD = re.compile(r'^(Then|Until|But then|And then)\b')


# ── the opening ──────────────────────────────────────────────────────────────────────────────────────────────────────
def _sentences(text: str) -> list[str]:
    return [x for x in _SENT.split(text.strip()) if x.strip()]


def _words(text: str) -> int:
    return len(text.split())


def hook_sentence(pen: Pen, mid: str) -> str:
    """Sentence one: inside ten seconds, a name or a ground and a number from the record — never the score."""
    b = pen.b
    f = b.f(mid)
    sc = b.scorers(mid)
    when = day(f['date'])
    who = spoken(sc[0]['name']) if sc else b.venue(mid)
    opp = b.opp(mid)
    if pen.w == 'mythmaker':
        return f'{who + ", " if who else ""}{opp}, {when}: one night, and everything riding on it.' if who else \
            f'Ninety minutes against {opp}, {when}, and everything riding on them.'
    if pen.w == 'poet':
        return (f'{who} on the pitch, {opp} in front of us, {when}, and our hearts in our mouths.' if who
                else f'{opp} in front of us, {when}, and ninety minutes that would stay with us for ever.')
    return (f'{who}, {opp}, {when}: ninety minutes with a whole season leaning on them.' if who
            else f'{opp}, {when}: ninety minutes with a whole season leaning on them.')


STAKE = {'final': 'It was a final, and only one side would leave with anything.',
         'decider': 'It was a decider, and there was no second chance.',
         'derby': 'It was the derby, the match nobody in this city forgets.',
         'title-decided': 'It was the night the title would be decided.',
         'comeback': 'And for a long time, it looked like it was gone.',
         'late-winner': 'And it went down to the last minutes.',
         'europe': 'A European night, far from home.',
         'biggest-win': 'Nobody saw what was coming.',
         'worst-defeat': 'Nobody was ready for what was coming.',
         'turning-point': 'It was the night the season turned.'}


def hook_options(pen: Pen) -> list[dict]:
    """Three openings, 3–4 sentences and 35–60 words each, every one on its own evidence and with a question. Option 1 is
    spoken; the others are the hook judge's alternatives (studio/hook_judge.py)."""
    b = pen.b
    top = b.top
    why = b.why.get(top, 'decider')
    shape = SHAPE.get(b.story.get('shape') or '', 'went its own way')
    q = {'chronicler': f'How did a season that {shape} end up here?', 'poet': f'How did we get here, after a season that {shape}?',
         'mythmaker': f'How does a season that {shape} arrive at a night like this?'}[pen.w]
    turn = {'chronicler': 'But the answer starts long before kick-off.', 'poet': 'But to understand it, you have to go back to the start.',
            'mythmaker': 'But every legend has a beginning.'}[pen.w]
    if b.kind in ('match', 'tie'):
        q = {'chronicler': 'So how would ninety minutes decide it?', 'poet': 'So would we be the ones going home happy?',
             'mythmaker': 'Who would still be standing at the final whistle?'}[pen.w]
        turn = {'chronicler': 'But first, what was at stake.', 'poet': 'But first, how we got there.', 'mythmaker': 'But first, the stakes.'}[pen.w]
    if b.kind == 'rivalry':
        q = {'chronicler': 'So who really owns this fixture?', 'poet': 'So who has the right to sing loudest?',
             'mythmaker': 'Who rules this rivalry?'}[pen.w]
        turn = {'chronicler': 'But the answer is written across generations.', 'poet': 'But you have to go back to the start.',
                'mythmaker': 'But every rivalry has a beginning.'}[pen.w]
    s2 = STAKE.get(why, 'Nobody in the ground knew how it would end.')
    one = [hook_sentence(pen, top), s2, q, turn]
    opts = [{'text': ' '.join(one), 'claim_ids': [top]}]
    # option 2: a run, if the record has one; option 3: the second moment
    longest = max(b.runs, key=lambda r: r.get('length', 0)) if b.runs else None
    if longest and longest.get('length', 0) >= 3 and b.kind not in ('match', 'tie'):
        ids = b.run_ids(longest)
        what = {'unbeaten': 'without a defeat', 'wins': 'won in a row', 'winless': 'without a win', 'losses': 'lost in a row'}.get(longest['kind'], 'in a row')
        opts.append({'text': f'{len(ids)} matches {what}, and {b.opp(top)} still to come on {day(b.f(top)["date"])}. '
                             f'{s2} {q} {turn}', 'claim_ids': [top, 'story', *ids]})
    second = next((m['id'] for m in b.moments[1:]), None)
    if second:
        opts.append({'text': f'Remember {b.opp(second)} on {day(b.f(second)["date"])}? That night mattered. '
                             f'But {b.opp(top)} on {day(b.f(top)["date"])} mattered more, and every supporter there still remembers it. {q}',
                     'claim_ids': [top, second]})
    alt = [f'Before a ball was kicked, nobody could have written this. {b.opp(top)}, {day(b.f(top)["date"])}. {s2} {q}',
           f'Ninety minutes against {b.opp(top)} on {day(b.f(top)["date"])}, and a whole club holding its breath. {s2} {q} {turn}']
    while len(opts) < 3:
        opts.append({'text': alt[len(opts) - 1 if len(opts) - 1 < len(alt) else 0], 'claim_ids': [top]})
    for o in opts:
        o['text'] = fit_hook(o['text'], q, turn)
    seen, out = set(), []
    for o in opts:
        key = ' '.join(o['text'].lower().split())
        if key in seen:
            o['text'] = fit_hook(f'{o["text"].rstrip("?")} Who could have known?', q, turn)
        seen.add(' '.join(o['text'].lower().split()))
        out.append(o)
    return out[:3]


PAD = ['Nobody in the ground knew how it would end.', 'Every supporter there still remembers it.', 'It is still talked about today.']
CLAUSE = [', and every supporter there still remembers it', ', and nobody in the ground knew how it would end',
          ', and it is still talked about wherever supporters meet']


def fit_hook(text: str, q: str, turn: str) -> str:
    """3–4 sentences and 35–60 words, the question kept."""
    s = _sentences(text)
    while len(s) > 4:
        s.pop(1 if len(s) > 2 else 0)
    i = 0
    while len(s) < 3:
        s.insert(1, PAD[i % len(PAD)])
        i += 1
    if len(s) == 3 and _words(' '.join(s)) < 35:
        s.insert(1, PAD[i % len(PAD)])
    j = 0
    while _words(' '.join(s)) < 35 and j < len(CLAUSE):
        k = next((x for x in range(len(s)) if not s[x].endswith('?') and CLAUSE[j] not in s[x]), 0)
        s[k] = s[k].rstrip('.!') + CLAUSE[j] + '.'
        j += 1
    while _words(' '.join(s)) > 60 and len(s) > 3:
        s.pop(1)
    return ' '.join(s)


# ── the films ────────────────────────────────────────────────────────────────────────────────────────────────────────
def cold_open(pen: Pen, hook: dict) -> dict:
    """Chapter 1: the strongest moment, its result withheld; the question; then back to the start."""
    b = pen.b
    top = b.top
    s = _sentences(hook['text'])
    first, rest = ' '.join(s[:2]), ' '.join(s[2:])
    beats = []
    if pen.w == 'mythmaker':
        lines = {'final': ['One final.', 'One night.', 'No way back.'], 'derby': ['One city.', 'Two sides.', 'One night.'],
                 'decider': ['One tie.', 'One chance.', 'No second leg.']}.get(b.why.get(top, ''), ['One night.', 'Everything on it.', 'No way back.'])
        beats.append(beat(first, [top], {'type': 'trailer', 'lines': lines}, 1.0, True, camera='slow', sfx='drum'))
    else:
        beats.append(beat(first, [top], {'type': 'open', 'backdrop': pen.art(), 'headline': b.opp(top)[:60],
                                         'kicker': b.comp(top, stage=False)[:60]}, 1.0, True, camera=pen.cam()))
    beats.append(beat(rest, [top], {'type': 'matchday', 'claim': top, 'backdrop': 'tunnel'}, 1.0, True, camera=pen.cam()))
    back = {'chronicler': 'To understand that night, go back to where it all began. Who could have seen it coming?',
            'poet': 'But that night only makes sense if you know where we started. And where did we start?',
            'mythmaker': 'Rewind. Back to the beginning, when nobody knew. How did it come to this?'}[pen.w]
    if b.kind in ('match', 'tie'):
        back = {'chronicler': 'To feel what was at stake, start before kick-off. What did both sides need?',
                'poet': 'But you have to know what it meant to us. What were we hoping for?',
                'mythmaker': 'Rewind. Before the whistle. What was really on the line?'}[pen.w]
    if b.kind == 'rivalry':
        back = {'chronicler': 'To understand it, start with the first meetings. How did it all begin?',
                'poet': 'But you have to go back to the old days first. Where did it start?',
                'mythmaker': 'Rewind. Back to the first time they met. Where does a rivalry begin?'}[pen.w]
    beats.append(beat(back, [], {'type': 'turning', 'title': 'Rewind' if pen.w != 'poet' else 'Where it started', 'subtitle': 'How it came to this',
                                 'backdrop': pen.art()}, 1.0, True, camera=pen.cam(), pace='slow'))
    title = {'chronicler': 'The Night', 'poet': 'That Night', 'mythmaker': 'The Climax'}[pen.w]
    return {'title': title, 'beats': beats}


def epilogue(pen: Pen, n: int, record: str | None, honours: list[dict]) -> dict:
    b = pen.b
    beats = []
    if record:
        r = b.comps[record[8:]]
        beats.append(beat(f'{spoken(record[8:])}: {r["played"]} played, {r["won"]} won, {r["drawn"]} drawn, {r["lost"]} lost. '
                          f'{r["for"]} goals for, {r["against"]} against.', [record], {'type': 'record', 'claim': record}, 1.0, True, camera=pen.cam()))
    us = 'we' if pen.w == 'poet' else b.club
    won = [h for h in honours if h.get('result') == 'won' and h.get('competition')][:3]
    if won:
        names = [spoken(h['competition']) for h in won]
        what = names[0] if len(names) == 1 else ', '.join(names[:-1]) + ' and the ' + names[-1]
        beats.append(beat(f'And at last, when it was over, {us} had won the {what}. {pen.pick("joy")}', [h['id'] for h in won],
                          {'type': 'illustration', 'art': 'supporter', 'caption': names[0][:60], 'prop': 'generic_trophy'},
                          0.9, False, camera=pen.cam(), sfx='roar'))
    beats.append(beat(pen.pick('end'), [], {'type': 'illustration', 'art': 'terrace-empty', 'caption': ''}, 1.0, True, camera=pen.cam(), pace='slow'))
    return {'title': pen.v['chapters'].get('Epilogue', 'Epilogue'), 'beats': beats}


def ensure_joy(pen: Pen, chapters: list[dict]) -> None:
    """A film with a win in it has its moment of joy: after the best-weighted win told, when the payoff gave none."""
    b = pen.b
    if any(bt.get('sfx') == 'roar' and bt['visual'].get('type') == 'illustration' for ch in chapters for bt in ch['beats']):
        return
    wins = [(b.weight.get(bt['claim_ids'][0], 0), ci, k) for ci, ch in enumerate(chapters) for k, bt in enumerate(ch['beats'])
            if bt['visual'].get('type') in ('score', 'goal', 'versus', 'matchday', 'ticket') and bt['claim_ids']
            and bt['claim_ids'][0] in b.by and b.outcome(bt['claim_ids'][0]) == 'win' and bt['claim_ids'][0] != b.top]
    if wins:
        _, ci, k = max(wins)
        chapters[ci]['beats'][k]['_req'] = True
        chapters[ci]['beats'].insert(k + 1, joy_beat(pen, chapters[ci]['beats'][k]['claim_ids'][0]))


def season_film(pen: Pen, words_lo: int) -> list[dict]:
    b = pen.b
    acts = [a for a in b.story.get('acts') or [] if a['name'].startswith('Act')]
    if len(acts) < 3:
        return match_film(pen, words_lo)
    top = b.top
    budget = max(2, min(14, round(words_lo / 70 / 3)))   # matches per act: about seventy spoken words a match beat
    chapters = []
    mark = [x for x in [b.story.get('turning_point'), top] if x]
    runs = sorted(b.runs, key=lambda r: -r.get('length', 0))
    for k, act in enumerate(acts):
        extra = []
        for r in runs:
            if r.get('from') in act['ids'] and r.get('length', 0) >= 4:
                extra.append(run_beat(pen, r))
                break
        if k == 1:
            extra.append(race_beat(pen, mark))
        road = road_beat(pen, act['ids'], req=not any(x and x['visual'].get('type') == 'map' for ch in chapters for x in ch['beats']))
        extra.append(road)
        if k == 0:
            extra.append(form_beat(pen, pick_matches(b, act['ids'], set(), 8), ROLE_TITLE.get((act.get('note') or '').split(':')[0].strip(), 'The start')))
        ch = act_chapter(pen, len(chapters) + 2, act, {top}, budget, extra, payoff=top if k == 2 else None)
        ch['beats'].append(cliff_beat(pen, []))
        chapters.append(ch)
    ensure_joy(pen, chapters)
    record = f'summary:{b.main}' if b.main else None
    chapters.append(epilogue(pen, len(chapters) + 2, record, b.honours))
    return chapters


def match_film(pen: Pen, words_lo: int) -> list[dict]:
    """One match or the legs of a tie: the stakes, the matches goal by goal, the verdict."""
    b = pen.b
    ids = [m['id'] for m in b.matches]
    top = b.top
    chapters = []
    stakes = [chapter_card(pen, 2, {'chronicler': 'The Stakes', 'poet': 'Why It Mattered', 'mythmaker': 'The Stakes'}[pen.w], ids, ids[0])]
    first = ids[0]
    stakes.append(beat(f'{b.club} against {b.opp(first)}. {b.comp(first)}. {pen.pick("obstacle")}', [first],
                       {'type': 'versus', 'claim': first}, 1.0, True, camera=pen.cam()))
    stakes.append(cliff_beat(pen, []))
    chapters.append({'title': stakes[0]['visual']['title'], 'beats': stakes})
    for k, mid in enumerate(ids):
        f = b.f(mid)
        beats = [beat(f'{pen.pick("clock")} {day(f["date"])}, {"at home" if f.get("side") == "home" else "away"}, {b.comp(mid)}.', [mid],
                      {'type': 'chapter', 'number': len(chapters) + 2, 'title': ('The First Leg' if len(ids) == 2 and k == 0 else
                                                                                 'The Second Leg' if len(ids) == 2 else 'Ninety Minutes'),
                       'backdrop': 'paper'}, 1.0, True, camera=pen.cam())]
        if mid != top:
            beats.append(beat(f'{pen.pick("want")}', [mid], {'type': 'ticket', 'claim': mid, 'backdrop': pen.art()}, 0.6, False, camera=pen.cam()))
        sc = b.scorers(mid)
        for gi, s in enumerate(sc[:6]):
            idx = (f.get('scorers') or []).index(s)
            line = f'{s["minute"]} minutes. {spoken(s["name"])}.' + (' ' + pen.pick('turn') if gi == 0 and mid == top else '')
            beats.append(beat(line, [mid], {'type': 'goal', 'claim': mid, 'scorer': idx}, 0.9, False, camera=pen.cam(), sfx='roar', pace='fast'))
            if gi % 2 == 1:
                beats.append(beat(pen.pick('clock'), [mid], {'type': 'illustration', 'art': pen.art(), 'caption': ''}, 0.4, False, camera=pen.cam()))
        beats.append(match_beat(pen, mid, pen.pick('turn') if mid == top else '', 1.0, True, payoff=True, bare=True))
        if mid == ids[-1]:
            j = joy_beat(pen, mid)
            if j:
                beats.append(j)
        beats.append(cliff_beat(pen, []))
        chapters.append({'title': beats[0]['visual']['title'], 'beats': beats})
    ep = epilogue(pen, len(chapters) + 2, None, b.honours)
    if len(ids) > 1:
        legs = ' '.join(f'{day(b.f(i)["date"])}: {(lambda r: r[:1].lower() + r[1:] if r.startswith("We ") else r)(pen.result(i))}' for i in ids)
        ep['beats'].insert(0, beat(f'Both matches, side by side. {legs}', ids, {'type': 'score', 'claim': top}, 1.0, True, camera=pen.cam()))
    elif top:
        r = pen.result(top)
        ep['beats'].insert(0, beat(f'{b.opp(top)}, {day(b.f(top)["date"])}, in one line: {r[:1].lower() + r[1:] if r.startswith("We ") else r}',
                                   [top], {'type': 'score', 'claim': top}, 1.0, True, camera=pen.cam()))
    chapters.append(ep)
    return chapters


def rivalry_film(pen: Pen, words_lo: int) -> list[dict]:
    """Every meeting with one opponent: the eras, the great nights, the streaks, the balance."""
    b = pen.b
    ids = [m['id'] for m in b.matches]
    top = b.top
    n = len(ids)
    if n < 6:
        return match_film(pen, words_lo)
    cuts = [0, n // 3, (2 * n) // 3, n]
    budget = max(2, min(12, round(words_lo / 60 / 3)))
    chapters = []
    names = {'chronicler': ['The Early Years', 'The Middle Years', 'The Modern Era'], 'poet': ['Our Fathers\' Derbies', 'Our Derbies', 'The New Days'],
             'mythmaker': ['Origins', 'The War Years', 'The Reckoning']}[pen.w]
    runs = sorted(b.runs, key=lambda r: -r.get('length', 0))
    for k in range(3):
        era = ids[cuts[k]:cuts[k + 1]]
        if not era:
            continue
        y0, y1 = b.f(era[0])['date'][:4], b.f(era[-1])['date'][:4]
        act = {'name': f'Act {k + 1}', 'ids': era, 'note': ''}
        extra = []
        for r in runs:
            if r.get('from') in era and r.get('length', 0) >= 3:
                extra.append(run_beat(pen, r))
                break
        ch = act_chapter(pen, len(chapters) + 2, act, {top}, budget, extra, payoff=top if top in era and k == 2 else None)
        ch['title'] = f'{names[k]}' if y0 == y1 else names[k]
        ch['beats'][0]['visual']['title'] = ch['title']
        ch['beats'].append(cliff_beat(pen, []))
        chapters.append(ch)
    if not any(top in [i for bt in ch['beats'] for i in bt['claim_ids']] and bt.get('_req') and bt['visual'].get('type') == 'score'
               for ch in chapters for bt in ch['beats']):
        chapters[-1]['beats'].insert(len(chapters[-1]['beats']) - 1, match_beat(pen, top, pen.pick('turn'), 1.0, True, payoff=True))
    ensure_joy(pen, chapters)
    ep = epilogue(pen, len(chapters) + 2, f'summary:{b.main}' if b.main else None, [])
    ep['beats'].insert(1, beat(f'{b.club} against {b.opp(top)}. {pen.pick("end")}', [top], {'type': 'versus', 'claim': top}, 1.0, True,
                               camera=pen.cam()))
    ep['beats'] = [x for x in ep['beats'] if not (x['visual'].get('type') == 'illustration' and x['visual'].get('art') == 'terrace-empty')] + \
                  [beat(pen.pick('end'), [], {'type': 'illustration', 'art': 'terrace-empty', 'caption': ''}, 1.0, True, camera=pen.cam())]
    chapters.append(ep)
    return chapters


# ── the packaging ────────────────────────────────────────────────────────────────────────────────────────────────────
def titles(pen: Pen) -> list[dict]:
    b = pen.b
    top = b.top
    opp = b.opp(top)
    yr = b.f(top)['date'][:4]
    club, season = b.club, b.season
    if b.kind == 'rivalry':
        search = [f'{club} vs {opp}: The Whole Rivalry', f'{club} vs {opp} — Every Meeting, Told', f'{club} vs {opp}: The Derby History',
                  f'{club} v {opp}: The Rivalry Explained', f'{club} and {opp}: A Football Rivalry']
        disc = ['The Fixture That Never Ends', 'Who Really Owns This Derby?', 'Two Clubs, One Grudge', 'The Night That Defined A Rivalry',
                'Nobody Forgets This Fixture']
    elif b.kind in ('match', 'tie'):
        search = [f'{club} vs {opp} {yr}: The Full Story', f'{club} {opp} {yr} — What Really Happened', f'{club} vs {opp}: Match Story',
                  f'{club} v {opp} ({yr}) Explained', f'{club} {yr}: The Night Against {opp}']
        disc = ['Ninety Minutes Nobody Forgot', 'The Night It All Came Down To This', 'One Match. Everything On It.',
                'They Still Talk About This Night', 'The Match That Changed Everything']
    else:
        search = [f'{club} {season}: The Full Season Story', f'{club} {season} Season — Every Big Night', f'{club} in {season}: How It Happened',
                  f'{club} {season}: From Start To Finish', f'{club} {season} Explained']
        disc = [f'The Night Against {opp}', 'The Season Nobody Saw Coming', 'How A Season Turned', 'A Season On The Edge',
                'The Run That Changed Everything']
    order = {'chronicler': (0, 1, 2, 3, 4), 'poet': (2, 4, 0, 1, 3), 'mythmaker': (3, 0, 4, 2, 1)}[pen.w]
    out = [{'title': search[i][:100], 'angle': 'search'} for i in order] + [{'title': disc[i][:100], 'angle': 'discovery'} for i in order]
    return out


def description(pen: Pen, chapters: list[dict]) -> str:
    b = pen.b
    top = b.top
    f = b.f(top)
    shape = SHAPE.get(b.story.get('shape') or '', 'went its own way')
    p1 = (f'{b.club} and {b.opp(top)} on {day(f["date"])}: the night at the heart of this film, told from the record. '
          + ({'season': f'Around it, the whole {b.season} season — a season that {shape} — match by match.',
              'rivalry': 'Around it, every meeting between the two clubs the archive holds.'}.get(b.kind, 'Around it, the stakes, the goals and the verdict.')))
    names = [c['title'] for c in chapters]
    p2 = 'The chapters: ' + ', '.join(names) + '. Every score, scorer and date comes from the FanLife archive.'
    p3 = 'FanLife Football Stories tells the stories of clubs and their supporters, from the terrace.'
    return '\n\n'.join([p1, p2, p3])[:3400]


def tags(pen: Pen) -> list[str]:
    b = pen.b
    out = [b.club, f'{b.club} history', 'football documentary', 'football stories', 'FanLife', b.season, b.opp(b.top),
           spoken(b.f(b.top).get('competition')), 'football history', 'supporters']
    out = [t for t in dict.fromkeys(x.strip() for x in out if x and x.strip())][:15]
    while len(','.join(out)) > 440:
        out.pop()
    return out


def shorts(pen: Pen) -> list[dict]:
    """Two or three Shorts, each its own hook and its own words (never the film's sentences)."""
    b = pen.b
    out = []
    top = b.top
    f = b.f(top)
    h1 = f'This is what {b.opp(top)} still remember about {day(f["date"])}.' if pen.w != 'poet' else f'Ask anyone who was there on {day(f["date"])}.'
    t1 = (f'{h1} {spoken(f.get("competition"))}, {b.club} against {b.opp(top)}. ' + {'win': f'Final score {b.score(top)} to {b.club}.',
          'loss': f'Final score {b.score(top)} to {b.opp(top)}.', 'draw': f'It finished {b.score(top)}.'}[f['outcome']]
          + ' The whole story is on the channel.')
    out.append({'hook': h1, 'idea': 'the night itself', 'narration': t1, 'claim_ids': [top], 'hook_law': 'know-it-all'})
    longest = max(b.runs, key=lambda r: r.get('length', 0)) if b.runs else None
    ids = b.run_ids(longest) if longest else []
    if len(ids) >= 3:
        what = {'unbeaten': 'unbeaten', 'wins': 'winning', 'winless': 'without a win', 'losses': 'losing'}.get(longest['kind'], 'in a row')
        h2 = f'{len(ids)} matches {what}. Is that even real?'
        t2 = f'{h2} {b.club}, from {b.opp(ids[0])} to {b.opp(ids[-1])}, every one of them on the record. Watch how it happened.'
        out.append({'hook': h2, 'idea': 'the run', 'narration': t2, 'claim_ids': ids + ['story'], 'hook_law': 'is-this-real'})
    alt = next((m['id'] for m in b.moments[1:]), None) or (b.matches[0]['id'] if b.matches and b.matches[0]['id'] != top else None)
    if alt:
        g = b.f(alt)
        h3 = f'{b.club} against {b.opp(alt)}, {day(g["date"])}. Do you remember it?'
        t3 = (f'{h3} ' + {'win': f'A {b.score(alt)} win for {b.club}.', 'loss': f'A {b.score(alt)} defeat for {b.club}.',
                          'draw': f'A {b.score(alt)} draw.'}[g['outcome']] + ' One of the nights of the story. The full film is on the channel.')
        out.append({'hook': h3, 'idea': 'another night', 'narration': t3, 'claim_ids': [alt], 'hook_law': 'know-it-all'})
    if len(out) < 2:
        h4 = f'{b.club}, {b.season}. Do you know how it ended?'
        out.append({'hook': h4, 'idea': 'the question', 'narration': f'{h4} {spoken(f.get("competition"))}, {b.opp(top)}, {day(f["date"])}. '
                                                                     'The answer is in the full film on the channel.', 'claim_ids': [top], 'hook_law': 'is-this-real'})
    return out[:3]


def thumbnails(pen: Pen) -> list[dict]:
    b = pen.b
    top = b.top
    words = {'chronicler': ['Everything On It', 'The Night', 'How It Turned'], 'poet': ['We Were There', 'Our Night', 'Still Singing'],
             'mythmaker': ['The Legend', 'No Way Back', 'One Night']}[pen.w]
    return [{'text': w, 'concept': f'{b.club} against {b.opp(top)} — {w.lower()}', 'claim': top if i == 0 else None} for i, w in enumerate(words)]


# ── length, rules, checks ────────────────────────────────────────────────────────────────────────────────────────────
def _all(chs: list[dict]):
    for ch in chs:
        for bt in ch['beats']:
            yield ch, bt


def _count(chs: list[dict]) -> int:
    return sum(_words(bt['narration']) for _, bt in _all(chs))


def trim(chs: list[dict], hi: int) -> None:
    """Cut the lowest-weighted optional beats until the narration fits."""
    while _count(chs) > hi:
        opt = [(bt['_w'], ci, bi) for ci, ch in enumerate(chs) for bi, bt in enumerate(ch['beats']) if not bt['_req']]
        if not opt:
            break
        _, ci, bi = min(opt)
        del chs[ci]['beats'][bi]


def shape(pen: Pen, chs: list[dict]) -> None:
    """Every chapter of four beats or more as a mini-drama (script.mini_drama), after the cut: a WANT in its first beats,
    an OBSTACLE, a CLOCK, a TURN in its second half — each added as a line of craft where the cut took it away."""
    for ch in chs:
        beats = [b for b in ch['beats'] if b['visual'].get('type') not in ('follow', 'end')]
        if len(beats) < 4:
            continue
        third = max(1, len(beats) // 3)
        head = beats[:max(2, third + 1)]
        if not any(WANT.search(b['narration']) for b in head):
            b = head[0] if head[0]['visual'].get('type') != 'trailer' else head[-1]
            b['narration'] = f"{pen.pick('want')} {b['narration']}"
        if not any(OBSTACLE.search(b['narration']) for b in beats):
            b = beats[min(len(beats) - 1, 1)]
            b['narration'] = f"{b['narration']} {pen.pick('obstacle')}"
        if not any(CLOCKED.search(b['narration']) for b in beats):
            b = beats[-1]
            b['narration'] = f"{pen.pick('clock')} {b['narration']}"
        half = beats[len(beats) // 2:]
        if not any(TURNED.search(b['narration']) for b in half):
            b = next((x for x in half if x['visual'].get('type') in PAYOFF_VISUALS or RESULT_CUES.search(x['narration'])), half[0])
            b['narration'] = f"{pen.pick('turn')} {b['narration']}"


def minutes_for(words: int, asked: float) -> float:
    """The film's length from what its words carry: the asked length when they fit it, else the nearest half minute
    that holds them, else exactly what they carry."""
    lo, hi = target_words(asked)
    if lo <= words <= hi:
        return asked
    for m in [x / 2 for x in range(int(asked * 2), 1, -1)]:
        lo, hi = target_words(m)
        if lo <= words <= hi:
            return m
    return round(words / FILM_WORDS_PER_MINUTE, 2)


ALT_TYPE = {'score': 'matchday', 'matchday': 'ticket', 'ticket': 'score', 'versus': 'score', 'goal': 'score', 'illustration': 'turning',
            'turning': 'illustration', 'chapter': 'chapter', 'form': 'form', 'run': 'run', 'race': 'race', 'record': 'record'}


def house_rules(chs: list[dict], cams: tuple) -> None:
    """Director rule 4 in place: no visual three times running, no camera move three times running."""
    seq = [bt for _, bt in _all(chs)]
    for i in range(2, len(seq)):
        a, b_, c = seq[i - 2]['visual'], seq[i - 1]['visual'], seq[i]['visual']
        if a['type'] == b_['type'] == c['type']:
            if seq[i].get('_req') and c['type'] in PAYOFF_VISUALS:
                j = i - 1 if not seq[i - 1].get('_req') else i - 2
                if seq[j].get('_req'):
                    continue
                seq[i], c = seq[j], seq[j]['visual']
            t = ALT_TYPE.get(c['type'], c['type'])
            target = seq[i]
            if t != c['type'] and c.get('claim') and t in ('matchday', 'ticket', 'score'):
                target['visual'] = {'type': t, 'claim': c['claim'], **({'backdrop': 'terrace-crowd'} if t != 'score' else {})}
            elif c['type'] == 'illustration':
                target['visual'] = {'type': 'turning', 'title': 'And then', 'subtitle': '', 'backdrop': c.get('art') if c.get('art') in LIBRARY else 'tunnel'}
            elif c['type'] == 'turning':
                target['visual'] = {'type': 'illustration', 'art': 'terrace-crowd', 'caption': ''}
            seq = [bt for _, bt in _all(chs)]
        x, y, z = seq[i - 2].get('camera'), seq[i - 1].get('camera'), seq[i].get('camera')
        if x and x == y == z:
            seq[i]['camera'] = next(m for m in (*cams, 'push', 'pull', 'drift') if m != z)


def clean(chs: list[dict]) -> list[dict]:
    out = []
    for ch in chs:
        beats = []
        for bt in ch['beats']:
            if not bt['narration'].strip():
                continue
            beats.append({k: v for k, v in bt.items() if not k.startswith('_')})
        if beats:
            out.append({'title': ch['title'], 'beats': beats})
    n = 2
    for ch in out:
        v = ch['beats'][0].get('visual') or {}
        if v.get('type') == 'chapter':
            v['number'] = n
            n += 1
    return out


def assemble(pen: Pen, chs: list[dict], hooks: list[dict]) -> dict:
    tc = titles(pen)
    sel = 5 if pen.w == 'mythmaker' else 0
    hook = _sentences(hooks[0]['text'])[0]
    return {'director': 2, 'drama': 1, 'motif': {'chronicler': 'the clock above the stand', 'poet': 'a scarf in the club colours',
                                                 'mythmaker': 'floodlights over an empty pitch'}[pen.w],
            'title_candidates': tc, 'selected': sel, 'hook': hook, 'hook_options': hooks, 'chapters': clean(chs),
            'description': description(pen, chs), 'tags': tags(pen), 'shorts': shorts(pen), 'thumbnails': thumbnails(pen)}


def write_script(brief: dict, ledger: dict, writer: str, log=print, avoid: list[dict] | None = None, check_at=None) -> dict:
    """A whole script by one house writer. `check_at(script, minutes) -> [errors]`; without it, script.validate_script."""
    from .writer import sized_minutes
    asked = float(brief.get('duration') or 5)
    minutes = sized_minutes(asked, ledger)
    kind = brief.get('kind') if brief.get('kind') in ('season', 'match', 'tie', 'rivalry') else film_kind(ledger)
    book = Book(ledger, kind)
    if not book.matches or not book.top:
        raise StageError('SCRIPT_INVALID', 'The house writers found no readable match in the record — there is no film to write.')
    check = check_at or (lambda s, m: validate_script(s, ledger, m, kind))
    seed = f'{ledger.get("club_id")}|{book.season}|{kind}|{"-".join(sorted((ledger.get("focus") or {}).get("matches") or []))}'
    lo, hi = target_words(minutes)
    pen = Pen(writer, book, seed)
    hooks = hook_options(pen)
    opening = cold_open(pen, hooks[0])
    body = {'season': season_film, 'match': match_film, 'tie': match_film, 'rivalry': rivalry_film}[kind](pen, lo)
    chs = [opening, *body]
    trim(chs, hi - 45 if minutes > 4 else hi)
    shape(pen, chs)
    house_rules(chs, pen.v['cams'])
    took = minutes_for(_count(chs), minutes)
    if took < FLOOR_MINUTES:
        raise StageError('SCRIPT_INVALID', f'The record carries {_count(chs)} words of proven narration — too little for a film.')
    s = assemble(pen, chs, hooks)
    if avoid:
        mine = {o.get('title') for o in avoid} | {o.get('hook') for o in avoid}
        if s['title_candidates'][s['selected']]['title'] in mine:
            s['selected'] = next(i for i, t in enumerate(s['title_candidates']) if t['title'] not in mine)
    errs = check(s, took)
    for _ in range(12):
        if not errs:
            break
        s, took = _mend(s, errs, minutes, took)
        errs = check(s, took)
    if errs:
        from . import salvage as salvaging
        saved, report = salvaging.salvage(s, ledger, check, took)
        if saved is None:
            log('House writer: could not pass — ' + '; '.join(errs[:6]))
            raise StageError('SCRIPT_INVALID', f'The house writer could not write a film that passes every check ({errs[0][:120]})')
        s, took = saved, report['minutes']
        s['_salvage'] = report
    s['_minutes'] = took
    s['_writer'] = [{'source': 'house', 'writer': writer, 'minutes': took}]
    return s


def _mend(s: dict, errs: list[str], asked: float, took: float) -> tuple[dict, float]:
    """A refused beat is cut (never the opening, never a chapter card); a length error re-measures the film."""
    t = copy.deepcopy(s)
    drop = set()
    for e in errs:
        m = _BEAT_AT.match(e)
        if m:
            ci, bi = int(m.group(1)) - 1, int(m.group(2)) - 1
            if (ci, bi) not in ((0, 0), (0, 1)) and ci < len(t['chapters']) and bi < len(t['chapters'][ci]['beats']):
                if (t['chapters'][ci]['beats'][bi].get('visual') or {}).get('type') != 'chapter':
                    drop.add((ci, bi))
        m5 = re.match(r'Chapter (\d+): \[director rule 5\]', e)
        if m5:
            ci = int(m5.group(1)) - 1
            if ci < len(t['chapters']):
                last = t['chapters'][ci]['beats'][-1]
                last['narration'] = last['narration'].rstrip() + ' And then?'
    for ci, bi in sorted(drop, reverse=True):
        del t['chapters'][ci]['beats'][bi]
    t['chapters'] = [c for c in t['chapters'] if c['beats']]
    words = sum(_words(b['narration']) for c in t['chapters'] for b in c['beats'])
    return t, minutes_for(words, asked)


__all__ = ['write_script', 'Book', 'Pen', 'VOICE', 'spoken']
_ = scorelines   # imported for the tests that read scorelines off house narration

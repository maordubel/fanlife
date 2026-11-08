"""Turn a complete owner-supplied two-leg treatment into a reviewable film without a model call."""
from __future__ import annotations

import re

from . import director, script
from .common import sha256_json


def build(ledger: dict) -> dict | None:
    docs = ledger.get('story_documents') or []
    matches = sorted((c for c in ledger['claims'] if c.get('owner_story_source')
                      and c['fact'].get('kind') == 'match'), key=lambda c: c['fact']['date'])
    if len(matches) != 2:
        return None
    first, second = matches
    a, b = first['fact'], second['fact']
    doc = next((d for d in docs if d.get('name') == first['owner_story_source'] == second['owner_story_source']), {})
    title = re.search(r'^\s*STORY BRIEF:\s*(.+?)\s*$', doc.get('text') or '', re.I | re.M)
    outcome = next((c for c in ledger['claims'] if c.get('owner_story_source') == doc.get('name')
                    and c['fact'].get('kind') == 'history' and 'away goals' in c['fact'].get('text', '').lower()
                    and re.match(r'^\d+\s*[-–]\s*\d+\.', c['fact'].get('text', ''))), None)
    if not (title and outcome and a.get('side') == 'away' and b.get('side') == 'home'
            and a['home'] == b['away'] and a['away'] == b['home'] and a.get('owner_goal_order') and b.get('owner_goal_order')):
        return None
    if not (a['club_goals'] < a['opponent_goals'] and b['club_goals'] > b['opponent_goals']
            and a['club_goals'] + b['club_goals'] == a['opponent_goals'] + b['opponent_goals']
            and b['opponent_goals'] > a['club_goals']):
        return None

    club, rival = b['home'], b['away']
    return_score = f"{b['score_home']}–{b['score_away']}"
    if script.scorelines(outcome['fact']['text'])[:1] != [(a['club_goals'] + b['club_goals'], a['opponent_goals'] + b['opponent_goals'])]:
        return None
    advancing = re.search(r'\.\s*(.+?)\s+(?:advances?|qualif(?:ies|ied)|go(?:es)? through)\b', outcome['fact']['text'], re.I)
    if not advancing or advancing[1].casefold() != rival.casefold():
        return None

    def beat(text, visual, *cites, mood=None):
        row = {'narration': text, 'visual': visual, 'claim_ids': list(cites)}
        if mood:
            row['mood'] = mood
        return row

    def match_card(kind, match):
        return {'type': kind, 'claim': match['id']}

    def picture(art='paper'):
        return {'type': 'illustration', 'art': art}

    def aggregate(home, away):
        text = f'{club} {home}–{away} {rival}'
        cid = 'owner-aggregate-' + sha256_json([first['id'], second['id'], text])[:12]
        if not any(c['id'] == cid for c in ledger['claims']):
            ledger['claims'].append({'id': cid, 'type': 'history', 'fact': {'kind': 'history', 'text': text},
                                     'sources': [], 'confidence': 2, 'owner_story_source': doc['name']})
        return {'type': 'fact', 'heading': 'Aggregate', 'text': text, 'claim': cid}, cid

    hook = 'A victory. An exit.'
    opening = (f'{hook} {club} were going home. {rival} still had a place in the next round. '
               'How could the same night end with both a home victory and a home exit?')
    chapters = [
        {'title': 'The result that did not settle it', 'beats': [
            beat(opening, {'type': 'trailer', 'lines': ['THE WIN', 'THE EXIT']}, first['id'], second['id'], outcome['id']),
            beat('Start with the earlier fixture. The return would begin with a blank scoreboard, but the tie would carry the '
                 'first result with it. Keep the match and the tie apart and the ending begins to make sense. What did the visitors '
                 'bring home from the first leg?', picture(), first['id']),
        ]},
        {'title': 'The away leg', 'beats': [
            beat(f"The first leg takes us to {(a.get('venue') or {}).get('name') or a['home']}. It starts at 0–0. "
                 f'{rival} have home advantage. For {club}, every minute without conceding keeps the return open. '
                 'A goal here could change the terms of the whole tie.', match_card('versus', first), first['id']),
        ]},
        {'title': 'The return leg', 'beats': [
            beat(f"The return is at {(b.get('venue') or {}).get('name') or b['home']}. The match starts at 0–0. "
                 f'{club} still have the first result to make up. Winning tonight is possible. How much they need '
                 'to win by depends on what happens at both ends.', match_card('versus', second), first['id'], second['id']),
        ]},
    ]
    for match, chapter in zip(matches, chapters[1:]):
        fact = match['fact']
        for goal, (_, _, (home, away)) in zip(fact['owner_goal_order'], director.match_goal_states(ledger, fact)):
            scorer, side = goal['name'], goal['side']
            chapter['beats'].append(beat(f'{scorer} scores for {fact[side]}. The match score is {home}–{away}.',
                                         {**match_card('score', match), 'in_play': True}, match['id'],
                                         mood='joy' if side == fact['side'] else 'sad'))
            if match is first:
                continue
            total_home, total_away = a['club_goals'] + home, a['opponent_goals'] + away
            card, cid = aggregate(total_home, total_away)
            if total_home > total_away:
                narration = f'{club} are ahead across the tie. Now the question is whether the lead will hold.'
            elif total_home == total_away and away > a['club_goals']:
                narration = ('The aggregate is level, but the visitors have scored away from home. '
                             'That puts them in position to go through. The home side need another goal.')
            elif total_home == total_away:
                narration = 'Put both legs together and the teams are level. The home side have made up the deficit. The next goal changes who is in control.'
            else:
                narration = 'The gap across the tie still matters. A goal on the night and a lead across both legs are different things.'
            mood = 'build' if total_home >= total_away and away <= a['club_goals'] else 'tense'
            chapter['beats'].append(beat(narration, card, cid, outcome['id'], mood=mood))
    chapters[1]['beats'].append(beat('The first leg is over. The deficit is real, but the tie still has a second '
                                     'leg. What happens if the home side can get the first goal there?', picture(), first['id']))
    chapters[2]['beats'].append(beat('The home side have the lead on the night. But when the whistle comes, which '
                                     'result will actually decide who goes on?', picture(), second['id']))
    chapters.append({'title': 'Two outcomes at the final whistle', 'beats': [
        beat(f'{club} win the return {return_score}. It is a match result worth remembering. To see who goes through, '
             'return to the other graphic and put the legs together.', match_card('score', second), second['id']),
        beat('The aggregate is level. Under the rule used in this tie, when the total was level, the team with more '
             'away goals went through. That is how the visitors advanced.', {'type': 'fact', 'heading': 'Away goals',
             'text': f'{rival} advanced on away goals', 'claim': outcome['id']}, outcome['id']),
        beat('Both things can be true at the same time. The home side beat their opponents on the night. The away side '
             'had done enough across the two fixtures to survive. That is what makes the score on its own such a poor '
             'summary of what the teams went through.', picture('terrace-empty'), first['id'], second['id'], outcome['id']),
    ]})
    titles = [title[1].strip()[:100], f'{club} vs {rival}: The Away Goals Tie', 'The Match and the Tie',
              'A Win on the Night', 'The Goal That Changed the Tie', 'When a Win Sends You Home',
              'Two Legs and One Rule', 'The Other Scoreboard', 'What the Final Whistle Meant', 'The Rule Behind the Result']
    return {'director': script.DIRECTOR, 'selected': 0, 'hook': hook, 'chapters': chapters,
            'title_candidates': [{'title': t[:100], 'angle': 'search' if i < 2 else 'discovery'} for i, t in enumerate(titles)],
            'description': (f'The story of {club} and {rival} over two legs, told through the owner-supplied treatment. '
                            'Follow each goal on the match scoreboard and see how the aggregate and the away-goals rule '
                            'changed the qualification picture before the final whistle.'),
            'tags': [club, rival, 'football history', 'away goals', 'football documentary'],
            'shorts': [
                {'hook': 'The winning team went home.', 'idea': 'How a match winner can be eliminated',
                 'narration': f'The winning team went home. {club} won the return, but the scores over both games were level. '
                              f'Then came the tiebreaker: {rival} had scored away from home. The match winner and the team that advanced were different.',
                 'claim_ids': [first['id'], second['id'], outcome['id']]},
                {'hook': 'Watch the two scoreboards.', 'idea': 'The goal that changed the tie',
                 'narration': 'Watch the two scoreboards. On the night, the home side were still winning. Across both games, '
                              'the total was level. An away goal had changed who was going through, even with the home side winning on the night.',
                 'claim_ids': [first['id'], second['id'], outcome['id']]},
            ],
            'thumbnails': [{'text': text} for text in ('THE WIN THAT HURT', 'WIN AND GO HOME', 'THE OTHER SCOREBOARD')],
            '_owner_treatment': doc['name'], '_angle': 'Your supplied story'}

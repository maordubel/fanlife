"""Writes campaign.json — the whole series in one place (owner, 3.11.2026). Edit the words here, run it, commit both."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
camp = json.loads((HERE / 'campaign.json').read_text())
OLY, PAO, AEK = '#D71920', '#0B7A3B', '#F3C613'
SITE = 'https://fanlife.dubelteam.com'
SUBS = 'https://www.youtube.com/@FanLifeFootballStories?sub_confirmation=1'
RR_URL = SITE + '/clubs/olympiacos/royal-rumble'
LM_URL = SITE + '/all-football/legends'
ILL = 'ILLUSTRATION'
LEG_DRAFT = 'olympiacos/legends/step02-deal'      # the first trio: Niniadis €4M · Bagalianis €2M · Damianidis €1M (capture 3.11.2026)
LEG_BOARD = 'olympiacos/legends/step19'           # "On confirming, the board adds a one-off €8M"
LEG_MEET = 'olympiacos/legends/step20'            # Meet your squad
LEG_XI = 'olympiacos/legends/step60'              # the eleven: shape, captain, vice
LEG_LEVER = {'clip': 'olympiacos/legends-video', 'mark': 'founded', 'offset': 0.6}   # the board's lever: €50–52M

items = []


def item(id_, game, fmt, n, date, title, desc, tags, beats, **kw):
    items.append({'id': id_, 'game': game, 'format': fmt, 'n': n, 'file': f'fl-promo-{id_}', 'publish': f'{date} 13:00',
                  'title': title, 'description': desc, 'tags': tags, 'beats': beats, **kw})


# ── ROYAL RUMBLE · the film ─────────────────────────────────────────────────────────────────────────────────────────
item('rr-film', 'rumble', 'film', 1, '2026-11-04',
     "Settle the argument: your club's all-time five on €15M | FAN LIFE Royal Rumble",
     "Every fan has had this argument: who makes your club's all-time team? Royal Rumble settles it.\n\n"
     "Pick your club. Every player it has ever had is in the deck. Choose a position, three cards land — a premium, a mid-price and a bargain — and you take one. "
     "Five-a-side for €15M, or the full eleven for about €35M. Three rerolls for the whole draft. Lock your five and they walk out against another five from your own club, "
     "dealt before your first pick — then they play. Send your mate the link: same deck, same budget. Now it's not an argument. It's a result.\n\n"
     f"▶ Play Royal Rumble: {RR_URL}\n▶ Every club on FAN LIFE: {SITE}\n▶ Subscribe: {SUBS}\n\n"
     "Shown with Olympiacos, Panathinaikos and AEK Athens. Illustrations are artwork, not photographs. Narration is synthetic.\n\n"
     "#FANLIFE #RoyalRumble #FootballGame #DreamTeam #Olympiacos #Panathinaikos #AEK",
     ['FAN LIFE', 'Royal Rumble', 'football game', 'dream team', 'all-time XI', 'fantasy football', 'football fans', 'Olympiacos', 'Panathinaikos', 'AEK Athens', 'five-a-side', 'football draft'],
     [
      {'kind': 'art', 'art': 'royal-rumble/legends-one-team', 'zoom': [1.0, 1.1], 'pan': [0, 30],
       'say': "Every football fan has had this argument. Who makes your club's all-time team?", 'lead': 0.9, 'entry': 'black'},
      {'kind': 'card', 'art': 'clubs/panathinaikos/gate-13', 'head': 'Everyone has\nan opinion.',
       'say': "Your mate says the side that won the title. Your dad says the old days. And your uncle won't shut up about one striker."},
      {'kind': 'title', 'logo': 'rumble', 'head': 'Settle it.', 'kicker': 'FAN LIFE · Royal Rumble', 'say': 'Royal Rumble settles it.'},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/door', 'head': 'Every player\nyour club\never had.', 'kicker': 'Olympiacos · 672 in the deck',
       'say': 'Pick your club. Every player it has ever had is in the deck. Olympiacos alone: six hundred and seventy-two.'},
      {'kind': 'art', 'art': 'royal-rumble/one-slot-your-choice', 'zoom': [1.0, 1.08], 'pan': [-40, 20],
       'say': 'Choose a position, and three cards land: a premium, a mid-price, and a bargain. You take one.'},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/deal1', 'head': '€15M.\nFive players.', 'kicker': 'Do the maths',
       'say': "A legend costs up to five million. You've got fifteen. For five players. Do the maths."},
      {'kind': 'slam', 'head': 'Three rerolls.\nThat’s it.', 'kicker': 'Not per pick. For the whole draft.', 'say': 'And three rerolls. Not per pick. For the whole draft.'},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/entrance', 'head': 'Lock it.\nThey walk out.', 'kicker': 'Your club v your club',
       'say': 'Lock your five, and they walk out. Against another five from your own club, dealt before your first pick.'},
      {'kind': 'clip', 'clip': 'olympiacos/rumble-video', 'mark': 'kickoff', 'offset': 3.0, 'head': 'Then\nthey play.', 'say': 'Then they play. Every chance, every goal, on the pitch.', 'min': 6.5,
       'cues': [[0.4, 'crowd-build']]},
      {'kind': 'art', 'art': 'royal-rumble/build-your-five', 'zoom': [1.0, 1.08], 'pan': [20, 30], 'stub': True,
       'say': 'Five-a-side for fifteen million, or the full eleven for about thirty-five. Pick your shape.', 'min': 6.0},
      {'kind': 'card', 'art': 'clubs/aek-athens/original-21', 'head': 'Send your mate\nthe link.', 'ground': AEK,
       'say': "Then send your mate the link. Same deck, same budget. Now it's not an argument. It's a result."},
      {'kind': 'montage', 'arts': ['clubs/olympiacos/2024-victory-away-end', 'clubs/panathinaikos/terrace', 'clubs/aek-athens/terrace'],
       'names': ['Olympiacos', 'Panathinaikos', 'AEK Athens'], 'crests': ['olympiacos', 'panathinaikos', 'aek-athens'],
       'say': 'Olympiacos. Panathinaikos. AEK. Celtic, St. Pauli, Hapoel Tel Aviv, and more. Your club is waiting.', 'cues': [[0.1, 'crowd-goal']]},
     ], thumb={'art': 'royal-rumble/legends-one-team', 'focus': [0.42, 0.75], 'head': 'Your all-time five.\n€15M.', 'kicker': 'Settle the argument'})

# ── LEGENDS MANAGER · the film ──────────────────────────────────────────────────────────────────────────────────────
item('lm-film', 'legends', 'film', 2, '2026-11-05',
     "You've shouted at the manager for years. Your turn. | FAN LIFE Legends Manager",
     "You've shouted at the manager for years — from the stand, from the sofa, from the pub. Your turn.\n\n"
     "Legends Manager: one club, only the men who wore its shirt. Draft seventeen legends from the club's whole history (GK 2 · DF 6 · MF 6 · FW 3) "
     "on a budget the board draws with a lever — between €50M and €52M. Before every pick you choose the line; three men are offered — premium, squad and bargain — and three rerolls are yours for the whole draft. "
     "Every legend is rated in stars, measured against his own club. Register the squad and the board adds €8M for the first window. Pick the shape, name your captain. "
     "Then the season: the quick result, or the touchline — up to three stops a match, three changes, tactics you can turn. Cards, bans and injuries are real and carry on. "
     "Two windows a season. Your dynasty.\n\n"
     "A signing is a time machine: a fantasy, never a transfer that happened.\n\n"
     f"▶ Play Legends Manager: {LM_URL}\n▶ Every club on FAN LIFE: {SITE}\n▶ Subscribe: {SUBS}\n\n"
     "The Olympiacos nights: Olympiacos 1–4 Maccabi Tel Aviv (7.3.2024) and Maccabi Tel Aviv 1–6 Olympiacos a.e.t. (14.3.2024), UEFA Europa Conference League round of 16 — UEFA match report. "
     "Illustrations are artwork, not photographs. Narration is synthetic.\n\n#FANLIFE #LegendsManager #FootballManager #Olympiacos #Panathinaikos #AEK",
     ['FAN LIFE', 'Legends Manager', 'football manager game', 'football legends', 'manager game', 'Olympiacos', 'Panathinaikos', 'AEK Athens', 'football fans', 'football draft', 'dynasty'],
     [
      {'kind': 'art', 'art': 'legends-manager/build-your-legacy', 'zoom': [1.75, 1.9], 'c0': [0.48, 0.74], 'c1': [0.56, 0.71],
       'say': "You've been shouting at the manager for years. From the stand. From the sofa. From the pub.", 'lead': 0.9, 'entry': 'black'},
      {'kind': 'title', 'logo': 'legends', 'head': 'Your turn.', 'kicker': 'FAN LIFE · Legends Manager', 'say': 'Your turn.', 'min': 3.2},
      {'kind': 'phone', 'cap': 'olympiacos/legends/door', 'head': 'One club.\nOnly its\nown men.', 'say': 'Legends Manager. Pick one club, and only the men who wore its shirt.'},
      {'kind': 'phone', 'cap': 'olympiacos/legends/club', 'head': '17 legends.', 'kicker': 'Olympiacos · 672 to choose from',
       'say': "Seventeen legends, from the club's whole history."},
      {'kind': 'clip', **LEG_LEVER, 'head': 'The board\npulls a lever.', 'kicker': 'Your budget: €50M–€52M',
       'say': 'And the board pulls a lever for your budget. Somewhere between fifty and fifty-two million.', 'min': 5.5},
      {'kind': 'phone', 'cap': LEG_DRAFT, 'head': 'Premium.\nSquad.\nBargain.', 'kicker': 'Three rerolls for the draft',
       'say': 'Before every pick you choose the line. Three men are offered: premium, squad, and bargain.'},
      {'kind': 'art', 'art': 'legends-manager/build-your-squad', 'zoom': [1.55, 1.68], 'c0': [0.42, 0.66], 'c1': [0.46, 0.64],
       'say': 'Every legend is rated in stars, never in numbers. Measured against his own club, not against the world.'},
      {'kind': 'phone', 'cap': LEG_BOARD, 'head': 'The board\nbacks you.', 'kicker': '+ €8M for the first window',
       'say': 'Register the squad, and the board adds eight million for the first window.'},
      {'kind': 'phone', 'cap': LEG_XI, 'head': 'Pick the shape.\nName the captain.',
       'say': 'Meet your squad. Pick the shape. Name your captain.'},
      {'kind': 'art', 'art': 'legends-manager/make-the-call', 'zoom': [1.6, 1.72], 'c0': [0.36, 0.68], 'c1': [0.40, 0.66], 'stub': True,
       'say': 'Then the season. Take the quick result, or stand on the touchline: up to three stops a match, three changes, tactics you can turn.', 'min': 6.5},
      {'kind': 'slam', 'head': 'Cards. Bans.\nInjuries.', 'kicker': 'Real, and they carry on', 'say': 'Cards, bans and injuries are real. And they carry on.'},
      {'kind': 'art', 'art': 'clubs/olympiacos/2024-piraeus-shock', 'zoom': [1.0, 1.08], 'pan': [30, 0], 'tag': ILL,
       'score': 'Olympiacos 1–4 Maccabi Tel Aviv', 'score_kicker': '7 March 2024 · Conference League', 'ground': OLY,
       'say': 'And never give up on a tie. In March 2024, Olympiacos lost four–one at home.'},
      {'kind': 'art', 'art': 'clubs/olympiacos/2024-extra-time', 'zoom': [1.0, 1.1], 'pan': [-30, 10], 'tag': ILL,
       'score': 'Maccabi Tel Aviv 1–6 Olympiacos', 'score_kicker': '14 March 2024 · after extra time · 7–5 on aggregate',
       'say': "A week later, they won six–one, after extra time. That's football. Now it's on you.", 'cues': [[1.2, 'crowd-goal']]},
      {'kind': 'card', 'art': 'clubs/panathinaikos/matchday-walk', 'head': 'Two windows\na season.', 'kicker': 'Buy and sell inside your club’s history',
       'say': "Two windows a season. Buy and sell inside your club's history, season after season. Your dynasty."},
      {'kind': 'montage', 'arts': ['clubs/olympiacos/2024-greek-poster', 'clubs/panathinaikos/gate-13', 'clubs/aek-athens/original-21'],
       'names': ['Olympiacos', 'Panathinaikos', 'AEK Athens'], 'crests': ['olympiacos', 'panathinaikos', 'aek-athens'],
       'say': 'Olympiacos. Panathinaikos. AEK. Celtic, St. Pauli, Hapoel Tel Aviv, and more. Pick your club.'},
     ], thumb={'art': 'clubs/olympiacos/2024-victory-away-end', 'focus': [0.5, 0.5], 'head': 'You shouted\nfor years.\nYour turn.', 'kicker': 'Legends Manager'})


# ── the Shorts ──────────────────────────────────────────────────────────────────────────────────────────────────────
def short(id_, game, n, date, title, hook, tags, beats, accent=None, play=None):
    url = play or (RR_URL if game == 'rumble' else LM_URL)
    name = 'Royal Rumble' if game == 'rumble' else 'Legends Manager'
    tag_line = '#FANLIFE #RoyalRumble #FootballGame #DreamTeam #Shorts' if game == 'rumble' else '#FANLIFE #LegendsManager #FootballManager #FootballLegends #Shorts'
    desc = f"{hook}\n\n▶ Play {name} on FAN LIFE: {url}\n▶ Subscribe: {SUBS}\n\nNarration is synthetic.\n\n{' '.join(tags)} {tag_line}"
    kw = {'accent': accent} if accent else {}
    item(id_, game, 'short', n, date, title + ' #Shorts', desc, ['FAN LIFE', name, 'football game', 'football fans', 'Shorts'], beats, **kw)


short('rr-s1', 'rumble', 3, '2026-11-06', "Name your club's best five ever. Now do it on €15M.",
      "Name your club's best five ever. Easy. Now do it on €15M — three cards a slot, a legend costs up to five.", ['#Olympiacos'], [
      {'kind': 'card', 'art': 'royal-rumble/legends-one-team', 'head': "Name your club's\nbest five ever.", 'say': "Name your club's best five ever. Go.", 'lead': 0.4},
      {'kind': 'slam', 'head': 'Now do it\non €15M.', 'say': 'Now do it on fifteen million.'},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/deal1', 'head': 'Three cards.\nPick one.', 'say': 'Three cards a slot. A legend costs up to five. A bargain costs one.'},
      {'kind': 'clip', 'clip': 'olympiacos/rumble-video', 'mark': 'kickoff', 'offset': 3.0, 'head': 'Lock it.\nWatch them play.', 'say': 'Lock it in, and watch them play.', 'min': 4.5, 'cues': [[0.3, 'crowd-build']]},
      ], accent=OLY)
short('rr-s2', 'rumble', 4, '2026-11-08', 'Three rerolls. For the WHOLE draft.',
      'You get three rerolls in Royal Rumble. Not per pick. For the whole draft. Spin, or settle?', [], [
      {'kind': 'card', 'art': 'royal-rumble/one-slot-your-choice', 'head': 'You get three\nrerolls.', 'say': 'In Royal Rumble you get three rerolls.', 'lead': 0.4},
      {'kind': 'slam', 'head': 'Not per pick.', 'say': 'Not per pick.', 'min': 1.6},
      {'kind': 'slam', 'head': 'For the\nwhole draft.', 'say': 'For the whole draft.', 'ground': '#15130F', 'min': 1.8},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/deal2', 'head': 'Spin,\nor settle?', 'say': "So when the dream card doesn't come… do you spin, or settle?"},
      ], accent=OLY)
short('rr-s3', 'rumble', 5, '2026-11-10', 'Five-a-side or the full eleven? Pick your shape.',
      'Royal Rumble: five-a-side for €15M, or the full eleven for about €35M. Your club, every player it ever had.', [], [
      {'kind': 'card', 'art': 'royal-rumble/build-your-five', 'head': 'Five-a-side?', 'kicker': '€15M', 'say': 'Five-a-side, for fifteen million?', 'lead': 0.4},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/door', 'head': 'Or the\nfull eleven?', 'kicker': 'About €35M', 'say': 'Or the full eleven, for about thirty-five?'},
      {'kind': 'phone', 'cap': 'olympiacos/rumble/five-top', 'head': 'Pick your\nshape.', 'say': 'Pick your shape. Pick your club. Build it from every player it ever had.'},
      ], accent=OLY)
short('rr-s4', 'rumble', 6, '2026-11-12', "Your five vs your mate's five. Same deck. No excuses.",
      "Think your five beats your mate's? Send him the link: same deck, same budget. Loser buys the next round.", ['#AEK', '#AEKAthens'], [
      {'kind': 'card', 'art': 'clubs/aek-athens/original-21', 'head': "Think your five\nbeats your mate's?", 'say': "Think your five beats your mate's?", 'lead': 0.4, 'ground': AEK},
      {'kind': 'phone', 'cap': 'aek-athens/rumble/highlights', 'head': 'Send him\nthe link.', 'say': 'Send him the link. Same deck. Same budget.'},
      {'kind': 'slam', 'head': 'No excuses.', 'say': 'No excuses.', 'min': 1.6, 'ground': '#15130F'},
      {'kind': 'clip', 'clip': 'aek-athens/rumble-video', 'mark': 'kickoff', 'offset': 3.0, 'head': 'Loser buys\nthe round.', 'say': 'Loser buys the next round.', 'min': 4.0, 'cues': [[0.3, 'crowd-goal']]},
      ], accent=AEK, play=SITE + '/clubs/aek-athens/royal-rumble')
short('rr-s5', 'rumble', 7, '2026-11-14', 'Panathinaikos fans: who makes your all-time five?',
      'Panathinaikos fans: every player in the archive is in the deck — 543 of them. Who makes your five?', ['#Panathinaikos', '#PAO'], [
      {'kind': 'art', 'art': 'clubs/panathinaikos/gate-13', 'focus': [0.55, 0.5], 'zoom': [1.0, 1.1], 'head': 'Panathinaikos\nfans.', 'kicker': 'This one is for you', 'say': "Panathinaikos fans. This one's for you.", 'lead': 0.4},
      {'kind': 'phone', 'cap': 'panathinaikos/rumble/door', 'head': '543 players\nin the deck.', 'say': 'Five hundred and forty-three Panathinaikos players are in the deck.'},
      {'kind': 'phone', 'cap': 'panathinaikos/rumble/deal1', 'head': 'Who makes\nyour five?', 'say': 'Who makes your five? Choose the position, take a card, and watch the budget.'},
      {'kind': 'clip', 'clip': 'panathinaikos/rumble-video', 'mark': 'kickoff', 'offset': 3.0, 'head': 'Then\nthey play.', 'say': 'Then they play.', 'min': 3.6, 'cues': [[0.3, 'crowd-build']]},
      ], accent=PAO, play=SITE + '/clubs/panathinaikos/royal-rumble')
short('rr-s6', 'rumble', 8, '2026-11-16', 'AEK fans: 1,181 players. Five places.',
      'AEK fans: 1,181 players in the deck, five places, €15M. Who makes your five?', ['#AEK', '#AEKAthens'], [
      {'kind': 'art', 'art': 'clubs/aek-athens/matchday-walk', 'focus': [0.5, 0.5], 'zoom': [1.0, 1.1], 'head': 'AEK fans.', 'kicker': '1,181 players in the deck', 'say': 'AEK fans. One thousand, one hundred and eighty-one players in the deck.', 'lead': 0.4},
      {'kind': 'slam', 'head': 'Five places.', 'say': 'Five places.', 'min': 1.6, 'ground': '#15130F'},
      {'kind': 'phone', 'cap': 'aek-athens/rumble/deal1', 'head': 'Fifteen\nmillion.', 'say': 'Fifteen million. Who makes it, and who misses out?'},
      {'kind': 'clip', 'clip': 'aek-athens/rumble-video', 'mark': 'kickoff', 'offset': 3.0, 'head': 'Your AEK.\nOn the pitch.', 'say': 'Your AEK, on the pitch.', 'min': 3.6, 'cues': [[0.3, 'crowd-goal']]},
      ], accent=AEK, play=SITE + '/clubs/aek-athens/royal-rumble')

short('lm-s1', 'legends', 9, '2026-11-07', "You've shouted at the manager for years. Your turn.",
      "You've shouted at the manager for years. Legends Manager: one club, its own legends, a whole season — on you.", [], [
      {'kind': 'card', 'art': 'legends-manager/build-your-legacy', 'region': [0, 430, 1672, 941], 'head': "You've shouted at\nthe manager\nfor years.", 'say': "You've been shouting at the manager for years.", 'lead': 0.4},
      {'kind': 'title', 'logo': 'legends', 'head': 'Your turn.', 'say': 'Your turn.', 'min': 2.4},
      {'kind': 'phone', 'cap': 'olympiacos/legends/door', 'head': 'One club.\nIts own legends.', 'say': 'One club. Its own legends. A whole season, on you.'},
      ])
short('lm-s2', 'legends', 10, '2026-11-09', '17 legends. One lever. Who do you sign first?',
      "Legends Manager: seventeen legends from your club's whole history, and a budget the board draws with a lever — €50M to €52M. Who do you sign first?", [], [
      {'kind': 'slam', 'head': '17 legends.', 'kicker': "From your club's whole history", 'say': "Seventeen legends. From your club's whole history.", 'lead': 0.4},
      {'kind': 'clip', **LEG_LEVER, 'head': 'The board\npulls a lever.', 'kicker': '€50M–€52M', 'say': 'The board pulls a lever for your budget.', 'min': 4.6},
      {'kind': 'phone', 'cap': LEG_DRAFT, 'head': 'Who do you\nsign first?', 'say': 'Who do you sign first?'},
      ])
short('lm-s3', 'legends', 11, '2026-11-11', 'Half-time. One down. What do you change?',
      'Half-time, one down. In Legends Manager you stand on the touchline: up to three stops a match, three changes, tactics you can turn.', [], [
      {'kind': 'card', 'art': 'legends-manager/make-the-call', 'region': [0, 340, 1300, 941], 'head': 'Half-time.\nOne down.', 'say': "Half-time. You're one down.", 'lead': 0.4},
      {'kind': 'slam', 'head': 'What do\nyou change?', 'say': 'What do you change?', 'min': 1.8},
      {'kind': 'phone', 'cap': LEG_XI, 'head': 'Shape. Captain.\nThree stops.', 'say': 'Pick the shape. Name the captain. Then up to three stops a match, and three changes.'},
      ])
short('lm-s4', 'legends', 12, '2026-11-13', '4–1 down at home. Then 6–1 away. No lead is safe.',
      'March 2024: Olympiacos lost 1–4 at home to Maccabi Tel Aviv, then won 6–1 after extra time in Serbia — through 7–5 (UEFA Europa Conference League round of 16). No lead is safe. Manage your legends.', ['#Olympiacos', '#Thrylos'], [
      {'kind': 'art', 'art': 'clubs/olympiacos/2024-piraeus-shock', 'focus': [0.62, 0.5], 'zoom': [1.0, 1.08], 'tag': ILL, 'head': '4–1 down.\nAt home.', 'kicker': 'Olympiacos v Maccabi Tel Aviv · 7.3.2024', 'say': 'March 2024. Olympiacos lose four–one at home.', 'lead': 0.4},
      {'kind': 'art', 'art': 'clubs/olympiacos/2024-el-kaabi-header', 'focus': [0.62, 0.45], 'zoom': [1.0, 1.1], 'tag': ILL, 'head': 'A week later…', 'say': 'A week later, in Serbia…'},
      {'kind': 'art', 'art': 'clubs/olympiacos/2024-victory-away-end', 'focus': [0.5, 0.5], 'zoom': [1.0, 1.08], 'tag': ILL, 'head': '6–1.\nAfter extra time.', 'kicker': 'Through, 7–5 on aggregate', 'say': 'six–one, after extra time.', 'cues': [[0.2, 'crowd-goal']]},
      {'kind': 'slam', 'head': 'No lead\nis safe.', 'say': 'No lead is safe. Manage your legends.'},
      ], accent=OLY)
short('lm-s5', 'legends', 13, '2026-11-15', 'No ratings out of 100. Just stars.',
      "Legends Manager rates every legend in stars, never in numbers — measured against his own club. Your club's hero is still a hero.", [], [
      {'kind': 'card', 'art': 'legends-manager/build-your-squad', 'region': [0, 300, 1180, 941], 'head': 'No ratings\nout of 100.', 'say': 'No ratings out of a hundred.', 'lead': 0.4},
      {'kind': 'slam', 'head': 'Just stars.', 'say': 'Just stars.', 'min': 1.6},
      {'kind': 'phone', 'cap': LEG_DRAFT, 'head': 'Measured against\nhis own club.', 'say': "Every legend is measured against his own club. So your club's hero is still a hero."},
      ])
short('lm-s6', 'legends', 14, '2026-11-17', 'Panathinaikos or AEK? Their legends need a manager.',
      "Panathinaikos or AEK? Olympiacos, Celtic, St. Pauli? Every club's legends need a manager — pick yours.", ['#Panathinaikos', '#AEK'], [
      {'kind': 'art', 'art': 'clubs/panathinaikos/terrace', 'focus': [0.45, 0.5], 'zoom': [1.0, 1.1], 'head': 'Panathinaikos?', 'say': 'Panathinaikos?', 'lead': 0.4, 'min': 1.8},
      {'kind': 'art', 'art': 'clubs/aek-athens/terrace', 'focus': [0.5, 0.5], 'zoom': [1.0, 1.1], 'head': 'Or AEK?', 'say': 'Or AEK?', 'min': 1.8},
      {'kind': 'phone', 'cap': 'olympiacos/legends/door', 'head': 'Their legends\nneed a manager.', 'say': "Every club's legends need a manager. Pick yours."},
      ])

camp['items'] = items
(HERE / 'campaign.json').write_text(json.dumps(camp, indent=1, ensure_ascii=False))
print(len(items), 'items')

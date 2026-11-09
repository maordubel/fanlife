"""Storyboard: The Win That Sent Hapoel Home — Hapoel Petah Tikva v Feyenoord, Cup Winners' Cup 1992/93.

Facts: the owner's brief (Drive pack "Hapoel PT", hapoelpt1.md / the_win_that_sent_hapoel_home.md: Hapoel museum,
Feyenoord shirt museum, DFB match page) and the club archive (club-packs/hapoel-petah-tikva: history-hpt-905..908,
r26-sc-final-win-mta). Scorers are named; minutes are not (the brief records them as disputed): early / late / after
half-time only. Hapoel never "advanced". No eyewitness, no quote, no attendance (disputed)."""
import json, sys

US = 'HAPOEL PETAH TIKVA'
C = dict(us_crest='crest-hpt.png', them_crest='crest-fey.png')
def img(src, move='push', **k): return dict(kind='image', src=src, move=move, **k)
def tag(big, small='', side='us'): return dict(big=big, small=small, side=side)
B = []
def beat(vo=None, *shots, **k):
    B.append(dict(vo=vo, shots=list(shots), **k))

# ── COLD OPEN ── the paradox
beat("Thirty September, nineteen ninety-two. Ramat Gan. Full time. Hapoel Petah Tikva have just beaten Feyenoord. Two, one.",
     dict(kind='score', us='HAPOEL<br>PETAH TIKVA', them='FEYENOORD', us_goals=2, them_goals=1, them_halves=True,
          cap='FULL TIME · RAMAT GAN · 30 SEPTEMBER 1992', bg='fans.jpg', shrink_at=99, **C),
     sound=[('whistle', 0.4, 0.9, 0.7)], pre=1.8)
beat("One of the great names of European football, beaten in Israel.", img('celeb.jpg'))
beat("And there is nothing left to celebrate.", img('raise.jpg', veil=0.62, pos='center 30%'),
     dict(kind='stamp', text='WON', side='us', x=200, y=560, dt=0.6))
beat("Because this win is the reason Hapoel are going home.", img('raise.jpg', 'panl', veil=0.66, pos='center 30%'),
     dict(kind='stamp', text='WON', side='us', x=200, y=560), dict(kind='stamp', text='OUT', side='them', x=1040, y=600, rot=6, dt=1.2))
beat("How do you win the match, and lose the tie?", dict(kind='question', text='How do you [win] the match —|and {lose} the tie?'), pad=1.2)

# ── WHO ── the club
beat(None, dict(kind='ticket', small='CHAPTER ONE', big='THE MALABS', line='HAPOEL PETAH TIKVA · BLUE SINCE 1934'), hold=2.4)
beat("Petah Tikva calls itself the Mother of the Moshavot. Football has been played here in Hapoel blue since nineteen thirty-four.",
     img('trio.jpg', 'panl', veil=0.3))
beat("And once, this club ruled Israel. Six league titles. Five of them in a row, from nineteen fifty-nine to nineteen sixty-three. A record that still stands.",
     dict(kind='ledger', us='HAPOEL P.T.', them='', rows=[['LEAGUE TITLES', 6, ''], ['IN A ROW · 1959–63', 5, '']], row_at=[0.6, 3.0]))
beat("By the nineteen-nineties, those years were a memory. The Malabs were a club looking for one more big night.",
     img('fans.jpg', 'panr', veil=0.45), pad=0.9)
beat(None, dict(kind='ticket', small='CHAPTER TWO', big='THE CUP', line='HOW A CLUB FROM PETAH TIKVA REACHED EUROPE'), hold=2.4)
beat("To understand that night, go back four months. June nineteen ninety-two. The Israel State Cup final.", img('trio.jpg'))
beat("In the semi-final, Hapoel edged Beitar Tel Aviv, one, nil. One more game to Europe.",
     img('net.jpg', 'pull', veil=0.25, tag=tag('1 – 0 BEITAR TEL AVIV', 'STATE CUP SEMI-FINAL · 2 JUNE 1992')))
beat("Hapoel Petah Tikva beat Maccabi Tel Aviv, three, one, after extra time. The club's second cup, thirty-five years after the first.",
     img('hug.jpg', 'panr'), dict(kind='image', src='hug.jpg', move='panr', tag=tag('3 – 1 AFTER EXTRA TIME', 'STATE CUP FINAL · 9 JUNE 1992'), fade=False))
beat("A cup meant a ticket to Europe. The Cup Winners' Cup, where every club in the draw had won its own country's cup.",
     dict(kind='rule', small='THE COMPETITION', title="CUP WINNERS' CUP", text="One club from each country: the winner of its national cup."))
beat("First, a preliminary round. Norway. Strømsgodset.", img('pitch.jpg', 'panl', veil=0.3))
beat("Nineteen August, Drammen. Hapoel win two, nil away from home.", img('celeb.jpg', 'pull', veil=0.25, tag=tag('0 – 2 IN DRAMMEN', '19 AUGUST 1992')))
beat("Two September, Ramat Gan. Two, nil again. Four, nil on aggregate. Hapoel Petah Tikva are in the first round.",
     img('hug.jpg', 'panr', veil=0.3, tag=tag('4 – 0 ON AGGREGATE', 'PRELIMINARY ROUND · STRØMSGODSET')))
beat("Then the draw for the first round. And a name nobody in Petah Tikva wanted to see.", img('fans.jpg', veil=0.5))
beat("Feyenoord. Of Rotterdam.", dict(kind='score', us='HAPOEL<br>PETAH TIKVA', them='FEYENOORD', us_goals='?', them_goals='?', them_halves=True,
     cap="CUP WINNERS' CUP · FIRST ROUND · 1992/93", bg='pitch.jpg', **C), pad=1.0)
beat("Champions of Europe in nineteen seventy. Winners of the UEFA Cup in nineteen seventy-four. A club with a stadium built for nights like this.",
     dict(kind='ledger', us='', them='FEYENOORD', rows=[['EUROPEAN CUP', '', 1970], ['UEFA CUP', '', 1974]], row_at=[0.6, 2.6]))
beat("De Kuip. Opened in nineteen thirty-seven. A bowl of steel and noise, close enough to the pitch to touch the players.", img('duel.jpg', 'panl', veil=0.35))
beat("Hapoel were not European regulars. On paper, this was not a tie. It was a lesson.",
     dict(kind='question', text='On paper, it was not a tie.|It was a [lesson].'), pad=1.0)

# ── THE BUILD-UP ── Rotterdam
beat(None, dict(kind='ticket', small='CHAPTER THREE', big='ROTTERDAM', line="FIRST LEG · 16 SEPTEMBER 1992 · DE KUIP"), hold=2.4)
beat("Sixteen September. De Kuip. The first leg.",
     dict(kind='video', src='diorama.mp4', lt=['16 SEP 1992', 'DE KUIP, ROTTERDAM · FEYENOORD v HAPOEL PETAH TIKVA']), sound=[('murmur', 0, 8, 0.4)])
beat("Feyenoord have the ball. Feyenoord have the crowd. Hapoel have a plan: stay compact, stay alive, take the tie home.",
     dict(kind='video', src='diorama.mp4', **{'from': 3}))
beat("And for almost ninety minutes, it works.",
     dict(kind='video', src='diorama.mp4', **{'from': 5}, clock=dict(at=0.2, cap='HAPOEL HOLD ON', to=0.94)), pad=1.0)

# ── THE CATALYST ──
beat("Then, late, József Kiprich.", img('duel.jpg', 'slam', veil=0.3, tag=tag('JÓZSEF KIPRICH', 'LATE', 'them')),
     flash=0.4, sound=[('groan', 0.5, 2.6, 0.6)])
beat("One, nil, Feyenoord.", img('duel.jpg', veil=0.4, mini=dict(home='FEYENOORD', score='1 – 0', away='HAPOEL P.T.', at=0.2)), pad=1.0)
beat("A defeat. But the smallest one possible. One goal, and no away goal conceded at home yet. The tie is still alive.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['AFTER LEG ONE', 0, 1]]))

# ── MIDPOINT ── Ramat Gan
beat(None, dict(kind='ticket', small='CHAPTER FOUR', big='RAMAT GAN', line='SECOND LEG · 30 SEPTEMBER 1992'), hold=2.4)
beat("Two weeks later, Feyenoord come to Ramat Gan.", img('fans.jpg', veil=0.4), sound=[('murmur', 0, 6, 0.35)])
beat("The maths before kick-off is cruel. One, nil down. And every goal Feyenoord score in Israel counts twice if the tie finishes level.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['AFTER LEG ONE', 0, 1], ['AWAY GOALS SO FAR', 0, 0]], row_at=[0.5, 3.0]))
beat("Hapoel need to win by two clear goals. Or win, and not concede.",
     dict(kind='rule', small='WHAT HAPOEL NEED', title='WIN BY TWO', text="Or win without conceding. A Feyenoord goal in Ramat Gan would count double."))
beat("For many in the stands, this was a night to see a European giant up close. Not a night to go through.", img('trio.jpg', 'panr', veil=0.3))

# ── THE CONFLICT ── the match
beat("Then the game starts. And the script flips almost at once.", img('pitch.jpg', 'pull', veil=0.2), agg=[0, 1])
beat("Nir Levin. Early.", img('seven.jpg', 'slam', veil=0.2, tag=tag('NIR LEVIN', 'EARLY')), flash=0.3,
     sound=[('goal', 0.3, 6, 0.6)])
beat("One, nil to Hapoel. One, one on aggregate.", img('seven.jpg', veil=0.25), agg=[1, 1])
beat("The tie is level. And the mood in Ramat Gan changes. Belief, where there was curiosity.", img('celeb.jpg', 'panl', veil=0.3))
beat("But level is not enough. Feyenoord still have the extra weight of an away goal they have not even scored yet.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['GOALS OVER TWO LEGS', 1, 1], ['GOALS SCORED AWAY', 0, 0]], row_at=[0.4, 2.4]))

# ── THE CLIMAX ──
beat("Half-time. Then, after the break, Moti Kakoun.", img('header.jpg', 'pull', veil=0.2, pos='center 35%', tag=tag('MOTI KAKOUN', 'AFTER HALF-TIME')),
     flash=2.6, sound=[('goal', 2.6, 6, 0.75)])
beat("A header. Two, nil.", img('header.jpg', veil=0.25, pos='center 35%'), agg=[2, 1])
beat("And for the first time, Hapoel Petah Tikva lead the tie.",
     img('huddle.jpg', veil=0.45), dict(kind='lead', text='HAPOEL LEAD THE TIE', dt=0.4), pad=1.4)
beat("Two, one on aggregate. A club from Petah Tikva, in front of Feyenoord, in Europe.", img('hug.jpg', 'panr', veil=0.3))
beat("Now the arithmetic is simple. Keep Feyenoord out, and Hapoel are through.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['GOALS OVER TWO LEGS', 2, 1], ['GOALS SCORED AWAY', 0, 0]], row_at=[0.4, 1.6]))

# ── THE FALLOUT ──
beat("Then Henk Fraser.", img('fey.jpg', 'slam', veil=0.25, tag=tag('HENK FRASER', 'FEYENOORD', 'them')), flash=0.4,
     sound=[('groan', 0.6, 2.6, 0.8), ('hush', 2.6, 3, 0.5)])
beat("Two, one on the night. Hapoel still winning the match.", img('fey.jpg', veil=0.4, mini=dict(home='HAPOEL P.T.', score='2 – 1', away='FEYENOORD', at=0.3)), agg=[2, 2], agg_dt=0.3)
beat("But two, two on aggregate. And Feyenoord have scored away from home. Hapoel have not.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['GOALS OVER TWO LEGS', 2, 2], ['GOALS SCORED AWAY', 0, 1]],
          row_at=[0.4, 2.2], circle=[1, 2], note='scored in Ramat Gan', circle_at=4.0), pad=1.0)
beat("One goal changes everything. Hapoel need a third. Win three, one, and they go through.",
     dict(kind='question', text='Hapoel need [a third goal].'), )
beat("Every attack now carries the whole tie. Every cross is a chance to undo one Dutch goal.", img('net.jpg', 'pull', veil=0.25))
beat("Feyenoord do what big clubs do. They slow it down. They keep the ball. They let the clock work.", img('duel.jpg', 'panr', veil=0.35),
     dict(kind='video', src='diorama.mp4', **{'from': 1}, dt=3.0))
beat("It does not come.", img('raise.jpg', veil=0.6, pos='center 30%'), pad=1.0, agg_off=True)
beat("The final whistle. Hapoel Petah Tikva two, Feyenoord one.", img('raise.jpg', 'panl', veil=0.62, pos='center 30%'),
     sound=[('whistle', 0.2, 0.9, 0.7)])

# ── THE RULE ──
beat("In nineteen ninety-two, when the score over two legs was level, the club with more away goals went through.",
     dict(kind='rule', small='THE RULE · 1992', title='THE AWAY-GOALS RULE', text='When the score over two legs is level, the side with more goals scored away from home goes through.'))
beat("Look at the two legs side by side. Hapoel scored two goals. Feyenoord scored two. But one of Feyenoord's came in Israel, and none of Hapoel's came in Rotterdam.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['IN ROTTERDAM', 0, 1], ['IN RAMAT GAN', 2, 1], ['AWAY GOALS', 0, 1]], row_at=[0.5, 3.5, 7.0], circle=[2, 2], note='the difference', circle_at=8.5), pad=1.0)
beat("Imagine the second leg had ended two, nil. Two, one on aggregate, and Hapoel are through. No rule needed.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['IF IT ENDS 2 – 0', 2, 1]], row_at=[0.6]))
beat("Imagine it had ended three, one. Three, two on aggregate. Hapoel through again.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['IF IT ENDS 2 – 0', 2, 1], ['IF IT ENDS 3 – 1', 3, 2]], row_at=[0.1, 0.6]))
beat("But two, one meant level on aggregate. And level meant counting away goals. One for Feyenoord. None for Hapoel.",
     dict(kind='ledger', us='HAPOEL P.T.', them='FEYENOORD', rows=[['IF IT ENDS 2 – 0', 2, 1], ['IF IT ENDS 3 – 1', 3, 2], ['IT ENDED 2 – 1', 0, 1]],
          row_at=[0.1, 0.1, 0.6], circle=[2, 2], note='away goals', circle_at=4.5), pad=1.0)
beat("The rule was meant to reward the brave away side. Score in the other team's stadium, and your goal is worth more when it matters.",
     img('fey.jpg', 'panl', veil=0.4))
beat("UEFA abolished the rule in twenty twenty-one. For Hapoel, it was twenty-nine years too late.",
     dict(kind='question', text='Abolished by UEFA in [2021].|Twenty-nine years {too late}.'), pad=1.0)

# ── OUTRO ──
beat("Hapoel Petah Tikva won the night.", dict(kind='verdict', us=US.replace(' P', '<br>P'), them='FEYENOORD', us_line='WON THE NIGHT', them_line='WENT THROUGH', them_at=99, **C))
beat("Feyenoord went through.", dict(kind='verdict', us=US.replace(' P', '<br>P'), them='FEYENOORD', us_line='WON THE NIGHT', them_line='WENT THROUGH', them_at=0.2, **C),
     sound=[('claps', 0.5, 4, 0.5)])
beat("Hapoel had beaten one of the great clubs of Europe. They had led the tie. They had been one goal, one rule, away from the next round.",
     img('celeb.jpg', 'panr', veil=0.35))
beat("Today Petah Tikva play at HaMoshava Stadium, home since twenty eleven. The blue is the same. And so is the memory of that night.",
     img('fans.jpg', 'push', veil=0.4))
beat("A famous win. A painful exit. And a night Petah Tikva still talks about.", img('huddle.jpg', 'push', veil=0.35), pad=1.2)
beat("Subscribe to FanLife Football Stories for more forgotten European nights.",
     dict(kind='end', title='The Win That Sent Hapoel Home', line='YouTube @FanLifeFootballStories'), pad=3.0)

json.dump({'slug': 'hpt-feyenoord-1992', 'minutes': [7, 9], 'voice': 'bm_george',
           'palette': {'us': '#1F4EA8', 'them': '#D7192A', 'paper': '#F1E8D3', 'ink': '#14110D'},
           'us': {'name': US, 'crest': 'crest-hpt.png'}, 'them': {'name': 'FEYENOORD', 'crest': 'crest-fey.png'},
           'beats': B}, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
print(len(B), 'beats', sum(len((b['vo'] or '').split()) for b in B), 'words')

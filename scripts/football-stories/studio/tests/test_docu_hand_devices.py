"""The editing language for a hand-written storyboard (docu/build.held_boards, turn_cards, the AEK eagle)."""
from studio.docu import build as B


def _beat(t, d, vo=None, **meta):
    b = {'t': t, 'd': d, 'shots': [], 'meta': meta}
    if vo:
        ws = vo.split()
        b.update(vo=vo, vo_t=t + 0.2, vo_d=d - 0.6)
        b['meta']['words'] = [round(t + 0.2 + i * (d - 0.6) / len(ws), 3) for i in range(len(ws))]
    return b


def test_one_board_a_match_turning_on_each_goal():
    L = dict(id='leg1', small='AEK · DERBY')
    beats = [_beat(0, 5, board=dict(L, score='0–0')), _beat(5, 4, board=dict(L, score='1–0', flip_at=1.2)),
             _beat(9, 4, board=dict(L, score='2–0', flip_at=1.4)), _beat(13, 3), _beat(16, 4, board=dict(id='leg2', score='0–0'))]
    B.held_boards(beats)
    first = [s for s in beats[0]['shots'] if s['kind'] == 'flap']
    assert len(first) == 1 and first[0]['corner'] and first[0]['frm'] == first[0]['to'] == '0–0'
    assert first[0]['turns'] == [[6.2, '1–0'], [10.4, '2–0']]
    assert abs(first[0]['d'] - 12.9) < 1e-6          # to the end of the match's last beat, not beyond
    assert not any(s['kind'] == 'flap' for b in beats[1:4] for s in b['shots'])
    assert any(s['kind'] == 'flap' for s in beats[4]['shots'])   # the next match has its own board


def test_turn_cards_two_a_film_45s_apart_on_the_words():
    beats = [_beat(20, 6, 'But Derby score twelve at home. And more.', turn=True),
             _beat(40, 6, 'But this one is too close to the first.', turn=True),
             _beat(80, 6, 'Until a club from Athens came.', turn=True),
             _beat(140, 6, 'But a third card is one too many.', turn=True)]
    B.turn_cards(beats)
    cards = [(b['t'], s['text']) for b in beats for s in b['shots'] if s['kind'] == 'word']
    assert cards == [(20, 'BUT DERBY SCORE|TWELVE AT HOME.'), (80, 'UNTIL A CLUB|FROM ATHENS CAME.')]


def test_aek_has_its_eagle():
    assert B.CLUB_SHAPES['aek-athens'] == 'eagle' and 'eagle' in B.SHAPES
    assert 'svg' in B.shape_mask('eagle')

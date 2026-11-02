# FanLife: Football Stories — art for the "follow us" moment

For the owner (2.11.2026). From now on every film stops once, early, to ask the viewer to subscribe. It is
built as a moment on the terrace rather than an advert: a supporter's card the viewer fills in, a JOIN US! stamp, and a
subscribe button that is pressed exactly when the narrator says "subscribe". The button turns to SUBSCRIBED, the bell
rings and the crowd cheers.

**Where it sits:** at the end of the second chapter. By then the viewer has had the hook and the first act, so they know
what the channel is. The closing line of every film ends the same way: *"…subscribe, and the next one will find you."*

**What it says:** one of four lines, picked per club and season so two films in a row don't repeat. Each speaks to real
supporters, for example *"If you've ever stood in the rain for ninety minutes and called it a good day, you belong
here."* No begging, no promised schedule, no numbers.

It already works with the current library. The pieces below make it look like it was drawn for this moment.

Use the **style block and colour rule from doc 55** (§1–§3) in front of every prompt, plus the doc 56 rules:
- Write colours in words, never as a hex code.
- **No letters and no digits anywhere.** The studio prints "Subscribe", "Join the terrace" and the card fields itself,
  in The Weekly's type.

There are two kinds:
- **A `-kr`:** the only colour is signal red. The studio repaints it into each club's colour.
- **B `-n`:** no colour.

---

## 1 · Backdrops (16:9, 3840×2160, no text)

| Key | Picture | Used for |
|---|---|---|
| `follow-seat-kept-kr` | A packed terrace from behind and slightly above. In the middle, one empty step with a folded signal-red scarf laid on it, waiting for someone. Floodlights, evening. | The main backdrop: "a place kept for you" |
| `follow-turnstile-welcome-kr` | An old iron turnstile seen from inside the ground. A steward from behind waves the next person through. Signal-red scarves in the queue beyond. | Alternative backdrop |
| `follow-away-end-gap-kr` | An away end in a foreign ground, a small crowd in signal-red scarves with one obvious gap in the front row. | The follow moment in films about European runs |
| `follow-pub-door-kr` | The open door of a corner bar on matchday, warm light inside, signal-red scarves on hooks, an empty stool at the bar. | Films about the old days and local clubs |

## 2 · Cut-outs (transparent PNG, 2400 px tall, no face visible)

| Key | Picture | Motion in the film |
|---|---|---|
| `fig-supporter-wave-in-kr` | A supporter seen from behind, half-turned, waving an arm towards the side of the frame, as if calling a friend over. Signal-red scarf. | Slides in beside the card |
| `fig-supporter-make-room-kr` | Two supporters from behind, stepping apart on a terrace step to make room between them. | Rises from the bottom; the button lands in the gap |
| `close-hand-press-n` | A hand with the index finger pressing down on a large, plain, round button. The button is blank, no colour, no marks. | Replaces the drawn arrow pointer at the click |
| `close-scarf-handover-kr` | Two hands, one passing a folded signal-red scarf to the other. | Pops in after the click, as the "welcome" |
| `prop-handbell-n` | An old black iron hand bell, ringing, motion lines drawn in paper style. | Rings over the button after the click |
| `prop-member-card-blank-n` | An old-fashioned paper supporters' club card, cream, with a perforated edge and empty ruled lines. No text, no logo. | Can replace the printed card's paper |

Add this line to every prompt: `Isolated, on a transparent background, no ground, no shadow, no face visible, no letters, no digits.`

## 3 · Clips (silent MP4, 1920×1080, 25 fps, about 6 s, paper stop-motion)

| Key | What moves | Ends on |
|---|---|---|
| `clip-terrace-makes-room-kr` | A row of supporters from behind shuffles apart and opens a gap. The camera moves slowly into the gap. | The gap, held still for 1 s |
| `clip-scarf-thrown-kr` | A signal-red scarf is thrown towards the camera and fills the frame. | The scarf filling the frame, flat |
| `clip-bell-rings-n` | A hand bell rings, with paper motion lines. | The bell at rest |

Each clip must **end on a still frame**, because the studio holds the last frame while the narrator finishes.

## 4 · Layered scene for parallax (optional, the best version)

`layer-follow-terrace-kr` in three files of the same picture (see doc 56 §1):
- `-bg`: floodlights and the night sky.
- `-mid`: the far stand and the pitch.
- `-fg`: heads and raised scarves along the bottom third, with one gap in the middle.

The studio puts the subscribe button in that gap.

## Delivery

Put everything in one ZIP and name each file by its key: `follow-seat-kept-kr.png`, `clip-terrace-makes-room-kr.mp4`.
Upload it in the chat. I ingest it with `ingest-art.py` (de-yellow, cut-outs, recolour test), and from the next film
on the follow moment uses the new pieces by itself.

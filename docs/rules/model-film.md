# Every Football Stories film is assembled in the model's order, and ships as the model's package (owner, 13.11.2026)

Owner, on the AEK 0–1 Panathinaikos example (7.11.1994): *"Take it as the assembly model for all our films
automatically. I want a full package: the opening, a smart ending, the HOOK, REELS, SHORTS, an automatic marketing
package for social."* After watching it (13.11.2026): *"Complete the production of the full package, plus production
rules for the studio, and upload everything to my YouTube smartly."*

These are the studio's production rules. Each one is checkable; "gate" names the check in `studio/qa.experience` or
`studio/docu/model.gate` that holds it, "review" means a person looks at the contact sheet. The long explanation, the
specs and the gap list against the automatic pipeline are in `docs/fanlife/74-model-film.md`; the model film is
`scripts/football-stories/studio/docu/films/pao_aek_1994.py`. Rule 142 (no shake, no flicker, no flash) stands over all of it.

## A. The order of a film

1. **Ident** ≤ 3 s, no narration, before the first line.
2. **Cold open**: 4–6 close looks of the story's own objects, one picture per sentence, each ≤ 3.3 s, about 12 s in
   all. Sentence one is a concrete stake off the record. No "In 1994…" opener. The result is withheld.
3. **The question card**: the film's question in ≤ 7 words, full screen, on screen before 0:15 (gate: stake inside 15 s).
4. **Title sting** 2.5–3 s: the only place the title is shown before the end.
5. **Chapters**, 3–5 of 30–50 s, each opening on a ticket card and **ending on a turn** (a "but / now / then" line the
   next chapter answers; the last look pushes in). Every chapter holds at least one explainer.
6. **The decisive moment is a mini-drama**: clock → the set-up drawn → a held breath (music out, ≥ 0.9 s pause) →
   release on a hard cut, the score flipping on the cut → a short joy burst → the turn.
7. **Pressure passages** shrink: shorter lines and looks, one device constant (the clock). Nothing nobody recorded.
8. **Payoff in explainers** (results strip, table, ledger), a picture every ≤ 20 s, ending on what the table carries.
9. **Bookend**: the opening card shown again and answered on screen.
10. **Last pages**: one or two sourced afterlives, ≤ 18 s, never a moral.
11. **Hand-over**: names the NEXT film (a real one from the series plan) and makes one subscribe ask in the supporter's
    voice (rule 136). **End card** 5 s with the right half free for YouTube's end screen.
12. Running time 4–7 minutes, never padded; narration about 148 words a minute.

## B. Facts

13. Every line said or shown has **two independent publishers** (our archive is one; the owner's brief is one), or it
    is cut or softened to what both support ("more than seventy caps", "deep in extra time"). Rules 2, 11, 16, 18.
14. Every film ships a **claim ledger** (`FACTS.md`): each claim of the brief with its verdict (verified / corrected /
    cut / softened) and sources; what was cut is listed with the reason so nobody re-adds it.
15. **No device prints a word outside the ledger**: no line-up board without a sourced line-up, no quote without a
    source, no crowd figure from one publisher.
16. Names are said as an English commentator says them: every name the film speaks is in
    `studio/kit/pronounce/lexicon.json` before the render, and someone listens to the first render.

## C. Pictures

17. **The story's own pack first** (the owner's pictures for that match); the common library only through the media
    index (`studio/media_index.py`), which refuses another club's art and logs every use.
18. **One world, few inks**: every library picture is redrawn in the film's inks (`inked`: ink → cream with halftone,
    only the club's colour kept). The owner's paper-cut scenes stay in full colour as the hero scenes.
19. **No stand-in passed off as the real thing.** A generic picture is never shown as a named person or a named
    ground: a person or a place without its own picture gets a card, a schematic, the dossier or an abstract treatment.
20. No picture on more than **two beats**; a rival's colour never on a card that carries the club's identity.
21. A stamp or label over a busy picture sits on a **paper plate** (`stamp plate=True`) or is not used; nothing
    overflows its shape (review).
22. A headline number (a streak, a points total) **fills the frame** (`form big=True`, the word card), never a small
    strip on an empty sheet.

## D. Pace and mix (gate)

23. No still past 4 s; no measurable static stretch over 1.5 s (gate: static shot).
24. Plain art ≤ 55 % (+3) of the running time; an explainer in every chapter (gate: language mix).
25. No more than about 20 s in one visual language (scene → explainer → type → scene) (model gate: language run).
26. Never the same camera move, treatment or transition three times running; the move follows the beat's emotion
    (`studio/camera.py`, `docu/editor.direct`).
27. Target ≥ 26 visible changes a minute today; the Vox reference (`claude/edit-reference-vox-2026-11-13.md`) runs
    about 45 and is the direction.

## E. The package every film ships with

28. `film.mp4` 1920×1080, 30 fps, H.264 + AAC 48 kHz, burned captions, −14 LUFS; `film.srt` from the final timings.
29. `qa.txt` (the gate's report, all checks passing) and `contact-sheet.jpg` (one frame every 8 s) **that a person looked at**.
30. Two thumbnails 1280×720, the hook off the record in ≤ 4 words, legible at 168×94.
31. **Three Shorts** 1080×1920, ≤ 45 s: open loops built from the film's own takes, stopping before the answer, ending
    on "Watch the full film". **Two Reels** 20–40 s that stand alone.
32. Vertical: every picture has a named `focus` and the 9:16 window is cut around it, never a centre crop; a camera
    move on every scene; the hook in type from frame 1; no near-empty frame (review).
33. `MARKETING.md` + `social-pack.json`: titles, description with chapters and sources, pinned comment, captions per
    platform, a seven-day schedule in Europe/Athens time; `youtube.json` with what the uploader needs.

## F. Publishing

34. **YouTube gets the film and the three Shorts**, film first; Shorts follow on later days, each pointing to the film.
    The two Reels go to Instagram, Facebook and TikTok, not to YouTube.
35. Every upload: "not made for kids"; altered/synthetic content **Yes** (illustrated reconstruction, synthetic
    narrator); its own thumbnail; captions from `film.srt`; the pinned comment; the film in the series playlist.
36. Only to the channel **FanLife: Football Stories** (`UC2KULoLBFCSZC4jeRGYkKfQ`); evening slots in Europe/Athens
    time; nothing goes public before the gate passed and the contact sheet was looked at.

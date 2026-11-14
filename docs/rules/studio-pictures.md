# How the studio chooses pictures and cut-outs (owner, 14.11.2026)

Owner, 14.11.2026: *"The studio still makes very boring films that do not follow the rules I asked for: no right choice
of graphics, no right editing, the feel of a long slideshow, inaccurate details, in how the players look — if the film
talks about a dark-skinned player he must be dark-skinned in the graphics too. A film about Panathinaikos cannot pick
pictures of a crowd with red scarves."* And: *"A player named in the film appears only in a picture tagged for him,
right in look and era; otherwise a card — make it in Flow if missing."* And: *"smarter use of PNGs: elements and figures
that enter the edit inside a moving situation; build a PNG library that fits all films, besides what each film makes."*

1. **A rival's colour in the picture refuses it.** The media index reads the picture's own pixels
   (`media_index.printed`, 1.5 % of saturated pixels in a banned family), not only its metadata. A key-red library piece
   is repainted in the club's colour, so it stays a candidate.
2. **A line that names a real person** (a name in the narrator's lexicon or a scorer in the ledger: `docu/plan.named`)
   gets no library figure: no generic player picture behind it (`people_pictures`) and no figure cut-out in front of it.
   The place, the crowd, the archive or a card carries the line, until a picture tagged for that person exists.
3. **Pictures of a named person are made for him**, in Flow, through the art library (`cinema/flow_library.json` →
   the Flow operator, docs/fanlife/70): described by kit, build, skin, hair and era, never by name, year or club in the
   prompt. **Automatic (14.11.2026):** the plan writes every named person with no picture of his own to the job's
   `flow-people.json`; after the film, `studio/looks.after_film` researches his look with grounded Google Search and keeps
   a feature only when a source covers it (`kit/people/looks.json`, with the sources). Skin, hair and build all grounded →
   three pieces (`person-<slug>-<era>-portrait|celebrate|action-fl1-kr`) join the Flow list and the worker commits them;
   anything less → no order, asked again in 30 days, the card holds. Once drawn, the plan puts his own picture of the
   film's era on his lines (`docu/plan.own_picture`) and never on a line that does not name him.
4. **The PNG library is used in every documentary.** The Flow library's keyed pieces (people, supporters, objects,
   documents, era objects — cut from their paper in `cinema/library.cut_out`) and the kit's cut-outs enter through the
   media index (`kind: cutout`). Each picture beat gets the cut-out whose subject matches its line, rising in on its
   own layer in front of the picture (`docu/plan.index_cutout`), painted in the club's colour. A cut-out that has nothing
   to do with the line is not used. It enters as the thing it is (`docu/plan.entrance` → `build.Film.cutout`): a person
   walks in from his side, a celebration rises, a ball or scarf is tossed in on an arc, a ticket or a newspaper drops
   onto the scene, anything else slides in; every entrance eases out and stops (rule 142).
5. The picture still moves as one sheet (`no-sliced-parallax`); the editing rules are `editing-language`; the order of
   a film and its package are `model-film`.

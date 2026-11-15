# Studio: smooth motion, cut-outs that belong to the scene, the film's texture (owner, 16.11.2026)

Owner, 16.11.2026, on the AEK–Derby film: *"The motion isn't smooth, the PNG doesn't appear right, there's no
HyperFrames, not enough VOX effects and viewing experience."*

- **Motion blur.** Every DOCU page renders with HyperFrames' own motion blur (`data-motion-blur="on"`, shutter 90 on
  the composition root): whips, slams and entrances smear along their real path instead of stepping.
- **Cut-outs are cut from the same paper as the scene.** A PNG figure carries a cream paper edge and a hard cast
  shadow, is at most 700 px tall, always stands whole inside the frame and on its foot, and once in, drifts against
  the picture's move as the nearest depth plane (`build.Film.cutout`). The writer never puts a figure over a scene
  that already shows the same action (no second striker over a striker).
- **The film's texture.** Paper grain and a soft vignette over every frame (the registry's `grain-overlay` and
  `vignette`, made seekable).
- **The club's shape comes from the club.** A shape is traced from the club's own crest (AEK's double-headed eagle,
  traced with potrace) rather than drawn by hand.
- **The club's language** is on the cards (`studio-club-language.md`).

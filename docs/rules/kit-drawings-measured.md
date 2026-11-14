# Kit drawings follow the reference, measured — sponsor in its real place and size (14.11.2026)

**Owner, 14.11.2026:** a thorough round so every kit SVG looks as close to the original as possible, with emphasis on the sponsor's position and size; sponsor graphics that differ from the original or are missing are fixed.

- Stripes and hoops are measured from each kit's reference drawing (`scripts/kits/measure-cof.py` → `shirt.measured.runsX/runsY`) and drawn run by run (`scripts/kits/kit-render.js`); hoops continue across the sleeves. A kit whose reference is a photograph borrows the runs of the nearest-season catalogue kit of the same design (`runsFrom`).
- The sponsor sits on the armpit line, about 55–60% of the chest wide, like the references; lettering fills that box whatever the name's length.
- A sponsor with a real logo file prints it (`content/manual/maker-marks.json` → sponsors): the brand's own file (Wikimedia Commons public-domain text logos, simple-icons), cut to the printed shapes — single-colour in the shirt's sponsor ink where the shirts print it so, in colour on a light plate otherwise. A brand with no trustworthy file stays lettered; a wrong file is worse than lettering.
- Rule 8 holds: yellow in a colour mark is re-inked to the palette's orange and the file is measured in `content/manual/kit-templates.json`.

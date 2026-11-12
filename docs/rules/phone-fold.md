# On a phone: the hook and the doors first, the rest behind one button

**Owner, 12.11.2026.** "Too much information, too long. An average fan can get lost. Keep the brand, make it shorter and more correct, with a better hook."

- At 900px and below the hub prints, in this order: masthead → the hero (your club / pick a club) → pins → the next matches → LIFE → Legends Manager → the counter (shirt market + shop) → Football Stories → the clubs. Everything else (`data-fold`: the cover, "Inside this issue", the dock links, the ballot, the editor's letter, the back pages) waits behind `IssueFold` ("The rest of this issue").
- A club's home prints: masthead → pins → today's pick and Kick off → the next match → Pick a gate → LIFE. The Legends banner, the film banner, "Did you know?", the supporter card and the flavour lines are folded ("More from the club"). The contents rows stay.
- Nothing is removed and the desktop spread is unchanged: the fold is CSS on the phone only, the HTML is all there, and a link to a folded section (`#suggest`, `#card`) opens the fold by itself.
- A new section on either page must decide: is it part of the hook, or is it `data-fold`?

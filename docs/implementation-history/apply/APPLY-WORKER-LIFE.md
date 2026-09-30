# THE WORKER LIFE — how to apply this delta

No terminal. Everything below is clicking in GitHub's web interface.

## 1. Upload — three zips, three commits

The artwork is 36 MB, which is more than one upload wants to carry, so it comes in three
files. Do them in this order; each one is the same four clicks.

1. Open `github.com/maordubel/The-Worker`.
2. Click **Add file → Upload files**.
3. Unzip **`the-worker-life-1-CODE.zip`** and drag its contents onto the page — the
   `app`, `components`, `lib`, `scripts`, `tests`, `docs`, `messages` folders and
   `CLAUDE.md`, `package.json`, `package-lock.json`. GitHub keeps the folder structure.
4. Commit straight to `main` (or to a branch and merge — either is fine).
5. Repeat steps 2–4 with **`the-worker-life-2-ART-A.zip`**, then with
   **`the-worker-life-3-ART-B.zip`**. Each of those contains only `public/life/art/`.

Order matters only in that the site will look wrong between the first and the last
commit — the code will be asking for pictures that are not there yet. Once all three are
in, it is complete.

Uploading **adds and overwrites**; it never deletes. That is why nothing in this delta
needs a file removed, and why retired files ship as inert tombstones instead.

## 2. One manual delete (pre-existing, not from this work)

Three stale files break `npm run test` and `npm run typecheck` on the GitHub tree. They
predate this game and are unrelated to it. To clear them:

1. Open `lib/ingest/` in GitHub.
2. For each of the three `.ts` files there, click the file → the **⋯** menu at the top
   right → **Delete file** → commit.

If you would rather not touch them, everything in this delta still builds and runs — the
game does not import them.

## 3. What to look at first

Open `/life` on a **phone**. That is the screen this pass was built for.

- The controller is now a real object at the bottom: a ball-top arcade stick on the left,
  and two buttons on the right — **A** (red, says what it will do) and **B** (dark).
- On a computer the same strip becomes a keycap legend: arrows/WASD, **E**, **Shift**.
  The E cap lights red exactly when something is in reach.
- Between them is the name of whatever you are standing next to. If it is locked it turns
  red and says `נעול`.

Then try to leave the flat without opening the drawer. You cannot, and the door tells you
why. Then try to walk east without knowing there is a match on. Same.

Then talk to anybody twice and press the **X** in the corner of the dialogue box.

## 4. What changed, in one list

- `components/life/ControlDeck.tsx` — new. The only console; two designs, one scheme.
- `components/life/LifeLine.tsx` — new. The four ages of the protagonist.
- `components/life/TouchPad.tsx`, `components/life/Prompt.tsx` — now tombstones.
- `components/life/DialogueBox.tsx` — the X, on every line of every conversation.
- `lib/life/runtime/dialogue.ts` — `leave()`, which applies nothing.
- `lib/life/world/scenes.ts` — `needs` / `blockedHe` on doors; two real locks.
- `lib/life/content/chapter1986.ts` — new; `chapter1980.ts` is a tombstone.
- `lib/life/anchor-server.ts` — the 1985/86 title and the 1982/83 cup.
- `lib/life/save.ts` — `SAVE_VERSION` 2; version-1 saves are dropped, not migrated.
- `public/life/art/` — the nineties cast, the protagonist at three later ages, and five
  new people: Sinai, Tikva, Gershon, Elimelech, Keren.
- `scripts/life/build-art.py` — de-yellow now desaturates before it rotates, so an olive
  uniform stays olive.
- `tests/life.test.ts` — 61 tests. `scripts/life/playthrough.mjs` — four viewports.

## 5. One decision for you

Gershon's rival kit went through the same de-yellow as everything else (rule 8), so it
ships **amber-and-black** rather than yellow-and-black. It reads unmistakably as the enemy
kit and nothing in the repo is yellow. If you want it true yellow, say so and I will add a
named rule 8 exemption for those five files — it is a one-line change to the rule and to
the build script.

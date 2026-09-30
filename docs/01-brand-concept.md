# The Worker — Brand Concept

> **Superseded.** The "archival letterpress" territory that lived here was replaced on
> 31 August 2026 by **אוסישקין — התיק, הקיר והמגדל**, designed in Claude Design and
> handed off as `The Worker - Brand Kit.dc.html`.
>
> The implementation spec is **`brand/THE-WORKER-BRAND-SPEC.md`** — tokens, the four
> faces, six components, eight screen recipes, the motion table and a twenty-point
> acceptance checklist. That file is the authority; this one is history.

## What changed, and why it is better

The letterpress concept was right about the register — an archive, printed, no
shadows, no rounded corners — and wrong about the metaphor. "Newspaper nostalgia" is
a mood. The new system is **three instruments**, each with a job:

| Instrument | What it does | Where |
|---|---|---|
| **הקיר** — the pasted sheet | how content arrives: a new sheet each morning, covering yesterday's, the edge left out | home, archive content, results |
| **התיק** — the hammer-and-sickle stamp | how a fact is verified: serial, source, confidence, and the stamp landing | answers, sources, profile |
| **המגדל** — the 20-lamp grid | how a number is measured: streak, score, memory, loading | every number in the product |

A metaphor you can hold produces components. A mood produces decoration.

## The system, in short

**Palette — seven tokens, and there is no eighth** (plus `--lamp-off` for night):
`--sheet #F7F5F0` · `--paper #E7E4DC` · `--ink #121110` · `--red #CE1410` ·
`--concrete #A9A49B` · `--sign #14357E` · `--muted #5A564F`.
Area split: paper 62%, ink 22%, red 12%, concrete 3%, sign blue 1%. Red is never a
background — it is cloth, stamp and primary action. Blue is signage only: the
Arabic/English line, sources, metadata.

**Three absolute prohibitions.** No yellow, in any shade, including "warm floodlight"
— the tower light is cold white. No radius: `0` everywhere, the single exception being
a lamp, which is a perfect circle. No shadow, the single exception being the night lamp
glow, `0 0 42px rgba(247,245,240,.35)`.

**Four faces, fixed roles.** Frank Ruhl Libre 900 for sheet and poster headlines, never
below 22px. Miriam Libre 700 for signage, stamps, cloth and screen names. Heebo for all
interface and body text. Courier Prime for serials, sources, times and Latin — never
Hebrew body text. Numbers are always `tabular-nums`.

**Motion is mechanical.** Stamp 240ms, lamp 90ms with a 40ms stagger, paste 320ms, peel
260ms, press 90ms. No fade as a transition, no bounce, no spring, no page transition.

## Measured contrast

ink on paper 17.4:1 · ink on wall 14.9:1 · red on paper 5.2:1 (AA) · paper on red
5.2:1 (AA) · sign blue on paper 10.6:1 · concrete on ink 7.5:1.

## Legal

The stamp is an **original mark** designed for this project. It is not Hapoel Tel
Aviv's official crest, and the official crest never goes inside it. If the club ever
grants permission, the crest enters as a separate asset in its own slot.

## Enforcement

The twenty-point acceptance checklist is executable: `tests/brand.test.ts`. It fails
the build on yellow, on any `rounded-*` outside a lamp, on any `shadow-*` other than
`shadow-lamp`, on raw hex, on physical direction utilities, on a fifth font family, on
an untranslated Hebrew string, on a second `SignPlate` in a screen, on a fourth stacked
sheet, and on a non-deterministic sheet tilt.

Handoff: `responsive-qa` — verified at 320 / 390 / 430 / 768 / 1440, no horizontal
overflow at any width, RTL confirmed.

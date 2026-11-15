# Personal prints — "Your XI, framed" (owner, 14.11.2026)

"When a supporter has built his all-time XI, offer him — fully automatically — a framed print or a poster from our template, upgraded: the players' names, more impact, a personal touch; the manager's name (his own) if he wants. Not only the XI: anything that can be a personal souvenir."

- **The offer** (`components/shop/PersonalPrint.tsx`) appears on the XI gate (best XI, complete) when the shop is open: the proof on a wall, framed print or poster, an optional manager's name ("Maor's All-Time XI"), one button. The product is made at the printer in ~20 s and the FAN LIFE checkout opens in its own window over the page.
- **The print** (`lib/shop/personal/xi-poster.tsx`, satori via `next/og`, house fonts): 3:4, drawn at 3600×4800 for the printer and 720×960 for the proof. Newsprint and ink, the club's own colour as the only accent (its shirt colour from the registry), a chalk pitch, a shirt and a name plate for each man, the captain's C, formation, captain, 12th man, manager, date. No crest; the FAN LIFE seal in one ink.
- **Safety**: the eleven travel by player id and the names printed are the archive's own; the manager's name is letters and numbers only, ≤22, with a block list (`cleanManager`). The recipe travels in a signed URL (`lib/shop/personal/sign.ts`), so nobody can forge a print. Six prints per visitor a day.
- **At the printer**: a `personal` ShopProduct made by `pressProduct` on the quality-first rules (sharp sizes only); the same XI is the same product. Never listed on /shop, not in the doctor or the desk's lists (counted in Overview), cleared after three days unless sold (hourly check-up).
- **Next templates** use the same engine (`renderXI` → one renderer per template): any list a supporter builds in FAN LIFE that is his own — collections, legends squads, match memories.

## Looks, kits and the tee (owner, 15.11.2026)
- Five looks, the supporter chooses: Touchline, Club Archive, Night Match, Kit Collection, My Dream Team. A sixth is added only if it is a real new layout.
- Each man wears our own drawing of the club's documented kit nearest his years (`public/club-kits/<club>/svg`), the shirt alone — never shorts or socks, one frame (0 20 340 300) for every drawing so all prints look alike. For print the crest picture and the sponsor's word are removed: an official mark is not ours to sell. A club without drawings gets the kit plate in the kit's colours.
- The pitch is green only where green is not a rival's colour; the Dream Team sky is blue only where blue is not (rule 95). Otherwise cream.
- Names print in the archive's Latin spelling when it has one; otherwise as kept, in visual order.
- The tee: a small XI mark on the chest, the eleven on the back, two inks on light shirts only.

# The shop prints inside the European Union first

**Owner plan, 22.11.2026.** The buyers are in Europe. Measured that day: a $16.99 T-shirt on a blank only printed in the United States cost $10.39 to send to Athens.

- **A product prints at a printer inside the EU whenever one makes the blank** (`lib/shop/europe.ts → pickProvider`). Quality still orders the EU printers (`PROVIDER_ORDER`). The United Kingdom is outside the Union's customs border and does not count.
- **A kind takes its best blank that a European printer makes** (`blueprintCandidates`, `build.ts → matchKind`): the kind's patterns in order, first one with an EU printer. Only when none has one does the best blank print abroad.
- **A match the owner chose in the desk is kept** (`KindMatch.forced`). Matches made before the rule are re-made (`policy`).
- **What is already on sale moves by itself**: the hourly check-up presses two products a run at their European printer, best sellers first (`europeMoves`). A product no EU printer makes stays, and the daily doctor counts it under "needs your eye".
- **A press never takes the old listing down before the new one exists** — a failed press leaves the product on the shelf.
- **The product page says where it is printed and what a parcel to Europe costs** (`PublicProduct.madeIn / europe / shipFrom`), only when Printify told us.
- Off switch: `settings.europeFirst=false` (no desk control yet).
- Prices: `price = cost × (1 + margin%) + the order card`, on the PRODUCT cost; the parcel is charged to the buyer at checkout. A low price is therefore not a loss.

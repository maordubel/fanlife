# A sale that is coming is announced before it starts

**Owner, 23.11.2026.** "The shop is missing, and sales are something we will have to push wisely."

- `lib/shop/sales.ts → nextSale`: the soonest sale that is switched on and starts within `TEASE_DAYS` (10). `publicShop().next` carries it.
- The shop's ribbon says "{label}: −{n}% · starts {day}" while no sale is on; the front page's shop window wears a stamp — the sale that is on (cut, name, time left) or the one that is coming (cut, name, day). Days are the owner's clock (Europe/Athens).
- It announces only what the owner already saved in the desk (Sales → Start the sale with a later start date). Nothing is promised that the shop will not charge: the price cut itself is still applied by `applySales` when the sale starts.
- A sale the owner stops, one that ends before it starts, or one further than 10 days away is not announced.
- **The desk says what a sale leaves** (`saleOutcome`): beside the % field, the real cut (the floor stops it at cost + 10%) and the share of the sale price that stays with the shop before the card fee. With a 45% mark-up: −15% leaves about 19%, −20% about 14%, −30% is stopped at −24% and leaves about 9%. The Black Friday quick-start fills its own dates (`blackFriday(year)`, four days).
- **A sale is posted three times on its own** (owner, 23.11.2026: approved): `saleBeat` — three days before, at the start, on the last day (a sale of two days or more). `announceSales` runs in the hourly shop checkup and queues ONE post through the hub's publisher (`worker_marketing_queue_shop`, the SHOP card) about a product the sale covers; the beat is marked only when the queue took it. Words: `saleWords` — "up to" whenever the floor stops the cut on some products.

# A sale that is coming is announced before it starts

**Owner, 23.11.2026.** "The shop is missing, and sales are something we will have to push wisely."

- `lib/shop/sales.ts → nextSale`: the soonest sale that is switched on and starts within `TEASE_DAYS` (10). `publicShop().next` carries it.
- The shop's ribbon says "{label}: −{n}% · starts {day}" while no sale is on; the front page's shop window wears a stamp — the sale that is on (cut, name, time left) or the one that is coming (cut, name, day). Days are the owner's clock (Europe/Athens).
- It announces only what the owner already saved in the desk (Sales → Start the sale with a later start date). Nothing is promised that the shop will not charge: the price cut itself is still applied by `applySales` when the sale starts.
- A sale the owner stops, one that ends before it starts, or one further than 10 days away is not announced.

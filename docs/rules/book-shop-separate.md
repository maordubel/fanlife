# The book's shop is separate (Broken Collective, 17.11.2026)

Owner: "the book's products never appear in FAN LIFE's shop, and FAN LIFE's never in the book's."

- FAN LIFE's server only hosts the doors: `/api/book/{give,paperback,goods,quote,lulu,printify,tick}` and the reader's journey page `/book/order/<id>` (rule book-order-journey). The pages that sell are on the book site (dubelteam.com/broken-collective).
- Orders live in `public.worker_book_orders`, never in `worker_pay_orders` or the shop document.
- Tip and paperback go through Stripe → Lulu Print API. The T-shirt and cap go through Stripe → Printify, **only** into the Printify store titled "Broken Collective" (or `BOOK_PRINTIFY_SHOP_ID`). `bookShop()` refuses a store whose title says FAN LIFE, and no Printify product is created — every order prints the book's artwork on the fly.
- One Stripe webhook: `/api/pay/webhook` hands events with `metadata.book` to `lib/book/fulfil`. The Lulu and Printify webhooks are registered by the server itself on the first order.
- Nothing from `lib/shop` lists, links or promotes book goods; nothing in `lib/book` reads FAN LIFE's shop document.

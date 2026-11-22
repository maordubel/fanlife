-- Broken Collective orders must reach the printer on their own (owner, 22.11.2026: "the process must be fast and reliable").
-- fix: owner-supplied corrections to what Stripe collected (e.g. {"postcode":"10563"}), applied on the next attempt.
-- attempts / alerted_at: the retry loop's counter and the time the owner was told an order is stuck.
alter table public.worker_book_orders add column if not exists fix jsonb;
alter table public.worker_book_orders add column if not exists attempts integer not null default 0;
alter table public.worker_book_orders add column if not exists alerted_at timestamptz;

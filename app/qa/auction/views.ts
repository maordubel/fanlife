/** Every state the harness can draw — a plain module, so the server page and the client can both read it. */
export const QA_VIEWS = [
  'board',
  'lot-live',
  'lot-outbid',
  'lot-guest',
  'lot-upcoming',
  'lot-seller',
  'lot-won',
  'lot-completed',
  'lot-ended',
  'lot-photos',
  'submit',
  'admin',
] as const
export type QaView = (typeof QA_VIEWS)[number]

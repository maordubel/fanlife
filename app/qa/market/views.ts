/** Every state `/qa/market` can draw — a plain module, so the server page and the client preview share it. */
export const VIEWS = [
  'board',
  'board-guest',
  'board-slug',
  'board-empty',
  'board-off',
  'listing',
  'listing-own',
  'listing-guest',
  'listing-archive',
  'thread-request',
  'thread',
  'thread-waiting',
  'thread-done',
  'shops',
] as const
export type View = (typeof VIEWS)[number]

/** UI hints only. Neither platform nor non-empty initData authenticates a user. */
export function telegramLaunchMode(app: { initData?: string; platform?: string } | undefined): 'unavailable' | 'preview' | 'guest' | 'verify' {
  if (!app) return 'unavailable'
  if (app.initData) return 'verify'
  return app.platform && app.platform !== 'unknown' ? 'guest' : 'preview'
}

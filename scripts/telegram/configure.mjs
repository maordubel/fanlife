/** Run intentionally after deploying /telegram. Reads the token from the environment, never a file/argument. */
const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
const origin = process.env.TELEGRAM_APP_ORIGIN || 'https://fanlife.dubelteam.com'
if (!token) { console.error('Set TELEGRAM_BOT_TOKEN in a secure environment first.'); process.exit(1) }
const url = new URL('/telegram', origin)
if (url.protocol !== 'https:' || url.hostname !== 'fanlife.dubelteam.com') {
  console.error('The production Mini App must use https://fanlife.dubelteam.com/telegram.'); process.exit(1)
}
async function api(method, body) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    })
    const data = await response.json()
    if (!response.ok || data.ok !== true) throw new Error('Bot operation refused')
    return data.result
  } catch { throw new Error(`Telegram ${method} failed. Check configuration privately; no token was logged.`) }
}
try {
  // Read-only guards before changing bot configuration.
  const me = await api('getMe', {})
  if (me.username?.toLowerCase() !== 'fanlife_appbot') throw new Error('The configured token belongs to another bot. Nothing changed.')
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' })
  if (!response.ok) throw new Error('Deploy the /telegram route successfully before configuring the bot.')
  await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Play FAN LIFE', web_app: { url: url.href } } })
  console.log('The Play FAN LIFE menu button is configured. Set Main Mini App to the same URL in BotFather to enable startapp invitation links.')
} catch (error) {
  // Only deliberately constructed messages are printed, never a fetch URL/exception containing a credential.
  console.error(error instanceof Error && !error.message.includes(token) ? error.message : 'Configuration failed. Check the environment privately.')
  process.exitCode = 1
}

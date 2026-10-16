import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { telegramLaunchMode } from '@/lib/telegram/connection'

describe('Telegram UI context is separate from verified identity', () => {
  it('recognizes a native Telegram guest without pretending to authenticate', () => {
    expect(telegramLaunchMode({ platform: 'ios', initData: '' })).toBe('guest')
    expect(telegramLaunchMode({ platform: 'android', initData: '' })).toBe('guest')
  })
  it('treats missing launch data as a playable guest/preview, not a verified account', () => {
    expect(telegramLaunchMode({ platform: 'unknown', initData: '' })).toBe('preview')
    expect(telegramLaunchMode(undefined)).toBe('unavailable')
  })
  it('always requires server verification even for non-empty or forged initData', () => {
    expect(telegramLaunchMode({ platform: 'ios', initData: 'forged' })).toBe('verify')
  })
  it('loads Telegram before hydration on Telegram entry routes and avoids the browser-only warning', () => {
    const root = readFileSync('app/layout.tsx', 'utf8')
    expect(root).toContain('telegram?<Script id="fanlife-telegram-sdk"')
    expect(root).toContain('strategy="beforeInteractive"')
    expect(readFileSync('components/telegram/TelegramBridge.tsx', 'utf8')).not.toContain('Browser preview · open')
  })
})

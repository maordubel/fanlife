export type TelegramWebApp = {
  initData: string
  initDataUnsafe?: { start_param?: string }
  ready(): void
  expand(): void
  isVersionAtLeast(version: string): boolean
  enableClosingConfirmation(): void
  disableClosingConfirmation(): void
  disableVerticalSwipes(): void
  enableVerticalSwipes(): void
  openTelegramLink(url: string): void
  safeAreaInset?: { top: number; right: number; bottom: number; left: number }
  contentSafeAreaInset?: { top: number; right: number; bottom: number; left: number }
  onEvent(event: string, handler: () => void): void
  offEvent(event: string, handler: () => void): void
  BackButton: { show(): void; hide(): void; onClick(handler: () => void): void; offClick(handler: () => void): void }
}

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

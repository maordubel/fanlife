import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../club-app.css'
import './telegram.css'

export const metadata: Metadata = {
  title: 'Play inside Telegram', description: 'Your club. Your games. FAN LIFE in Telegram.',
  robots: { index: false, follow: false },
}

export default function TelegramLayout({ children }: { children: ReactNode }) {
  return <div className="telegram-app">{children}</div>
}

import type { Metadata } from 'next'

import { AdminGate } from './AdminGate'

/**
 * ניהול השוק והמכירה הפומבית (מפרט §65). לא בשום תפריט, לא במפת האתר, ולא לאינדוקס.
 *
 * מי שאינו מנהל רואה את מסך ה-404 הרגיל — לא "אין לך הרשאה", כי גם זה מידע. וזו לא ההגנה:
 * כל פונקציית `worker_admin_*` בודקת בשורה הראשונה שלה, והמסך רק שואל `worker_admin_whoami`
 * כדי לדעת מה לצייר.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminPage() {
  return <AdminGate />
}

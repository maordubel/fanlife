/** Decimal display of the immutable People Registry id. A retired number still
 * resolves through the same registry alias as its hexadecimal form. */
export function playerNumber(id: string | null | undefined): string | null {
  if (!id || !/^pl_[0-9a-f]{10}$/.test(id)) return null
  return Number.parseInt(id.slice(3), 16).toString()
}

export function personIdFromNumber(value: string): string | null {
  if (!/^\d{1,13}$/.test(value)) return null
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n > 0xffffffffff) return null
  return 'pl_' + n.toString(16).padStart(10, '0')
}

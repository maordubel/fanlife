/**
 * English card labels for the memory pairs the Hapoel archive names in Hebrew. A label is a
 * CATEGORY (what the two faces have in common), not a fact, so translating it invents nothing;
 * the faces themselves stay in their source language. An unknown label passes through unchanged.
 */
export const MEMORY_KIND_EN: Readonly<Record<string, string>> = {
  'יצרן ותקופה': 'Maker / seasons',
  'תואר ועונה': 'Title / season',
  'רגע ושנה': 'Moment / year',
  'שער ושנה': 'Goal / year',
  'לילה אירופי ועונה': 'European night / season',
  'סמל ושנים': 'Crest / years',
  'בחירות העמותה': 'Club elections',
}
export const memoryKindLabel = (kind: string, locale: string) => (locale === 'en' && MEMORY_KIND_EN[kind]) || kind

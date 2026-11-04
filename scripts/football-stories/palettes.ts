/** Prints every club's film palette as JSON (for running the studio pipeline by hand): npx tsx scripts/football-stories/palettes.ts */
import {REGISTRY} from '@/lib/master/registry'
import {paletteFor} from '@/lib/stories/clubs'
console.log(JSON.stringify(Object.fromEntries(REGISTRY.map(c=>[c.id,paletteFor(c.id)]))))

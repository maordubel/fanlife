/** Prints every club's film palette as JSON (for running the studio pipeline by hand): npx tsx scripts/football-stories/palettes.ts */
import {storyClubs,paletteFor} from '@/lib/stories/clubs'
console.log(JSON.stringify(Object.fromEntries(storyClubs().map(c=>[c.id,paletteFor(c.id)]))))

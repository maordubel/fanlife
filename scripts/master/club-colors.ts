/** Static guard complements the rendered-color checks in the browser flow. */
import {readFileSync,readdirSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {REGISTRY} from '../../lib/master/registry'
import {clubTheme,validateTheme} from '../../lib/clubs/theme'

const roots=['components/clubs','components/timeline','app/clubs']
const paths:string[]=['app/club-theme.css']
function walk(root:string){for(const name of readdirSync(root)){const path=join(root,name);if(statSync(path).isDirectory())walk(path);else if(/\.(tsx?|css)$/.test(path))paths.push(path)}}
roots.forEach(walk)
const issues:string[]=[]
for(const club of REGISTRY){const theme=clubTheme(club);issues.push(...validateTheme(theme).map(i=>`${club.id}: ${i}`))}
for(const path of paths){const text=readFileSync(path,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'')
 if(/#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(\s*\d/i.test(text))issues.push(`${path}: raw color instead of theme token`)
 if(/\b(?:bg|text|border)-(?:yellow|amber|orange|blue|green|red|purple|pink|lime|cyan|emerald|rose|indigo|violet|sky|teal)-\d{2,3}\b/.test(text))issues.push(`${path}: hardcoded color utility`)
}
if(issues.length){console.error(issues.join('\n'));process.exitCode=1}else console.log(`Club identity/color guard passed: ${REGISTRY.length} registry identities, ${paths.length} shared source files. Rival policies remain explicit, not inferred.`)

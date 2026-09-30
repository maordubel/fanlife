/**
 * npm run kits:master — writes content/generated/kit-master.json from content/manual.
 * The logic is `lib/kit/kit-master-build.ts`; this file only writes it down.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { buildKitMaster } from '../../lib/kit/kit-master-build'

const master = buildKitMaster()
const out = 'content/generated/kit-master.json'
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(master, null, 1) + '\n')
console.log(JSON.stringify(master.counts))

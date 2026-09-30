import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Install Node.js 22 or newer before starting FAN LIFE.')
  process.exit(1)
}
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
function run(args) {
  const result = spawnSync(npm, args, {stdio: 'inherit', shell: process.platform === 'win32', env: {...process.env, NEXT_PUBLIC_FAN_LIFE_EVALUATION: 'true', NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=6144'}})
  if (result.error) console.error(result.error.message)
  if (result.status !== 0) process.exit(result.status || 1)
}
if (!existsSync('node_modules/next/package.json')) run(['ci'])
console.log('Open http://localhost:3000 — keep this window open. Admin: /master/admin')
run(['run', 'dev'])

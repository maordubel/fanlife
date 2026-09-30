import { writeFileSync } from 'node:fs'
const { CODESPACE_NAME: name, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: domain } = process.env
if (name && domain) writeFileSync('.env.local', `NEXT_PUBLIC_FAN_LIFE_EVALUATION=true\nNEXT_PUBLIC_SITE_URL=https://${name}-3000.${domain}\n`)

// Node has no client bundle, so the `server-only` build guard is a no-op here — the same stub vitest uses.
const Module=require('node:module'),path=require('node:path')
const stub=path.join(__dirname,'../../tests/stubs/server-only.ts'),orig=Module._resolveFilename
Module._resolveFilename=function(request,...rest){return request==='server-only'?stub:orig.call(this,request,...rest)}

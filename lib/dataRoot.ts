import path from 'node:path'

/**
 * Where the server may write (control room state, the evaluation database, uploaded photos, research runs).
 * On Vercel the deployment folder (/var/task) is read-only — writing `.fan-life` there failed with ENOENT on
 * every request (owner, 7.10.2026). Serverless functions may only write under /tmp, which lives as long as the
 * instance; what must outlive it (the control room) is mirrored to durable storage (lib/master/durable.ts).
 */
export const onServerless = () => !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
export const dataRoot = () => path.resolve(process.env.FAN_LIFE_DATA_DIR || (onServerless() ? '/tmp/fan-life' : '.fan-life'))

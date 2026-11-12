export function originFor(host: string): string | null
declare const worker: {fetch(request: Request, env?: Record<string, string>): Promise<Response>}
export default worker

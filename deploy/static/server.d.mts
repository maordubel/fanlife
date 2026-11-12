import type {Server} from 'node:http'
export type Site = {root: string; spa: boolean; cleanUrls: boolean; notFound: string | null; dir: string}
export function load(dir: string): Site
export function resolveFile(site: Site, pathname: string): string | null
export function makeServer(site: Site): Server

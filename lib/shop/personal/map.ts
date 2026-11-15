import 'server-only'
import {geoMercator,geoPath} from 'd3-geo'
import type {Feature,FeatureCollection,Geometry} from 'geojson'
import {feature,mesh} from 'topojson-client'
import type {GeometryCollection,Topology} from 'topojson-specification'
import world from 'world-atlas/countries-50m.json'

/**
 * The "I was there" map, drawn once on the server: 1:50m countries (world-atlas, public domain) in Mercator, fitted to the
 * places he went with the home city in frame, as plain SVG paths for the print. Every point comes from the club's own
 * UEFA-built journey (lib/away-days/club) — nothing is placed by hand.
 */
export type MapPoint={lat:number;lng:number}
export type DrawnMap={land:string;borders:string;at:(p:MapPoint)=>[number,number]}
const topo=world as unknown as Topology<{countries:GeometryCollection}>
const land=feature(topo,topo.objects.countries) as unknown as FeatureCollection<Geometry>
const borders=mesh(topo,topo.objects.countries,(a,b)=>a!==b)
export function drawMap(points:MapPoint[],w:number,h:number,pad=0.14):DrawnMap{
 const lats=points.map(p=>p.lat),lngs=points.map(p=>p.lng)
 const spanLat=Math.max(6,Math.max(...lats)-Math.min(...lats)),spanLng=Math.max(9,Math.max(...lngs)-Math.min(...lngs))
 const box:Feature={type:'Feature',properties:{},geometry:{type:'MultiPoint',coordinates:[[Math.min(...lngs)-spanLng*pad,Math.min(...lats)-spanLat*pad],[Math.max(...lngs)+spanLng*pad,Math.max(...lats)+spanLat*pad]]}}
 const proj=geoMercator().fitSize([w,h],box).clipExtent([[0,0],[w,h]]),path=geoPath(proj)
 return {land:path(land)||'',borders:path(borders)||'',at:p=>proj([p.lng,p.lat]) as [number,number]}
}

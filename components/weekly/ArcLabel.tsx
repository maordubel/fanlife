/**
 * A caption bent round the underside of a raised roundel (the OUR GAMES button in both bottom bars).
 * The SVG's origin is the roundel's centre; the path is the lower arc at radius 48, so the letters stand on it with their tops towards
 * the button. Decorative: the link keeps its plain label for screen readers (an `sr-only` span beside this).
 */
export function ArcLabel({id,text}:{id:string;text:string}){
 return (
  <svg className="arc-label" viewBox="-50 -8 100 68" aria-hidden="true" focusable="false">
   <defs><path id={id} d="M -39.3 27.5 A 48 48 0 0 0 39.3 27.5"/></defs>
   <text><textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{text}</textPath></text>
  </svg>
 )
}

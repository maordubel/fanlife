import {Plate} from '@/components/weekly/Plate'

/**
 * The loading cover (shown by NavPulse over a page that is on its way): a floodlit-night comic cover —
 * speed lines, a red starburst with the dribbler breaking the frame, "Working." in the masthead face and three
 * split-flap lamps. CSS only (app/weekly/loading.css) so it paints at once; inks are tokens, so the rival lock holds.
 */
export function PressWait({label='Working.'}:{label?:string}){
 return (
  <div className="wkw" role="progressbar" aria-label={label} aria-busy="true" data-testid="press-wait">
   <span className="wk-speed wkw-speed" style={{['--sx' as string]:'50%',['--sy' as string]:'44%'}} aria-hidden="true"/>
   <div className="wkw-stage" aria-hidden="true">
    <span className="wk-burst wkw-burst"/>
    <Plate art="dribbler" ink="red" className="wkw-art"/>
   </div>
   <p className="wkw-title">{label}</p>
   <div className="wkw-lamps" aria-hidden="true"><span/><span/><span/></div>
  </div>
 )
}

'use client'

/**
 * The training camp, drawn (17.11.2026, round 2 — "graphics and UX at a proper level"): a striped training pitch at dusk with
 * its floodlight, a slalom of cones, a man in the club's shirt dribbling through them, a second man arriving to shoot, the
 * keeper diving and the net rippling; the coach on the touchline with his board. Everything is drawn here in SVG — no artwork
 * copied — in the club's livery (`--club-primary`, cleared for its own pages by rule 95) and the magazine's tokens. SMIL moves
 * the men along their paths; reduced motion shows the drill standing still.
 */
const PATH='M30 128 C52 112 66 112 80 126 S108 142 122 126 S150 110 164 126 S192 142 206 124 L250 104'
export function CampScene({reduced}:{reduced:boolean}){
 const anim=!reduced
 return <svg className="lgm-camp-svg" viewBox="0 0 320 180" role="img" aria-label="Training: a slalom through the cones, then a shot at goal">
  <defs>
   <linearGradient id="cs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--mag-night)"/><stop offset="1" stopColor="var(--mag-night-2)"/></linearGradient>
   <radialGradient id="cs-lamp" cx="0.85" cy="0" r="0.9"><stop offset="0" stopColor="var(--mag-white)" stopOpacity=".55"/><stop offset=".5" stopColor="var(--mag-white)" stopOpacity=".08"/><stop offset="1" stopColor="var(--mag-white)" stopOpacity="0"/></radialGradient>
   <pattern id="cs-grass" width="40" height="180" patternUnits="userSpaceOnUse"><rect width="20" height="180" fill="var(--mag-green)"/><rect x="20" width="20" height="180" fill="color-mix(in srgb, var(--mag-green) 82%, var(--mag-ink))"/></pattern>
   <pattern id="cs-net" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0 L5 5 M5 0 L0 5" stroke="var(--mag-white)" strokeWidth=".5" opacity=".7"/></pattern>
  </defs>
  <rect width="320" height="70" fill="url(#cs-sky)"/>
  {/* the stand and the floodlight */}
  <path d="M0 70 L0 48 L60 40 L200 40 L320 50 L320 70z" fill="var(--mag-ink)" opacity=".55"/>
  {Array.from({length:18},(_,i)=><rect key={i} x={8+i*17} y={48+(i%3)} width="9" height="2" fill="var(--mag-white)" opacity=".18"/>)}
  <g transform="translate(280 6)"><rect x="9" y="10" width="3" height="56" fill="var(--mag-ink)"/><rect width="22" height="12" fill="var(--mag-ink)"/>{[0,1,2].map(i=><circle key={i} cx={4+i*7} cy="6" r="2.4" fill="var(--mag-white)"/>)}</g>
  <rect y="70" width="320" height="110" fill="url(#cs-grass)"/>
  <rect y="0" width="320" height="180" fill="url(#cs-lamp)"/>
  {/* lines and the goal */}
  <g fill="none" stroke="var(--mag-white)" strokeWidth="1.4" opacity=".8"><path d="M0 92 H320"/><path d="M236 92 V170 M236 106 H320 M236 156 H320"/><path d="M274 106 V156"/></g>
  <g transform="translate(296 108)"><rect width="22" height="46" fill="url(#cs-net)" stroke="var(--mag-white)" strokeWidth="2">{anim?<animate attributeName="x" values="0;0;3;0" keyTimes="0;.78;.84;1" dur="4.2s" repeatCount="indefinite"/>:null}</rect></g>
  {/* the slalom */}
  {[66,102,138,174].map((x,i)=><g key={x} transform={`translate(${x} ${118+(i%2?14:-2)})`}><path d="M-5 8 L0 -6 L5 8z" fill="var(--mag-orange)" stroke="var(--mag-ink)" strokeWidth="1"/><rect x="-6" y="7" width="12" height="2.5" fill="var(--mag-ink)"/></g>)}
  <path d={PATH} fill="none" stroke="var(--mag-white)" strokeWidth="1" strokeDasharray="3 4" opacity=".35"/>
  {/* the dribbler and his ball */}
  <g>
   {anim?<animateMotion dur="4.2s" repeatCount="indefinite" path={PATH} keyPoints="0;1;1" keyTimes="0;.7;1" calcMode="linear"/>:null}
   <g transform={reduced?'translate(122 126)':undefined}><Man shirt="var(--club-primary, var(--mag-vermilion))"/></g>
  </g>
  <circle r="3.2" fill="var(--mag-white)" stroke="var(--mag-ink)" strokeWidth="1">
   {anim?<animateMotion dur="4.2s" repeatCount="indefinite" path={`${PATH} L300 128`} keyPoints="0;.86;1;1" keyTimes="0;.7;.8;1" calcMode="linear"/>:null}
  </circle>
  {/* the keeper dives */}
  <g transform="translate(288 130)"><g>{anim?<animateTransform attributeName="transform" type="rotate" values="0;0;-70;-70;0" keyTimes="0;.66;.76;.92;1" dur="4.2s" repeatCount="indefinite"/>:null}<Man shirt="var(--mag-cyan)" keeper/></g></g>
  {/* the coach and his board */}
  <g transform="translate(26 92)"><Man shirt="var(--mag-ink)"/><rect x="7" y="-6" width="12" height="15" rx="1.5" fill="var(--mag-white)" stroke="var(--mag-ink)"/><path d="M9 -2 l3 3 m0 -3 l-3 3 M14 2 a2 2 0 1 0 0.1 0" stroke="var(--mag-vermilion)" strokeWidth="1" fill="none"/></g>
  {/* goal flash */}
  {anim?<text x="250" y="88" className="lgm-camp-goal" fontSize="14"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.78;.82;.95;1" dur="4.2s" repeatCount="indefinite"/>GOAL!</text>:null}
 </svg>
}
/** a man, drawn: head, shirt, shorts, legs — 22 units tall, feet at 0 */
function Man({shirt,keeper=false}:{shirt:string;keeper?:boolean}){
 return <g transform="scale(1.35) translate(0 -22)">
  <rect x="-3.5" y="15" width="2.6" height="7" fill="var(--mag-ink)"/><rect x=".9" y="15" width="2.6" height="7" fill="var(--mag-ink)"/>
  <rect x="-4.5" y="11" width="9" height="5" fill="var(--mag-white)" stroke="var(--mag-ink)" strokeWidth=".8"/>
  <path d="M-6 3 Q0 0 6 3 L5.5 12 H-5.5z" fill={shirt} stroke="var(--mag-ink)" strokeWidth=".9"/>
  {keeper?<><rect x="-8.5" y="4" width="2.5" height="5" rx="1" fill="var(--mag-white)"/><rect x="6" y="4" width="2.5" height="5" rx="1" fill="var(--mag-white)"/></>:null}
  <circle cy="-1" r="3.6" fill="var(--lgm-bronze-hi)" stroke="var(--mag-ink)" strokeWidth=".9"/>
 </g>
}

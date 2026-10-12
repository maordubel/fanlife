import type {Celebration} from './types'

/**
 * The celebration graphics, cut from the owner's film (12.10.2026) by `scripts/legends/cut-celebrations.py` into
 * `public/legends/fx/<name>.webp` (transparent, animated) and `<name>-still.webp`. Each carries the colours it is painted in,
 * so a club page that may not show a colour (rule 95 — Hapoel Tel Aviv shows no yellow, Maccabi no red) gets the theatre's own
 * lettering in the club's colour instead of the picture. The hub shows every one.
 */
export const FX:Record<Celebration,{src:string;still:string;alt:string;colours:readonly string[];ms:number}>={
 goal:{src:'/legends/fx/goal.webp',still:'/legends/fx/goal-still.webp',alt:'GOAL!!!',colours:['#F2C21B','#E8731A'],ms:1600},
 hattrick:{src:'/legends/fx/hattrick.webp',still:'/legends/fx/hattrick-still.webp',alt:'HAT TRICK!!',colours:['#C23ED6','#F2C21B'],ms:1600},
 'fire-goal':{src:'/legends/fx/fire-goal.webp',still:'/legends/fx/fire-goal-still.webp',alt:'GOOOOOAL',colours:['#D7261E','#E8731A','#F2C21B'],ms:1600},
 win:{src:'/legends/fx/win.webp',still:'/legends/fx/win-still.webp',alt:'YOU GOT THE WIN',colours:['#F2C21B','#4AB8F0'],ms:1500},
 champion:{src:'/legends/fx/champion.webp',still:'/legends/fx/champion-still.webp',alt:'YOU ARE THE CHAMPION!',colours:['#3FB34F','#2E86C8','#F2C21B'],ms:1300},
 loss:{src:'/legends/fx/loss.webp',still:'/legends/fx/loss-still.webp',alt:'L',colours:['#D7261E','#4AB8F0'],ms:1500},
 'game-over':{src:'/legends/fx/game-over.webp',still:'/legends/fx/game-over-still.webp',alt:'GAME OVER',colours:['#D7261E'],ms:1600},
}
export const fxAllowed=(c:Celebration,forbidden?:(hex:string)=>boolean)=>!forbidden||!FX[c].colours.some(forbidden)

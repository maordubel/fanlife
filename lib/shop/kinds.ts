import type {Kind} from './types'
/**
 * What we sell and how each thing is found in Printify's catalogue. Blueprint ids change and differ by region, so a kind
 * is matched by TITLE against the live catalogue (first pattern that hits wins) and the answer is kept in the shop's
 * settings; the owner can replace any match from the desk. `colors`/`sizes` keep a product's variants to the ones the
 * pictures suit (light garments).
 */
export type KindSpec={
 label:string;plural:string
 find:RegExp[];avoid?:RegExp
 /** print position, in order of preference */
 positions:string[]
 colors?:RegExp;sizes?:RegExp;maxVariants:number
 /** the picture fills this share of the placeholder's width (a chest print is not edge to edge) */
 scale:number
 /** for children */
 kids?:boolean
}
const LIGHT=/^(white|natural|sand|ash|soft cream|ivory|vintage white|heather dust|bone)$/i
const ADULT=/^(s|m|l|xl|2xl|xxl)$/i
export const KIND_SPECS:Record<Kind,KindSpec>={
 poster:{label:'Poster',plural:'Posters',find:[/^fine art posters?$/i,/^giclee art prints?$/i,/^premium matte vertical posters?$/i,/^matte vertical posters?$/i,/vertical.*poster/i,/poster/i],avoid:/frame|hanger|horizontal/i,positions:['front'],maxVariants:8,scale:1},
 framed:{label:'Framed print',plural:'Framed prints',find:[/^premium framed vertical posters?$/i,/framed vertical poster/i,/framed.*(poster|print|paper)/i],avoid:/horizontal/i,positions:['front'],maxVariants:8,scale:1},
 canvas:{label:'Canvas',plural:'Canvases',find:[/^matte canvas, stretched, 1\.25/i,/^canvas gallery wraps?$/i,/^matte canvas.*stretched/i,/canvas.*(stretched|gallery|wrap)/i],avoid:/horizontal|bag|tote|shoe|sneaker/i,positions:['front'],maxVariants:6,scale:1},
 tote:{label:'Tote bag',plural:'Tote bags',find:[/^cotton canvas tote bag$/i,/cotton.*tote/i,/tote bag/i],avoid:/aop|all[- ]over|weekender/i,positions:['front'],colors:/^(natural|white|beige|ecru)$/i,maxVariants:4,scale:.86},
 tee:{label:'T-shirt',plural:'T-shirts',find:[/^unisex garment-dyed t-shirt$/i,/^unisex jersey short sleeve tee$/i,/^unisex heavy cotton tee$/i,/unisex.*(tee|t-shirt)/i],avoid:/kids|youth|toddler|infant|baby|aop|women|long sleeve/i,positions:['front'],colors:LIGHT,sizes:ADULT,maxVariants:24,scale:.78},
 hoodie:{label:'Hoodie',plural:'Hoodies',find:[/^unisex premium pullover hoodie$/i,/^unisex garment-dyed hoodie$/i,/^unisex heavy blend.*hooded sweatshirt$/i,/unisex.*hood/i],avoid:/kids|youth|toddler|aop|zip/i,positions:['front'],colors:LIGHT,sizes:ADULT,maxVariants:24,scale:.74},
 'kids-tee':{label:'Kids T-shirt',plural:'Kids T-shirts',find:[/^kids heavy cotton.*tee$/i,/(kids|youth).*(tee|t-shirt)/i],avoid:/aop|long sleeve|toddler|infant|baby/i,positions:['front'],colors:LIGHT,maxVariants:16,scale:.78,kids:true},
 mug:{label:'Mug',plural:'Mugs',find:[/^ceramic mug.*11\s?oz/i,/^(white )?ceramic mug/i,/mug.*11\s?oz/i],avoid:/travel|enamel|accent|color morphing|magic|latte/i,positions:['front'],maxVariants:2,scale:1},
 sticker:{label:'Sticker',plural:'Stickers',find:[/^kiss[- ]cut stickers?$/i,/square stickers?/i,/sticker/i],avoid:/sheet|bumper|roll|label/i,positions:['front'],maxVariants:4,scale:1},
 'phone-case':{label:'Phone case',plural:'Phone cases',find:[/^tough (phone )?cases?$/i,/^slim (phone )?cases?$/i,/phone case/i],avoid:/wallet|flip|magnetic|card/i,positions:['front'],maxVariants:30,scale:1},
 puzzle:{label:'Jigsaw puzzle',plural:'Puzzles',find:[/^(jigsaw )?puzzle/i,/puzzle/i],avoid:/kids'? puzzle.*30/i,positions:['front'],maxVariants:4,scale:1},
 more:{label:'From the catalogue',plural:'More',find:[],positions:['front','default'],maxVariants:24,scale:1},
 notebook:{label:'Notebook',plural:'Notebooks',find:[/^hardcover journal/i,/^spiral notebook/i,/(journal|notebook)/i],avoid:/sticker/i,positions:['front','cover'],maxVariants:3,scale:1},
}
/**
 * Print providers in order of preference — QUALITY FIRST (owner, 14.11.2026: "the better products the supplier offers, quality
 * above all"): Printify Choice routes each order to a top-rated provider under Printify's Quality Promise; then the European
 * printers known for it (the audience is here and the parcel is cheaper), then anyone.
 */
export const PROVIDER_ORDER=[/printify choice/i,/print clever/i,/textildruck europa/i,/opt ondemand/i,/x-print/i,/stoked on printing/i,/fyby|prima printing/i,/monster digital/i,/sps|swiftpod/i]
/** the launch set: each chosen library picture is offered on these, the things a supporter buys first */
export const LAUNCH_KINDS:Kind[]=['poster','tote','tee','mug']
/** how many library pictures per subject go into the launch drafts */
export const LAUNCH_PICTURES=4

/**
 * THE WHOLE CATALOGUE (owner, 12.11.2026: "every option they have, smartly, simple to run and launch").
 * Any Printify product can be chosen in the desk. Its spec is worked out from its name: garments and bags get a chest-sized
 * print on light colours and adult sizes; everything else (wall art, home, drinkware, accessories) is printed edge to edge.
 */
const WEAR=/shirt|tee|hood|sweat|tank|jacket|jersey|polo|dress|legging|jogger|short|sock|onesie|bodysuit|romper|bib|apron|crewneck|long sleeve|zip/i
const BAG=/tote|bag|backpack|pouch|duffel|fanny/i
const HAT=/hat|cap|beanie|visor|bucket/i
export function catalogueSpec(title:string):KindSpec{
 const wear=WEAR.test(title),bag=BAG.test(title),hat=HAT.test(title),kids=/kid|youth|toddler|baby|infant|bodysuit|onesie|romper|bib/i.test(title)
 return {label:title,plural:title,find:[],positions:['front','default','front_side','front_cover','cover','top','left','right','back'],
  colors:wear||bag?LIGHT:undefined,sizes:wear&&!kids?ADULT:undefined,maxVariants:wear?24:12,scale:wear?.78:bag?.86:hat?.6:1,kids}
}
/** the desk's shelves for the whole catalogue, in the order a supporter shops */
export const CATALOGUE_GROUPS:[string,RegExp][]=[
 ['Wall art',/poster|canvas|framed|print|wall|tapestr|metal|acrylic|wood|photo tile/i],
 ['Kids & baby',/kid|youth|toddler|baby|infant|bodysuit|onesie|romper|bib/i],
 ['Clothing',WEAR],
 ['Hats',HAT],
 ['Bags',BAG],
 ['Drinkware',/mug|cup|tumbler|bottle|glass|stein|can cooler|koozie/i],
 ['Home',/pillow|blanket|towel|rug|mat|curtain|shower|candle|ornament|coaster|clock|duvet|sheet|apron|flag|banner/i],
 ['Phone & tech',/phone|case|airpod|laptop|mouse|pad|sleeve|charger|pop ?socket|tablet/i],
 ['Stickers & paper',/sticker|magnet|notebook|journal|card|calendar|postcard|puzzle|paper|planner|bookmark/i],
 ['Accessories',/socks?|scarf|bandana|mask|keychain|pin|button|lanyard|wristband|jewel|necklace|watch|patch|sunglass|umbrella|face/i],
]
export const groupOf=(title:string)=>CATALOGUE_GROUPS.find(([,re])=>re.test(title))?.[0]??'Other'

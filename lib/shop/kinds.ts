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
 poster:{label:'Poster',plural:'Posters',find:[/^matte vertical posters?$/i,/vertical.*poster/i,/poster/i],avoid:/frame|hanger|horizontal/i,positions:['front'],maxVariants:8,scale:1},
 framed:{label:'Framed print',plural:'Framed prints',find:[/framed vertical poster/i,/framed.*(poster|print|paper)/i],avoid:/horizontal/i,positions:['front'],maxVariants:8,scale:1},
 canvas:{label:'Canvas',plural:'Canvases',find:[/^matte canvas.*stretched/i,/canvas.*(stretched|gallery|wrap)/i],avoid:/horizontal|bag|tote|shoe|sneaker/i,positions:['front'],maxVariants:6,scale:1},
 tote:{label:'Tote bag',plural:'Tote bags',find:[/^cotton canvas tote bag$/i,/cotton.*tote/i,/tote bag/i],avoid:/aop|all[- ]over|weekender/i,positions:['front'],colors:/^(natural|white|beige|ecru)$/i,maxVariants:4,scale:.86},
 tee:{label:'T-shirt',plural:'T-shirts',find:[/^unisex jersey short sleeve tee$/i,/^unisex heavy cotton tee$/i,/unisex.*(tee|t-shirt)/i],avoid:/kids|youth|toddler|infant|baby|aop|women|long sleeve/i,positions:['front'],colors:LIGHT,sizes:ADULT,maxVariants:24,scale:.78},
 hoodie:{label:'Hoodie',plural:'Hoodies',find:[/^unisex heavy blend.*hooded sweatshirt$/i,/unisex.*hood/i],avoid:/kids|youth|toddler|aop|zip/i,positions:['front'],colors:LIGHT,sizes:ADULT,maxVariants:24,scale:.74},
 'kids-tee':{label:'Kids T-shirt',plural:'Kids T-shirts',find:[/^kids heavy cotton.*tee$/i,/(kids|youth).*(tee|t-shirt)/i],avoid:/aop|long sleeve|toddler|infant|baby/i,positions:['front'],colors:LIGHT,maxVariants:16,scale:.78,kids:true},
 mug:{label:'Mug',plural:'Mugs',find:[/^ceramic mug.*11\s?oz/i,/^(white )?ceramic mug/i,/mug.*11\s?oz/i],avoid:/travel|enamel|accent|color morphing|magic|latte/i,positions:['front'],maxVariants:2,scale:1},
 sticker:{label:'Sticker',plural:'Stickers',find:[/^kiss[- ]cut stickers?$/i,/square stickers?/i,/sticker/i],avoid:/sheet|bumper|roll|label/i,positions:['front'],maxVariants:4,scale:1},
 'phone-case':{label:'Phone case',plural:'Phone cases',find:[/^tough (phone )?cases?$/i,/^slim (phone )?cases?$/i,/phone case/i],avoid:/wallet|flip|magnetic|card/i,positions:['front'],maxVariants:30,scale:1},
 puzzle:{label:'Jigsaw puzzle',plural:'Puzzles',find:[/^(jigsaw )?puzzle/i,/puzzle/i],avoid:/kids'? puzzle.*30/i,positions:['front'],maxVariants:4,scale:1},
 notebook:{label:'Notebook',plural:'Notebooks',find:[/^hardcover journal/i,/^spiral notebook/i,/(journal|notebook)/i],avoid:/sticker/i,positions:['front','cover'],maxVariants:3,scale:1},
}
/** print providers we would rather print with (Europe first: the audience is here and the parcel is cheaper), then anyone */
export const PROVIDER_ORDER=[/print clever/i,/textildruck europa/i,/opt ondemand/i,/printify choice/i,/x-print/i,/stoked on printing/i,/fyby|prima printing/i,/monster digital/i,/sps|swiftpod/i]
/** the launch set: each chosen library picture is offered on these, the things a supporter buys first */
export const LAUNCH_KINDS:Kind[]=['poster','tote','tee','mug']
/** how many library pictures per subject go into the launch drafts */
export const LAUNCH_PICTURES=4

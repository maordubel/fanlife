import { useId, type ReactNode } from 'react'

export const DOUBLE_HOME_VIEWBOX = '33 106 696 548'
export const DOUBLE_HOME_RED = '#dc252c'

// Traced construction from the matching front photograph (public/kits/vp-2000-home.webp).
const SILHOUETTE = 'M42 250C58 222 123 198 193 175L304 143 330 115Q377 119 434 115L452 140C534 159 642 194 695 219Q711 228 718 237C701 256 694 287 694 327C660 342 600 334 562 334C574 389 578 475 590 625Q590 630 577 632Q380 654 192 636Q180 636 182 628C186 531 198 419 193 329C166 341 114 344 78 338C72 304 57 270 42 250Z'
const LEFT_CUFF = 'M42 250Q48 241 57 235C73 260 87 303 94 340L78 338C72 304 57 270 42 250Z'
const RIGHT_CUFF = 'M718 237Q713 230 705 225C687 244 674 287 675 333L694 327C694 287 701 256 718 237Z'

type DoubleShirtProps = {
  base: string
  stripes: string
  texture: boolean
  crest: boolean
  makerSrc?: string
  sponsorSrc?: string
  children?: ReactNode
}

export function HapoelDoubleShirt({ base, stripes, texture, crest, makerSrc, sponsorSrc, children }: DoubleShirtProps) {
  const id = useId().replace(/:/g, '')
  return (
    <g data-kit-cut="hapoel-1999-00-home">
      <defs>
        <linearGradient id={`${id}-cloth`} x2="1" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".16" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".13" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".15" />
        </linearGradient>
      </defs>
      <path d={SILHOUETTE} fill={base} />
      {texture && <path d={SILHOUETTE} fill={`url(#${id}-cloth)`} />}
      <path d="M255 173L268 169C271 341 270 484 257 635L243 634C256 455 258 313 255 173ZM493 168L506 170C500 388 500 511 509 634L496 636C488 511 487 364 493 168Z" fill={stripes} />
      <g fill="none" stroke="#41060c" strokeOpacity=".28" strokeWidth="2.4">
        <path d="M254 171C228 207 198 265 193 329M502 170C529 206 554 269 562 334" />
        <path d="M185 621Q382 642 584 619" />
      </g>
      <path d={LEFT_CUFF} fill="#191719" />
      <path d={RIGHT_CUFF} fill="#191719" />
      <path d="M45 247C60 270 76 311 81 338M49 243C65 269 80 308 85 339M715 233C697 254 687 290 689 329M712 231C693 251 683 290 685 330" fill="none" stroke="#fff" strokeWidth="1.7" />
      <path d="M326 135Q382 147 438 135L421 167 383 230 340 183Z" fill="#840b13" />
      <path d="M335 144Q379 154 435 142" fill="none" stroke="#20161a" strokeWidth="7" />
      <path d="M336 177L350 174 381 204 409 174 428 176 383 229Z" fill="#191719" />
      <path d="M344 179L376 207M349 177L379 204M418 178L376 221M414 176L373 218" fill="none" stroke="#fff" strokeWidth="1.45" />
      <path d="M309 143L330 115Q375 120 434 115L452 140 430 184 409 185 382 204 354 185 329 185Z" fill={base} />
      <path d="M330 115Q330 142 353 158L375 192 354 185 329 185 309 143ZM434 115Q434 143 412 158L389 192 409 185 430 184 452 140Z" fill="#7b0810" fillOpacity=".21" />
      <path d="M349 148Q379 151 416 147L382 201Z" fill={base} />
      <path d="M331 117Q330 137 349 148L415 147Q433 135 434 117" fill="none" stroke="#5d0710" strokeOpacity=".6" strokeWidth="2" />
      {crest && <image href="/club-kits/marks/hapoel-1999-crest-white.svg" x="419" y="194" width="69" height="69" />}
      {makerSrc && <image href={makerSrc} x="302" y="222" width="29" height="14" />}
      {makerSrc && <image href="/club-kits/marks/hapoel-1999-nike-hem.svg" x="425" y="567" width="61" height="42" />}
      {sponsorSrc && <image href={sponsorSrc} x="308" y="297" width="151" height="87" />}
      {children}
    </g>
  )
}

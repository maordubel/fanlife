/** The weekly's line icons (rule 124): one stroke weight, currentColor, decorative. */
const P:Record<string,string>={
 home:'M4 11l8-7 8 7v9h-5v-6H9v6H4z',play:'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 7l4 3-1.5 5h-5L8 10z',history:'M5 4h11l3 3v13H5zM9 9h7M9 13h7M9 17h4',
 flag:'M5 21V4M5 4h12l-3 4 3 4H5',clubs:'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',shirt:'M8 3L3 6l2 5 2-1v11h10V10l2 1 2-5-5-3c-1 2-2 3-4 3S9 5 8 3z',
 me:'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M4 21c1-5 4-7 8-7s7 2 8 7',file:'M6 3h8l4 4v14H6zM14 3v4h4',hanger:'M12 7a2 2 0 1 1 2-2M12 7v2L3 16h18l-9-7',
 gavel:'M14 4l6 6M11 7l6 6M8 10l6-6M10 12l-7 7M4 21h9',grid:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',globe:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
 menu:'M4 6h16M4 12h16M4 18h11',close:'M6 6l12 12M18 6L6 18',chev:'M6 9l6 6 6-6',search:'M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12M15 15l5 5',
 plane:'M3 13l7-2 4-7h2l-2 7 6 1 1 2-7 1-3 5h-2l1-5-7-1z',book:'M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5zM19 4h-4a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4z',life:'M6 4h12v16l-6-4-6 4z',
 terrace:'M3 20h18M5 20v-5h4v5M10 20v-9h4v9M15 20v-7h4v7',vote:'M4 12h16v8H4zM8 12V4h8v8M10 8l1.5 1.5L14 7',star:'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
 pin:'M9 3h6l-1 6 3 3H7l3-3zM12 12v9',
 sources:'M4 5h7v14H4zM13 5h7v14h-7zM6.5 9h2M15.5 9h2',
}
export type IconName=keyof typeof P
export function Icon({name,size=22}:{name:string;size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[name]??P.star}/></svg>
}

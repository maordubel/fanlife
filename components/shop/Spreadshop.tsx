'use client'
import {useEffect} from 'react'

/**
 * THE SECOND PRINT PARTNER INSIDE OUR SHOP (owner, 14.11.2026: "more suppliers that do the same — make, charge, ship — without
 * the buyer knowing"). Spreadshop's own embed: its script draws the shop into this element on our page, so the buyer browses
 * and pays without leaving fanlife.dubelteam.com's look. Spreadshop prints, charges, ships and answers the customer.
 * Without script the link still opens the shop.
 */
declare global{interface Window{spread_shop_config?:Record<string,unknown>}}
export function SpreadshopEmbed({shop,prefix,label}:{shop:string;prefix:string;label:string}){
 useEffect(()=>{
  window.spread_shop_config={shopName:shop,locale:prefix.includes('.net')||prefix.includes('.co.uk')?'en_GB':'us_US',prefix,baseId:'fl-spreadshop',swipeMenu:true,updateMetadata:false}
  const s=document.createElement('script');s.src=`${prefix}/shopfiles/shopclient/shopclient.nocache.js`;s.async=true;document.body.appendChild(s)
  return ()=>{s.remove()}
 },[shop,prefix])
 return <div id="fl-spreadshop" className="wks-partner"><a className="wk-btn min-h-tap" href={prefix} rel="noopener">{label} <span aria-hidden="true">→</span></a></div>
}

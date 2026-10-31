import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response=await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml',{next:{revalidate:3600},signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Rate feed unavailable');
    const xml=await response.text();
    const read=(currency:string)=>Number(xml.match(new RegExp(`currency=['"]${currency}['"]\\s+rate=['"]([\\d.]+)['"]`))?.[1]);
    const usd=read('USD'),thb=read('THB'),date=xml.match(/time=['"]([\d-]+)['"]/)?.[1];
    if(!date||!Number.isFinite(usd)||!Number.isFinite(thb)||usd<=0||thb<=0)throw new Error('Invalid reference rates');
    return NextResponse.json({base:'THB',currency:'USD',rate:usd/thb,date,source:'European Central Bank'},{headers:{'Cache-Control':'public, max-age=3600'}});
  }catch{return NextResponse.json({error:'Exchange rates are unavailable. Prices remain in THB.'},{status:503});}
}

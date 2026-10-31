import type { Language, DisplayCurrency } from './preferences';
export function localizedPrice(price:number,language:Language='en',currency:DisplayCurrency='THB',usdRate?:number):string {
 const useUSD=currency==='USD'&&Number.isFinite(usdRate)&&usdRate!>0;
 return new Intl.NumberFormat(language==='th'?'th-TH':'en-US',{style:'currency',currency:useUSD?'USD':'THB',currencyDisplay:useUSD?'code':'symbol',maximumFractionDigits:useUSD?2:0}).format(useUSD?price*usdRate!:price);
}
export function localizedDate(value:string|Date,language:Language='en'):string {
 return new Intl.DateTimeFormat(language==='th'?'th-TH':'en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));
}
export function localizedRelativeTime(value:string|Date,language:Language='en'):string {
 const seconds=Math.round((new Date(value).getTime()-Date.now())/1000);const formatter=new Intl.RelativeTimeFormat(language,{numeric:'auto'});
 if(Math.abs(seconds)<60)return formatter.format(seconds,'second');
 if(Math.abs(seconds)<3600)return formatter.format(Math.round(seconds/60),'minute');
 if(Math.abs(seconds)<86400)return formatter.format(Math.round(seconds/3600),'hour');
 return formatter.format(Math.round(seconds/86400),'day');
}
export const formatPrice=(price:number)=>localizedPrice(price);
export const formatDate=(value:string|Date)=>localizedDate(value);
export const formatRelativeTime=(value:string|Date)=>localizedRelativeTime(value);

"use client";
import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, validPreferences, type Preferences } from '@/lib/preferences';
import { translate } from '@/lib/translations';
import { localizedPrice, localizedDate, localizedRelativeTime } from '@/lib/formatters';

type ExchangeRate = {rate:number;date:string;source:string};
interface PreferencesValue {
  preferences: Preferences;
  loading: boolean;
  settingsError: string;
  savePreferences: (settings:Preferences)=>Promise<void>;
  exchangeRate: ExchangeRate|null;
  rateError: string;
  refreshRate: ()=>Promise<ExchangeRate>;
  translateText: (text:unknown,variables?:Record<string,string|number>)=>string;
}
const Context=createContext<PreferencesValue|null>(null);
export function PreferencesProvider({userId,children}:{userId?:string;children:ReactNode}) {
  const [preferences,setPreferences]=useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading,setLoading]=useState(true);
  const [settingsError,setSettingsError]=useState('');
  const [exchangeRate,setExchangeRate]=useState<ExchangeRate|null>(null);
  const [rateError,setRateError]=useState('');
  const generation=useRef(0);
  const currentUser=useRef(userId);currentUser.current=userId;
  const refreshRate=useCallback(async()=>{
    try {
      const response=await fetch('/api/exchange-rates');const data=await response.json();
      if(!response.ok||!Number.isFinite(data.rate)||data.rate<=0)throw new Error('Exchange rates are unavailable. Prices remain in THB.');
      setExchangeRate(data);setRateError('');return data as ExchangeRate;
    }catch(error){const message=error instanceof Error?error.message:'Unable to load exchange rates.';setRateError(message);throw error;}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();generation.current+=1;
    setPreferences(DEFAULT_PREFERENCES);setSettingsError('');setLoading(true);
    if(!userId){
      try{const stored=JSON.parse(localStorage.getItem('propertylink:guest-preferences')||'null');if(validPreferences(stored))setPreferences(stored);}catch{/* Unavailable browser storage uses defaults. */}
      setLoading(false);return()=>controller.abort();
    }
    fetch('/api/users/me/settings',{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok||!validPreferences(data.settings))throw new Error('Unable to load settings.');if(!controller.signal.aborted)setPreferences(data.settings);}).catch(error=>{if(!controller.signal.aborted)setSettingsError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[userId]);
  useEffect(()=>{document.documentElement.lang=preferences.language;},[preferences.language]);
  useEffect(()=>{if(preferences.currency==='USD')void refreshRate().catch(()=>undefined);},[preferences.currency,refreshRate]);
  const savePreferences=useCallback(async(settings:Preferences)=>{
    if(!validPreferences(settings))throw new Error('Invalid settings.');
    const requestUser=userId,version=generation.current;
    if(settings.currency==='USD'&&!exchangeRate)await refreshRate();
    if(userId){
      const response=await fetch('/api/users/me/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});const data=await response.json();if(!response.ok||!validPreferences(data.settings))throw new Error(data.error||'Unable to save settings.');
    }else{localStorage.setItem('propertylink:guest-preferences',JSON.stringify(settings));}
    if(version!==generation.current||requestUser!==currentUser.current)throw new Error('Your account changed. Please try again.');
    setPreferences({...settings});setSettingsError('');
  },[userId,exchangeRate,refreshRate]);
  const translateText=useCallback((text:unknown,variables?:Record<string,string|number>)=>translate(text,preferences.language,variables),[preferences.language]);
  const value=useMemo(()=>({preferences,loading,settingsError,savePreferences,exchangeRate,rateError,refreshRate,translateText}),[preferences,loading,settingsError,savePreferences,exchangeRate,rateError,refreshRate,translateText]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePreferences(){const value=useContext(Context);if(!value)throw new Error('PreferencesProvider is required.');return value;}
export function useFormatters(){const {preferences,exchangeRate}=usePreferences();return {
  formatPrice:(price:number)=>localizedPrice(price,preferences.language,preferences.currency,exchangeRate?.rate),
  formatDate:(value:string|Date)=>localizedDate(value,preferences.language),
  formatRelativeTime:(value:string|Date)=>localizedRelativeTime(value,preferences.language),
};}

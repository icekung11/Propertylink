"use client";
import { useEffect, useState } from 'react';
import { AlertCircle, Bell, Shield, Monitor, CheckCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePreferences } from '@/context/PreferencesContext';
import type { Preferences } from '@/lib/preferences';
import PasswordForm from '@/components/PasswordForm';

export default function SettingsPage() {
  const {user,showToast,setShowLoginModal}=useApp();
  const {preferences,loading,settingsError,savePreferences,exchangeRate,rateError,refreshRate,translateText}=usePreferences();
  const [draft,setDraft]=useState<Preferences>(preferences);
  const [activeTab,setActiveTab]=useState<'notifications'|'security'|'preferences'>('preferences');
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [rateLoading,setRateLoading]=useState(false);
  useEffect(()=>{setDraft({...preferences});setSaveError('');},[preferences,user?.id]);
  const tabs=[{id:'notifications',label:'Notifications',icon:Bell},{id:'security',label:'Security & Privacy',icon:Shield},{id:'preferences',label:'Preferences',icon:Monitor}] as const;
  if(!user)return <div className="max-w-[1280px] mx-auto px-6 py-24 text-center"><AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4"/><h1 className="text-xl font-semibold mb-2">{translateText("Sign In Required")}</h1><p className="text-[#66758A] mb-6">{translateText("Please sign in to view your settings.")}</p><button onClick={()=>setShowLoginModal(true)} className="px-5 py-2.5 bg-[#1672DC] text-white rounded-lg">{translateText("Sign In")}</button></div>;
  return <div className="min-h-[calc(100vh-64px)] bg-[#F5F8FC] py-8"><div className="max-w-4xl mx-auto px-6">
    <h1 className="text-2xl font-bold text-[#10243E] mb-6">{translateText("Settings")}</h1>
    <div className="flex flex-col md:flex-row gap-6"><nav aria-label={translateText("Settings")} className="w-full md:w-64 shrink-0 space-y-1">{tabs.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setActiveTab(id)} aria-pressed={activeTab===id} className={'w-full flex gap-3 items-center px-4 py-3 rounded-xl border text-sm '+(activeTab===id?'bg-white border-[#D9E1EA] text-[#1672DC]':'border-transparent text-[#66758A]')}><Icon className="w-4 h-4"/>{translateText(label)}</button>)}</nav>
    <div className="flex-1 bg-white rounded-xl border border-[#D9E1EA] p-6 lg:p-8">
      {loading&&<p role="status">{translateText("Loading settings…")}</p>}
      {settingsError&&<p role="alert" className="text-red-600 mb-4">{translateText(settingsError)}</p>}
      {!loading&&activeTab==='preferences'&&<div className="space-y-6"><h2 className="text-lg font-bold">{translateText("Preferences")}</h2><p className="text-sm text-[#66758A]">{translateText("Changes apply after you save and are stored with your account.")}</p>
        <label className="block text-sm font-medium">{translateText("Language")}<select name="language" value={draft.language} onChange={event=>setDraft({...draft,language:event.target.value as Preferences['language']})} className="mt-2 block w-full border rounded-lg px-3 py-2.5"><option value="en">{translateText("English (US)")}</option><option value="th">{translateText("Thai (ภาษาไทย)")}</option></select></label>
        <label className="block text-sm font-medium">{translateText("Currency Display")}<select name="currency" value={draft.currency} onChange={event=>{const currency=event.target.value as Preferences['currency'];setDraft({...draft,currency});if(currency==='USD'&&!exchangeRate){setRateLoading(true);void refreshRate().catch(()=>undefined).finally(()=>setRateLoading(false));}}} className="mt-2 block w-full border rounded-lg px-3 py-2.5"><option value="THB">{translateText("THB (฿)")}</option><option value="USD">{translateText("USD ($)")}</option></select></label>
        <p className="text-xs text-[#66758A]">{translateText("Prices are stored in THB. USD amounts are approximate reference conversions.")}</p>
        {rateLoading&&<p role="status">{translateText("Loading…")}</p>}
        {draft.currency==='USD'&&exchangeRate&&<p className="text-xs text-[#66758A]">{translateText('Reference rate')}{translateText(": 1 THB =") + " "}{exchangeRate.rate.toFixed(6)} {" " + translateText("USD ·") + " "}{exchangeRate.date} {" " + "·" + " "}<a href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" target="_blank" rel="noreferrer" className="underline">{translateText(exchangeRate.source)}</a></p>}
        {draft.currency==='USD'&&rateError&&<div role="alert" className="text-amber-700 text-sm"><p>{translateText(rateError)}</p><button type="button" onClick={()=>{setRateLoading(true);void refreshRate().catch(()=>undefined).finally(()=>setRateLoading(false));}} className="underline">{translateText("Retry")}</button></div>}
      </div>}
      {!loading&&activeTab==='notifications'&&<div className="space-y-5"><h2 className="text-lg font-bold">{translateText("Notification Preferences")}</h2>
        <label className="flex items-start justify-between gap-5 p-4 border rounded-lg"><span><span className="block font-medium">{translateText("Unread notification badges")}</span><span className="text-sm text-[#66758A]">{translateText("Show unread counts and notification indicators in the header.")}</span></span><input name="showUnreadBadge" type="checkbox" checked={draft.showUnreadBadge} onChange={event=>setDraft({...draft,showUnreadBadge:event.target.checked})} className="mt-1 accent-[#1672DC]"/></label>
        <p className="text-sm text-[#66758A]">{translateText("Email, browser push and marketing delivery are not connected yet.")}</p>
        {['Email Notifications','Push Notifications','Marketing & Promotions'].map(label=><div key={label} className="p-4 border rounded-lg flex items-center justify-between text-sm"><span>{translateText(label)}</span><span className="text-[#66758A]">{translateText("Not available yet")}</span></div>)}
      </div>}
      {!loading&&activeTab==='security'&&<div className="space-y-6"><PasswordForm/><div className="border-t pt-5"><h2 className="font-semibold">{translateText("Two-Factor Authentication (2FA)")}</h2><p className="text-sm text-[#66758A] mt-2">{translateText("Two-factor authentication is not available yet.")}</p></div></div>}
      {activeTab!=='security'&&<div className="border-t mt-8 pt-6">{saveError&&<p role="alert" className="text-sm text-red-600 mb-4">{translateText(saveError)}</p>}<button disabled={loading||saving||!!settingsError||rateLoading||(draft.currency==='USD'&&!exchangeRate)} onClick={async()=>{if(saving)return;setSaving(true);setSaveError('');try{await savePreferences(draft);showToast('Settings saved successfully');}catch(error){setSaveError(error instanceof Error?error.message:'Unable to save settings.');}finally{setSaving(false);}}} className="flex items-center gap-2 ml-auto px-6 py-2.5 bg-[#1672DC] text-white rounded-lg disabled:opacity-50"><CheckCircle className="w-4 h-4"/>{translateText(saving?'Saving…':'Save Preferences')}</button></div>}
    </div></div></div></div>;
}

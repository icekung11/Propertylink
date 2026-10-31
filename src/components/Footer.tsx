"use client";
import { usePreferences } from "@/context/PreferencesContext";
import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function Footer() {
  const { translateText } = usePreferences();

  return (
    <footer className="bg-[#102B4B] text-white">
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#1672DC] rounded-lg flex items-center justify-center">
                <Building2 className="w-4.5 h-4.5 text-white" aria-hidden="true" />
              </div>
              <span className="font-bold text-lg">{translateText("PropertyLink")}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {translateText("Thailand's trusted real estate marketplace. Find your perfect property with confidence.")}</p>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-4">{translateText("Company")}</h3>
            <ul className="space-y-2.5">
              {['About Us', 'Contact', 'Careers', 'Press'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">{translateText(item)}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-4">{translateText("Properties")}</h3>
            <ul className="space-y-2.5">
              {['Single house', 'Condominium', 'Townhouse', 'Land', 'Commercial'].map((item) => (
                <li key={item}>
                  <Link href="/properties" className="text-sm text-slate-300 hover:text-white transition-colors">{translateText(item)}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-4">{translateText("Legal")}</h3>
            <ul className="space-y-2.5">
              {['Privacy Policy', 'Terms of Use', 'Cookie Policy'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-slate-300 hover:text-white transition-colors">{translateText(item)}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">{translateText("© 2026 PropertyLink Co., Ltd. All rights reserved.")}</p>
          <p className="text-xs text-slate-500">{translateText("Thailand Real Estate Marketplace")}</p>
        </div>
      </div>
    </footer>
  );
}

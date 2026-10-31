"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { Suspense, useEffect, useState } from 'react';
import {  useRouter , useSearchParams } from 'next/navigation';
import {
  Heart, MessageSquare, User, LogOut, Menu, X as CloseIcon,
  Clock, AlertCircle, TrendingUp, Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PropertyCard from '../../components/PropertyCard';
import StatusBadge from '../../components/StatusBadge';
import InquiryList from '../../components/InquiryList';
import { adaptListing } from '../../lib/property-adapter';
import type { Property } from '../../types';

type Tab = 'favorites' | 'inquiries' | 'profile';

function isValidTab(t: string | null): t is Tab {
  return t === 'favorites' || t === 'inquiries' || t === 'profile';
}

function BuyerWorkspaceContent() {
  const { translateText } = usePreferences();

  const { user, logout, favorites, showToast, setShowLoginModal, inquiries, updateProfileName } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return isValidTab(t) ? t : 'favorites';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [favoritedProperties, setFavoritedProperties] = useState<Property[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState(false);
  const [profile, setProfile] = useState({ firstName: '', lastName: '' });

  useEffect(() => {
    if (user) setProfile({ firstName: user.firstName, lastName: user.lastName });
  }, [user?.id, user?.firstName, user?.lastName]);

  const saveProfile = async () => {
    try {
      const response = await fetch('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update profile');
      updateProfileName(data.user.firstName, data.user.lastName);
      showToast('Profile updated.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update profile.', 'error');
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setFavoritesLoading(true);
    fetch('/api/buyer/favorites?limit=100')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load favorites');
        return response.json();
      })
      .then((data) => { if (!cancelled) setFavoritedProperties((data.favorites ?? []).map(adaptListing)); })
      .catch(() => { if (!cancelled) setFavoritesError(true); })
      .finally(() => { if (!cancelled) setFavoritesLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const myInquiries = inquiries.filter((i) => i.buyerId === user?.id);

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-[#10243E] mb-2">{translateText("Sign In Required")}</h1>
        <p className="text-[#66758A] mb-6">{translateText("Please sign in to access your buyer workspace.")}</p>
        <button
          onClick={() => setShowLoginModal(true)}
          className="px-5 py-2.5 bg-[#1672DC] text-white font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
        >
          {translateText("Sign In")}</button>
      </div>
    );
  }

  const pendingInquiries = myInquiries.filter((i) => i.status === 'NEW' || i.status === 'READ').length;
  const repliedInquiries = myInquiries.filter((i) => i.status === 'CONTACTED').length;

  const NAV_ITEMS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'inquiries', label: 'Inquiries', icon: MessageSquare },
      ];

  const handleNav = (id: Tab) => { setTab(id); setSidebarOpen(false); };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-[#D9E1EA]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1672DC] text-white font-semibold flex items-center justify-center text-sm">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <div className="font-semibold text-[#10243E] text-sm">{user.firstName} {user.lastName}</div>
            <span className="text-xs bg-blue-50 text-[#1672DC] px-2 py-0.5 rounded-full font-medium">{translateText("Buyer")}</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5" aria-label={translateText("Buyer navigation")}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              tab === id ? 'bg-[#102B4B] text-white font-medium' : 'text-[#66758A] hover:bg-slate-100 hover:text-[#10243E]'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{translateText(label)}</span>
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-[#D9E1EA]">
        <button
          onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          {translateText("Logout")}</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#F5F8FC]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={translateText("Sidebar menu")}>
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-end p-3 border-b border-[#D9E1EA]">
              <button onClick={() => setSidebarOpen(false)} aria-label={translateText("Close sidebar")}>
                <CloseIcon className="w-5 h-5 text-[#66758A]" />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-[#D9E1EA]">
        {sidebar}
      </aside>

      <div className="flex-1 overflow-auto">
        <div className="flex items-center gap-3 p-4 lg:p-6 border-b border-[#D9E1EA] bg-white">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={translateText("Open menu")}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#66758A] hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-[#10243E]">
            {translateText(NAV_ITEMS.find((n) => n.id === tab)?.label)}
          </h1>
          {tab === 'favorites' && (
            <button
              onClick={() => router.push('/properties')}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm border border-[#D9E1EA] rounded-lg text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC] transition-colors"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              {translateText("Browse Properties")}</button>
          )}
          {tab === 'inquiries' && (
            <button
              onClick={() => router.push('/properties')}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm border border-[#D9E1EA] rounded-lg text-[#10243E] hover:border-[#1672DC] hover:text-[#1672DC] transition-colors"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              {translateText("Contact a Seller")}</button>
          )}
        </div>

        <div className="p-4 lg:p-6 space-y-6">
          {tab === 'favorites' && (
            <>
              <div>
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">{translateText("Overview")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Saved Properties', value: favoritedProperties.length, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
                    { label: 'Available', value: favoritedProperties.filter(p => p.status === 'APPROVED').length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Inquiries', value: myInquiries.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Replied', value: repliedInquiries, icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-xl border border-[#D9E1EA] p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-slate-300" aria-hidden="true" />
                      </div>
                      <div className="text-2xl font-bold text-[#10243E]">{value}</div>
                      <div className="text-xs text-[#66758A] mt-0.5">{translateText(label)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">{translateText("Saved Properties")}</p>
              {favoritesLoading ? (
                <div className="py-12 text-center text-[#66758A]" role="status">Loading favorites…</div>
              ) : favoritesError ? (
                <div className="py-12 text-center text-red-600">Unable to load your favorites. Please try again.</div>
              ) : favoritedProperties.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#D9E1EA] p-12 text-center">
                  <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" aria-hidden="true" />
                  <h2 className="font-semibold text-[#10243E] mb-2">No Saved Properties</h2>
                  <p className="text-sm text-[#66758A] mb-5">Browse properties and tap the heart icon to save ones you like.</p>
                  <button
                    onClick={() => router.push('/properties')}
                    className="px-5 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
                  >
                    Browse Properties
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {favoritedProperties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>
              )}
              </div>
            </>
          )}

          {tab === 'inquiries' && (
            <>
              <div>
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">{translateText("Overview")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Inquiries', value: myInquiries.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Pending', value: pendingInquiries, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Replied', value: repliedInquiries, icon: User, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Saved Properties', value: favorites.length, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-xl border border-[#D9E1EA] p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <TrendingUp className="w-4 h-4 text-slate-300" aria-hidden="true" />
                      </div>
                      <div className="text-2xl font-bold text-[#10243E]">{value}</div>
                      <div className="text-xs text-[#66758A] mt-0.5">{translateText(label)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mb-3">{translateText("My Inquiries")}</p>
                <InquiryList
                  inquiries={myInquiries}
                  role="buyer"
                  emptyAction={
                    <button
                      onClick={() => router.push('/properties')}
                      className="px-5 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
                    >
                      Browse Properties
                    </button>
                  }
                />
              </div>
            </>
          )}

          {tab === 'profile' && (
            <div className="max-w-lg">
              <div className="bg-white rounded-xl border border-[#D9E1EA] p-6">
                <h2 className="font-semibold text-[#10243E] mb-5">{translateText("My Profile")}</h2>
                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[#D9E1EA]">
                  <div className="w-16 h-16 rounded-full bg-[#1672DC] text-white text-2xl font-bold flex items-center justify-center">
                    {user.firstName[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-[#10243E]">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-[#66758A]">{user.email}</div>
                    <StatusBadge status={user.status} />
                  </div>
                </div>
                <div className="space-y-4">
                  {([
                    ['First Name', user.firstName],
                    ['Last Name', user.lastName],
                    ['Email', user.email],
                    ['Phone', user.phone],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-[#10243E] mb-1.5">{translateText(label)}</label>
                    <input
                        value={label === 'First Name' ? profile.firstName : label === 'Last Name' ? profile.lastName : val}
                        readOnly={label === 'Email' || label === 'Phone'}
                        onChange={(event) => label === 'First Name' ? setProfile((value) => ({ ...value, firstName: event.target.value })) : label === 'Last Name' ? setProfile((value) => ({ ...value, lastName: event.target.value })) : undefined}
                        className="w-full px-3.5 py-2.5 border border-[#D9E1EA] rounded-lg text-sm focus:outline-none focus:border-[#1672DC] focus:ring-2 focus:ring-[#1672DC]/20"
                      />
                    </div>
                  ))}
                  <button
                    onClick={saveProfile}
                    className="px-5 py-2.5 bg-[#1672DC] text-white text-sm font-semibold rounded-lg hover:bg-[#125BB8] transition-colors"
                  >
                    {translateText("Save Changes")}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuyerWorkspace() {
  const { translateText } = usePreferences();

  return <Suspense fallback={<div className="min-h-screen" />}><BuyerWorkspaceContent /></Suspense>;
}

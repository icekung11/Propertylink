"use client";
import { usePreferences } from "@/context/PreferencesContext";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  Heart,
  ChevronDown,
  User,
  Settings,
  LogOut,
  MessageSquare,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import NotificationDropdown from './NotificationDropdown';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/properties', label: 'Properties' },
  { to: '/#about', label: 'About Us' },
  { to: '/#contact', label: 'Contact' },
];

export default function Header() {
  const { translateText, preferences } = usePreferences();

  const {
    user,
    logout,
    unreadCount,
    showNotifications,
    setShowNotifications,
    setShowLoginModal,
  } = useApp();
  const displayUnreadCount = preferences.showUnreadBadge ? unreadCount : 0;
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowNotifications]);

  const handleFavorites = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      router.push('/buyer?tab=favorites');
    }
  };

  const isStaff = !!user && (user.roles.includes('SELLER') || user.roles.includes('ADMIN') || user.roles.includes('OWNER'));

  const workspacePath = user?.roles.includes('SELLER') ? '/seller'
    : user?.roles.includes('ADMIN') ? '/admin'
    : user?.roles.includes('OWNER') ? '/owner'
    : null;

  const handleRoleNav = () => {
    if (!user) return;
    if (user.roles.includes('SELLER')) router.push('/seller');
    else if (user.roles.includes('ADMIN')) router.push('/admin');
    else if (user.roles.includes('OWNER')) router.push('/owner');
    else router.push('/buyer');
    setUserMenuOpen(false);
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1672DC] focus:text-white focus:rounded-lg focus:font-medium"
      >
        {translateText("Skip to main content")}</a>

      <header className="sticky top-0 z-40 bg-white border-b border-[#D9E1EA]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 h-16 flex items-center gap-6">
          <Link href={workspacePath ?? '/'}
            className="flex items-center gap-2 shrink-0 group"
            aria-label={workspacePath ? 'PropertyLink workspace' : 'PropertyLink home'}
          >
            <div className="w-8 h-8 bg-[#1672DC] rounded-lg flex items-center justify-center">
              <Home className="w-4.5 h-4.5 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-[#10243E] text-lg">
              {translateText("Property")}<span className="text-[#1672DC]">{translateText("Link")}</span>
            </span>
          </Link>

          {(!user || (!user.roles.includes('SELLER') && !user.roles.includes('ADMIN') && !user.roles.includes('OWNER'))) ? (
            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Main navigation">
              {NAV_LINKS.map((link) => {
                const isHash = link.to.startsWith('/#');
                const active = link.to === '/'
                  ? pathname === '/'
                  : !isHash && pathname.startsWith(link.to);
                const cls = `relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'text-[#1672DC]' : 'text-[#66758A] hover:text-[#10243E] hover:bg-slate-50'
                }`;
                return isHash ? (
                  <a key={link.to} href={link.to} className={cls}>{link.label}</a>
                ) : (
                  <Link key={link.to} href={link.to} className={cls}>
                    {link.label}
                    {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1672DC]" aria-hidden="true" />}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Workspace navigation">
              <button
                onClick={handleRoleNav}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1672DC] bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                {user.roles.includes('SELLER') ? 'Seller Dashboard' :
                 user.roles.includes('ADMIN') ? 'Admin Panel' :
                 'Owner Dashboard'}
              </button>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!isStaff && (
  <button
                onClick={handleFavorites}
                aria-label={translateText("Favorites")}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#66758A] hover:text-[#10243E] rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span>{translateText("Favorites")}</span>
              </button>
            )}

            {user ? (
              <>
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    aria-label={translateText('Notifications — {count} unread',{count:displayUnreadCount})}
                    aria-expanded={showNotifications}
                    className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#66758A] hover:text-[#10243E] hover:bg-slate-100 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {displayUnreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E5484D] rounded-full" aria-hidden="true" />
                    )}
                  </button>
                  {showNotifications && <NotificationDropdown />}
                </div>

                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label="Account menu"
                    aria-expanded={userMenuOpen}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#1672DC] text-white text-xs font-semibold flex items-center justify-center">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-[#10243E]">
                      {user.firstName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-[#66758A]" aria-hidden="true" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute top-12 right-0 w-52 bg-white border border-[#D9E1EA] rounded-xl shadow-xl z-50 py-1">
                      <div className="px-4 py-3 border-b border-[#D9E1EA]">
                        <p className="text-sm font-semibold text-[#10243E]">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-[#66758A] mt-0.5">{user.email}</p>
                        <span className="inline-block mt-1.5 text-xs bg-blue-50 text-[#1672DC] px-2 py-0.5 rounded-full font-medium">
                          {user.roles.join(' + ')}
                        </span>
                      </div>
                      <div className="py-1">
                        <button onClick={() => { setUserMenuOpen(false); router.push('/account'); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#10243E] hover:bg-slate-50 transition-colors">
                          <User className="w-4 h-4 text-[#66758A]" aria-hidden="true" />
                          My Account
                        </button>
                        {!isStaff && (
                          <>
                        <button onClick={handleFavorites} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#10243E] hover:bg-slate-50 transition-colors">
                          <Heart className="w-4 h-4 text-[#66758A]" aria-hidden="true" />
                          Favorites
                        </button>

                          </>
                        )}
                        <button onClick={handleRoleNav} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#1672DC] hover:bg-blue-50 transition-colors font-medium">
                          <Home className="w-4 h-4" aria-hidden="true" />
                          {user.roles.includes('SELLER') ? 'Seller Dashboard' : user.roles.includes('ADMIN') ? 'Admin Panel' : user.roles.includes('OWNER') ? 'Owner Dashboard' : 'Buyer Dashboard'}
                        </button>
                        <button onClick={() => { setUserMenuOpen(false); router.push('/settings'); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#10243E] hover:bg-slate-50 transition-colors">
                          <Settings className="w-4 h-4 text-[#66758A]" aria-hidden="true" />
                          Settings
                        </button>
                      </div>
                      <div className="border-t border-[#D9E1EA] py-1">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); router.push('/'); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="hidden md:block px-4 py-2 text-sm font-medium text-[#66758A] hover:text-[#10243E] rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 text-sm font-semibold bg-[#1672DC] text-white rounded-lg hover:bg-[#125BB8] transition-colors"
                >
                  Register
                </button>
              </>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#66758A] hover:text-[#10243E] hover:bg-slate-100 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-[#D9E1EA] bg-white px-6 py-3 space-y-1" aria-label={translateText("Mobile navigation")}>
            {(!user || (!user.roles.includes('SELLER') && !user.roles.includes('ADMIN') && !user.roles.includes('OWNER'))) ? (
              <>
                {NAV_LINKS.map((link) =>
                  link.to.startsWith('/#') ? (
                    <a key={link.to} href={link.to} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-[#66758A] hover:text-[#10243E] hover:bg-slate-50 transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.to} href={link.to} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-[#66758A] hover:text-[#10243E] hover:bg-slate-50 transition-colors">
                      {link.label}
                    </Link>
                  )
                )}
                <button onClick={() => { handleFavorites(); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#66758A] hover:text-[#10243E] hover:bg-slate-50 transition-colors">
                  Favorites
                </button>
              </>
            ) : (
              <button onClick={() => { handleRoleNav(); setMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#1672DC] hover:bg-blue-50 transition-colors">
                My Workspace
              </button>
            )}
          </nav>
        )}
      </header>
    </>
  );
}

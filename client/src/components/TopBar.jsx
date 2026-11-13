import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useJam } from '../context/JamContext';
import { io } from 'socket.io-client';
import { getAccessToken } from '../services/api';

const ROUTE_TITLES = {
  '/': { title: 'Discovery & Quick Play', subtitle: 'Audiophile Cloud Vault' },
  '/sync': { title: 'Local Sync Hub', subtitle: 'Client-Side In-Memory Audio Sandbox' },
  '/session': { title: 'WebRTC Jam Session', subtitle: 'Peer-to-Peer Zero-Latency Listening Mesh' },
  '/settings': { title: 'Engine Preferences', subtitle: 'Acoustic & Buffer Configuration' },
  '/landing': { title: 'Engine Overview', subtitle: 'Poetic Sanctuary Architecture' }
};

export default function TopBar({ onToggleMobileMenu = () => {} }) {
  const { user, logout } = useAuth();
  const { joinedRoom } = useJam();
  const location = useLocation();

  // Notification State
  const [notifications, setNotifications] = useState([
    { id: 'welcome', message: 'Riveria High-Fidelity Audio Engine online. RFC 9110 active.', time: 'System Ready' }
  ]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const routeInfo = ROUTE_TITLES[location.pathname] || { title: 'Riveria Chamber', subtitle: 'Lossless Audio Haven' };

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    const isVercelServerless = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
    const targetUrl = socketUrl || (!isVercelServerless ? window.location.origin : null);
    if (!targetUrl) return;

    try {
      const socket = io(targetUrl, {
        path: '/socket.io',
        auth: { token: getAccessToken() },
        reconnectionAttempts: 2,
        timeout: 3000
      });

      socket.on('notification', (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      return () => {
        socket.off('notification');
        socket.disconnect();
      };
    } catch {}
  }, []);

  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
    if (!showDropdown) setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const userInitial = (user?.email?.[0] || 'U').toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-20 bg-[#09090c]/70 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 sm:px-6 md:pl-80 md:pr-10 z-20 transition-all duration-300">
      {/* LEFT: Mobile Menu Button & Context Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          aria-label="Toggle Navigation Drawer"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight">
              {routeInfo.title}
            </h1>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-400 tracking-wide font-mono mt-0.5">
            {routeInfo.subtitle}
          </p>
        </div>
      </div>

      {/* RIGHT: Role Badge, Notifications & Refined User Pill */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Active Jam Room Pill */}
        {joinedRoom && (
          <Link
            to="/session"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold hover:bg-emerald-500/25 transition-all shadow-[0_0_12px_rgba(52,211,153,0.3)]"
            title="Active WebRTC Jam Room - Tap to open"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Jam: {joinedRoom}</span>
          </Link>
        )}

        {/* Role-Based UI Element */}
        {user?.role === 'admin' ? (
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:bg-rose-500/25 transition-all group"
            title="Open Master System Architect Console"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 group-hover:animate-ping"></span>
            <span>Architect Console</span>
          </Link>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-violet-500/15 text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide">
            Listener
          </span>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            aria-label="Toggle notifications"
            className="text-slate-300 hover:text-white transition-all relative flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Luxury Notification Dropdown */}
          {showDropdown && (
            <div className="absolute top-12 right-0 w-80 glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl bg-[#0d0c13]/95 animate-fade-in z-50">
              <div className="p-3.5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                  <h3 className="text-white text-xs font-bold uppercase tracking-wider">Engine Alerts</h3>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] text-slate-400 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <p className="p-6 text-center text-slate-400 text-xs">No active alerts in the Riveria Engine.</p>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-3.5 hover:bg-white/5 transition-colors">
                      <p className="text-white text-xs font-medium leading-relaxed">{notif.message}</p>
                      <p className="text-slate-500 text-[10px] font-mono mt-1">{notif.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Refined Luxury User Pill */}
        <div className="flex items-center gap-2 pl-2">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-inner">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-secondary text-black flex items-center justify-center text-xs font-bold shadow-[0_0_10px_rgba(208,188,255,0.4)]">
              {userInitial}
            </div>
            <span className="hidden sm:inline-block text-white text-xs font-medium max-w-[150px] truncate">
              {user?.email || 'Listener'}
            </span>
          </div>

          {/* Refined Logout Action Button */}
          <button
            onClick={logout}
            title="Log out of Riveria Engine"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 text-xs font-medium hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

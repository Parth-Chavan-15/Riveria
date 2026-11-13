import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminLinks = [
    { to: '/admin', label: 'Engine Console', icon: 'terminal', badge: 'LIVE' },
    { to: '/admin/catalog', label: 'Catalog Master', icon: 'library_music' },
    { to: '/admin/users', label: 'User Governance', icon: 'admin_panel_settings' },
  ];

  const adminStudioLinks = [
    { to: '/', label: 'Discovery', icon: 'explore' },
    { to: '/sync', label: 'Master Ingest & Staging', icon: 'cloud_upload' },
    { to: '/session', label: 'WebRTC Jam Director', icon: 'settings_input_antenna' },
    { to: '/settings', label: 'Mastering DSP & EQ', icon: 'tune' },
  ];

  const listenerLinks = [
    { to: '/', label: 'Discovery', icon: 'explore' },
    { to: '/sync', label: 'Local Sync Hub', icon: 'sync_desktop' },
    { to: '/session', label: 'WebRTC Session', icon: 'settings_input_antenna' },
    { to: '/settings', label: 'Engine Settings', icon: 'tune' },
  ];

  const renderNavContent = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <Link to="/" onClick={onClose} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border border-glass-border bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              graphic_eq
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">Riveria Music</h1>
            <p className="text-xs text-slate-400">High-Fidelity Audio</p>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex flex-col gap-5 flex-grow overflow-y-auto pr-1">
        {/* Admin Navigation Section (Visible ONLY to Admin accounts) */}
        {isAdmin && (
          <div>
            <div className="flex items-center gap-1.5 px-3 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-rose-400">
                System Architect
              </p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {adminLinks.map((link) => {
                const isActive = path === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={`flex items-center justify-between py-2.5 rounded-xl px-3.5 transition-all duration-200 ${
                      isActive
                        ? 'text-white font-bold border-l-4 border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        {link.icon}
                      </span>
                      <span className="text-xs font-semibold">{link.label}</span>
                    </div>
                    {link.badge && (
                      <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </ul>
          </div>
        )}

        {/* Secondary Navigation Section */}
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-slate-500 px-3 mb-2">
            {isAdmin ? 'Studio & Broadcast' : 'Listener Suite'}
          </p>
          <ul className="flex flex-col gap-1.5">
            {(isAdmin ? adminStudioLinks : listenerLinks).map((link) => {
              const isActive = path === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 py-2.5 rounded-xl px-3.5 transition-all duration-200 ${
                    isActive
                      ? 'text-white font-bold border-l-4 border-primary bg-white/10 shadow-[0_0_15px_rgba(208,188,255,0.15)]'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {link.icon}
                  </span>
                  <span className="text-xs font-semibold">{link.label}</span>
                </Link>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Floating Panel */}
      <nav className="hidden md:flex glass-panel flex-col w-64 p-5 z-40 fixed top-6 bottom-32 left-6 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-2xl bg-[#09090c]/90">
        {renderNavContent()}
      </nav>

      {/* 2. Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* 3. Mobile Slide-Over Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#0d0c13] border-r border-white/10 p-6 z-50 flex flex-col md:hidden transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent()}
      </div>
    </>
  );
}

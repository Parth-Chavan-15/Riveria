import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const location = useLocation();
  const path = location.pathname;

  const navLinks = [
    { to: '/', label: 'Discovery', icon: 'explore' },
    { to: '/sync', label: 'Local Sync Hub', icon: 'sync_desktop' },
    { to: '/session', label: 'WebRTC Session', icon: 'settings_input_antenna' },
  ];

  const bottomLinks = [
    { to: '/landing', label: 'Engine Overview', icon: 'auto_awesome' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const renderNavContent = () => (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-glass-border bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)]">
            <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              graphic_eq
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">Riveria Music</h1>
            <p className="text-xs text-slate-400">High-Fidelity Audio</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          aria-label="Close menu"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <ul className="flex flex-col gap-2 flex-grow">
        {navLinks.map((link) => {
          const isActive = path === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={`flex items-center gap-3 py-3 rounded-xl pl-4 transition-all duration-200 ${
                isActive
                  ? 'text-white font-bold border-l-4 border-primary bg-white/10 shadow-[0_0_15px_rgba(208,188,255,0.15)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {link.icon}
              </span>
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </ul>

      <ul className="flex flex-col gap-2 mt-auto border-t border-white/10 pt-4">
        {bottomLinks.map((link) => {
          const isActive = path === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={`flex items-center gap-3 py-3 rounded-xl pl-4 transition-all duration-200 ${
                isActive
                  ? 'text-white font-bold border-l-4 border-primary bg-white/10'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{link.icon}</span>
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </ul>
    </>
  );

  return (
    <>
      {/* 1. Desktop Floating Panel (z-40 sits on top of full-width TopBar z-20) */}
      <nav className="hidden md:flex glass-panel flex-col w-64 p-6 z-40 fixed top-6 bottom-32 left-6 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-2xl bg-[#09090c]/90">
        {renderNavContent()}
      </nav>

      {/* 2. Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        />
      )}

      {/* 3. Mobile Slide-out Drawer */}
      <nav
        className={`fixed inset-y-0 left-0 w-72 p-6 z-50 flex flex-col glass-panel border-r border-white/10 backdrop-blur-2xl bg-[#09090c]/98 shadow-2xl transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavContent()}
      </nav>
    </>
  );
}

import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="hidden md:flex glass-panel flex-col w-64 p-6 z-40 fixed top-8 bottom-32 left-8 rounded-xl shadow-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full border border-glass-border bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_15px_rgba(208,188,255,0.4)]">
          <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-primary tracking-tight">Riveria Music</h1>
          <p className="text-xs text-slate-400">High-Fidelity Audio</p>
        </div>
      </div>

      <ul className="flex flex-col gap-2 flex-grow">
        <Link to="/" className={`flex items-center gap-3 py-3 rounded-lg pl-4 transition-all duration-200 ${path === '/' ? 'text-white font-bold border-l-4 border-primary bg-white/10' : 'text-slate-400 hover:bg-glass-surface hover:text-white'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: path === '/' ? "'FILL' 1" : "'FILL' 0" }}>explore</span>
          <span>Discovery</span>
        </Link>
        <Link to="/sync" className={`flex items-center gap-3 py-3 rounded-lg pl-4 transition-all duration-200 ${path === '/sync' ? 'text-white font-bold border-l-4 border-primary bg-white/10' : 'text-slate-400 hover:bg-glass-surface hover:text-white'}`}>
          <span className="material-symbols-outlined">sync_desktop</span>
          <span>Local Sync Hub</span>
        </Link>
        <Link to="/session" className={`flex items-center gap-3 py-3 rounded-lg pl-4 transition-all duration-200 ${path === '/session' ? 'text-white font-bold border-l-4 border-primary bg-white/10' : 'text-slate-400 hover:bg-glass-surface hover:text-white'}`}>
          <span className="material-symbols-outlined">settings_input_antenna</span>
          <span>WebRTC Session</span>
        </Link>
      </ul>

      <ul className="flex flex-col gap-2 mt-auto border-t border-glass-border pt-4">
        <Link to="/settings" className={`flex items-center gap-3 py-3 rounded-lg pl-4 transition-all duration-200 ${path === '/settings' ? 'text-white font-bold border-l-4 border-primary bg-white/10' : 'text-slate-400 hover:bg-glass-surface hover:text-white'}`}>
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </Link>
      </ul>
    </nav>
  );
}
export default Sidebar;

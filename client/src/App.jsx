import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PlayerProvider } from './context/PlayerContext';
import { AuthProvider } from './context/AuthContext';
import { JamProvider } from './context/JamContext';
import { useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import BottomPlayer from './components/BottomPlayer';
import Dashboard from './pages/Dashboard';
import AuthPortal from './pages/AuthPortal';
import LocalSyncHub from './pages/LocalSyncHub';
import WebRTCSession from './pages/WebRTCSession';
import LandingPage from './pages/LandingPage';
import Settings from './pages/Settings';

// Protected Route Wrapper with return URL redirection
const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${returnUrl}`} replace />;
  }
  return children;
};

// Route wrapper for guest invite landing on /session
const SessionGuestRedirect = () => {
  const location = useLocation();
  const returnUrl = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/auth?redirect=${returnUrl}`} replace />;
};

function AppContent() {
  const { token } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Background Ambience */}
      <div className="fixed top-[-20%] left-[-10%] w-[70vw] h-[70vh] bg-[radial-gradient(circle,rgba(208,188,255,0.05)_0%,transparent_70%)] rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vh] bg-[radial-gradient(circle,rgba(137,206,255,0.03)_0%,transparent_70%)] rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      {token ? (
        <div className="flex flex-1 overflow-hidden w-full relative z-10 min-h-screen">
          <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <TopBar onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)} />
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/sync" element={<ProtectedRoute><LocalSyncHub /></ProtectedRoute>} />
            <Route path="/session" element={<ProtectedRoute><WebRTCSession /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <BottomPlayer />
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPortal />} />
          <Route path="/session" element={<SessionGuestRedirect />} />
          <Route path="/sync" element={<SessionGuestRedirect />} />
          <Route path="/settings" element={<SessionGuestRedirect />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <JamProvider>
            <AppContent />
          </JamProvider>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider } from "./context/PlayerContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import BottomPlayer from "./components/BottomPlayer";
import Dashboard from "./pages/Dashboard";
import AuthPortal from "./pages/AuthPortal";
import LocalSyncHub from "./pages/LocalSyncHub";
import WebRTCSession from "./pages/WebRTCSession";

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
    const { token } = useAuth();
    return token ? children : <Navigate to="/auth" />;
};

function AppContent() {
    const { token } = useAuth();

    return (
        <>
            {/* Background Ambience */}
            <div className="fixed top-[-20%] left-[-10%] w-[70vw] h-[70vh] bg-[radial-gradient(circle,rgba(208,188,255,0.05)_0%,transparent_70%)] rounded-full blur-[100px] -z-10 pointer-events-none"></div>
            <div className="fixed bottom-[-20%] right-[-10%] w-[60vw] h-[60vh] bg-[radial-gradient(circle,rgba(137,206,255,0.03)_0%,transparent_70%)] rounded-full blur-[100px] -z-10 pointer-events-none"></div>

            {token ? (
                <div className="flex flex-1 overflow-hidden w-full relative z-10 min-h-screen">
                    <Sidebar />
                    <TopBar />
                    <Routes>
                        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/sync" element={<ProtectedRoute><LocalSyncHub /></ProtectedRoute>} />
                        <Route path="/session" element={<ProtectedRoute><WebRTCSession /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><main className="flex-1 md:ml-64 p-6 pt-28 text-slate-300">Playback settings are managed by your browser and device.</main></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                    <BottomPlayer />
                </div>
            ) : (
                <Routes>
                    <Route path="/auth" element={<AuthPortal />} />
                    <Route path="*" element={<Navigate to="/auth" />} />
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
                    <AppContent />
                </PlayerProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;

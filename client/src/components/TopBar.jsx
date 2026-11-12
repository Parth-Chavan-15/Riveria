import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { io } from 'socket.io-client';
import { getAccessToken } from '../services/api';

function TopBar() {
    const { user, logout } = useAuth();
    
    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL;
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const targetUrl = socketUrl || (isLocal ? window.location.origin : null);
        if (!targetUrl) return;

        const socket = io(targetUrl, {
            path: '/socket.io',
            auth: { token: getAccessToken() },
            reconnectionAttempts: 2,
            timeout: 3000
        });

        // Listen for incoming notifications from the backend
        socket.on('notification', (newNotification) => {
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
        });

        // Cleanup on unmount to prevent duplicate listeners
        return () => {
            socket.off('notification');
            socket.disconnect();
        };
    }, []);

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown) setUnreadCount(0); // Clear badge when opened
    };

    return (
        <header className="hidden md:flex fixed top-0 left-80 right-0 h-20 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 justify-between items-center px-8 z-30">
            <div className="flex-grow max-w-md hidden md:block">
                {/* Search Bar Placeholder */}
            </div>
            
            <div className="flex items-center gap-6 ml-auto">
                {/* Role-Based UI Element */}
                {user?.role === 'admin' && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        Admin Mode
                    </span>
                )}
                
                {/* Notification Bell */}
                <div className="relative">
                    <button 
                        onClick={toggleDropdown} 
                        className="text-slate-400 hover:text-white transition-colors relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showDropdown && (
                        <div className="absolute top-14 right-0 w-80 glass-panel border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up">
                            <div className="p-4 border-b border-white/10 bg-white/5">
                                <h3 className="text-white font-bold tracking-tight">System Alerts</h3>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <p className="p-6 text-center text-slate-400 text-sm">No new alerts in the Riveria Engine.</p>
                                ) : (
                                    notifications.map((notif) => (
                                        <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <p className="text-white text-sm font-medium">{notif.message}</p>
                                            <p className="text-slate-500 text-xs mt-1">{notif.time}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Info & Logout */}
                <div className="text-white text-sm font-medium border-l border-white/10 pl-6 mr-2">{user?.email}</div>
                <button onClick={logout} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white text-sm hover:bg-white/10 hover:text-primary transition-all">
                    Logout
                </button>
            </div>
        </header>
    );
}

export default TopBar;

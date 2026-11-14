import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { audioCoordinator } from '../services/audioCoordinator';

function AuthPortal() {
    const [searchParams] = useSearchParams();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { token, user, login, register, logout, error, isLoading, clearError } = useAuth();
    const navigate = useNavigate();

    const redirectTarget = searchParams.get('redirect') || '/';
    const isJamInvite = searchParams.get('invite') === 'true' || redirectTarget.includes('invite=true');
    const isSwitchRequest = searchParams.get('switch') === 'true';

    useEffect(() => {
        // Enforce silence upon entering the authentication gateway
        audioCoordinator.stopAll('auth-portal-mounted');
    }, []);

    useEffect(() => {
        if (isSwitchRequest && token) {
            logout();
        }
    }, [isSwitchRequest, token, logout]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = isLogin ? await login(email, password) : await register(email, password);
        if (success) {
            navigate(redirectTarget, { replace: true });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center w-full relative z-20 px-4">
            <div className="glass-panel p-8 md:p-10 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
                {isJamInvite && (
                    <div className="mb-6 p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-lg flex-shrink-0">settings_input_antenna</span>
                        <span>You were invited to a WebRTC Listening Jam. Sign in or register below to join automatically!</span>
                    </div>
                )}

                <div className="flex justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-8 text-center tracking-tight">
                    {token ? 'Active Session' : isLogin ? 'Enter Riveria' : 'Join Riveria'}
                </h2>
                
                {token ? (
                    <div className="flex flex-col gap-5 text-center">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Current Session</p>
                            <p className="text-base font-bold text-white mt-1 truncate">{user?.email || 'Authenticated User'}</p>
                            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-mono text-primary">
                                {user?.role === 'admin' ? 'System Architect' : 'Listener'}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate(redirectTarget, { replace: true })}
                            className="bg-primary text-black font-bold rounded-xl px-4 py-3 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(208,188,255,0.4)]"
                        >
                            Continue to Riveria
                        </button>

                        <button
                            type="button"
                            onClick={logout}
                            className="text-xs text-slate-400 hover:text-white transition-colors py-2 border border-white/10 rounded-xl hover:bg-white/5"
                        >
                            Sign in with a different account for this tab
                        </button>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                            {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 uppercase tracking-widest font-semibold ml-1">Email</label>
                                <input
                                    type="email" placeholder="user@riveria.com" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-slate-400 uppercase tracking-widest font-semibold ml-1">Password</label>
                                <input
                                    type="password" placeholder={isLogin ? "Your password" : "6+ characters"} minLength={isLogin ? 1 : 6} required
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                            <button disabled={isLoading} type="submit" className="bg-primary text-black font-bold rounded-xl px-4 py-3 hover:scale-105 transition-transform mt-4 shadow-[0_0_20px_rgba(208,188,255,0.4)] disabled:opacity-60">
                                {isLoading ? 'Authenticating…' : isLogin ? 'Authenticate' : 'Register Signature'}
                            </button>
                        </form>
                        
                        <button type="button" className="w-full text-slate-400 text-sm mt-6 text-center hover:text-white transition-colors" onClick={() => { clearError(); setIsLogin(!isLogin); }}>
                            {isLogin ? "New to the engine? Initialize here." : "Signature recognized? Authenticate."}
                        </button>
                    </>
                )}

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/landing')}
                        className="text-xs text-primary/80 hover:text-primary transition-colors inline-flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span>Back to Riveria Overview</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthPortal;

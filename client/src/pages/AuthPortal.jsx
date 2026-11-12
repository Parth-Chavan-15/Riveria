import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { audioCoordinator } from '../services/audioCoordinator';

function AuthPortal() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, register, error, isLoading, clearError } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Enforce silence upon entering the authentication gateway
        audioCoordinator.stopAll('auth-portal-mounted');
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = isLogin ? await login(email, password) : await register(email, password);
        if (success) navigate('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center w-full relative z-20">
            <div className="glass-panel p-10 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl animate-fade-in-up">
                <div className="flex justify-center mb-8">
                    <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>graphic_eq</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-8 text-center tracking-tight">
                    {isLogin ? 'Enter Riveria' : 'Join Riveria'}
                </h2>
                
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

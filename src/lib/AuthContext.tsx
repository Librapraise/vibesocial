import React, { createContext, useState, useContext, useEffect } from 'react';
import { createClient, type Session, type User } from '@supabase/supabase-js';

// ─── Supabase browser client (uses anon key) ─────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Context Types ────────────────────────────────────────────────────────────

interface AuthContextType {
    user: any;
    session: Session | null;
    isAuthenticated: boolean;
    isLoadingAuth: boolean;
    isLoadingPublicSettings: boolean;
    authError: any;
    appPublicSettings: any;
    logout: (shouldRedirect?: boolean) => void;
    navigateToLogin: () => void;
    checkAppState: () => Promise<void>;
    isDemoMode: boolean;
    loginAsDemo: () => void;
    updateUser: (data: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const hasLoadedInitialAuth = React.useRef(false);
    const [session, setSession] = useState<Session | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
    const [authError, setAuthError] = useState<any>(null);
    const [appPublicSettings] = useState<any>({ id: 'vibesocial', public_settings: {} });

    useEffect(() => {
        if (localStorage.getItem('vibe_demo_mode') === 'true') {
            handleSessionChange(null);
            return;
        }

        // 1. Get the initial session (handles page refresh)
        supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
            handleSessionChange(session);
        });

        // 2. Subscribe to auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
            (_event, session) => {
                if (localStorage.getItem('vibe_demo_mode') === 'true') return;
                handleSessionChange(session);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const handleSessionChange = async (session: Session | null) => {
        if (!hasLoadedInitialAuth.current) {
            setIsLoadingAuth(true);
        }

        if (localStorage.getItem('vibe_demo_mode') === 'true') {
            setSession({
                access_token: 'demo-token',
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: 'demo-refresh',
                user: { id: 'demo-user-id', email: 'demo@vibesocial.com' }
            } as any);
            setUser({
                id: 'demo-user-id',
                email: 'demo@vibesocial.com',
                name: 'Demo Guest',
                role: 'attendee',
                bio: 'Exploring events and venues around the city!',
                social_links: { instagram: '', spotify: '' },
                vibe_preferences: [],
                privacy_settings: { is_private: false, show_on_leaderboard: true },
                subscription_tier: 'free',
                notification_settings: {
                    push_enabled: true,
                    event_start_alerts: true,
                    status_updates: true,
                    crowd_level_changes: true,
                    wait_time_alerts: true,
                    chat_mentions: true,
                    weekly_digest: true
                }
            });
            setIsAuthenticated(true);
            setAuthError(null);
            setIsLoadingAuth(false);
            return;
        }

        if (session) {
            // Store token for axios interceptor
            localStorage.setItem('vibe_token', session.access_token);
            if (session.refresh_token) {
                localStorage.setItem('vibe_refresh_token', session.refresh_token);
            }
            setSession(session);

            // Fetch user profile from our users table via the API
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/me`,
                    { headers: { Authorization: `Bearer ${session.access_token}` } }
                );
                if (res.ok) {
                    const profile = await res.json();
                    setUser(profile);
                } else if (res.status === 401) {
                    localStorage.removeItem('vibe_token');
                    localStorage.removeItem('vibe_refresh_token');
                    await supabaseBrowser.auth.signOut();
                    setSession(null);
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoadingAuth(false);
                    hasLoadedInitialAuth.current = true;
                    if (window.location.pathname !== "/Login" && window.location.pathname !== "/Register") {
                        window.location.href = "/Login?expired=true";
                    }
                    return;
                } else {
                    setUser({ id: session.user.id, email: session.user.email, name: session.user.email });
                }
            } catch {
                setUser({ id: session.user.id, email: session.user.email, name: session.user.email });
            }

            setIsAuthenticated(true);
            setAuthError(null);
        } else {
            localStorage.removeItem('vibe_token');
            localStorage.removeItem('vibe_refresh_token');
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
        hasLoadedInitialAuth.current = true;
    };

    const checkAppState = async () => {
        if (localStorage.getItem('vibe_demo_mode') === 'true') {
            await handleSessionChange(null);
            return;
        }
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        await handleSessionChange(session);
    };

    const logout = async (shouldRedirect = true) => {
        localStorage.removeItem('vibe_demo_mode');
        await supabaseBrowser.auth.signOut();
        if (shouldRedirect) {
            window.location.href = '/Login';
        }
    };

    const loginAsDemo = () => {
        localStorage.setItem('vibe_demo_mode', 'true');
        handleSessionChange(null);
    };

    const isDemoMode = isAuthenticated && localStorage.getItem('vibe_demo_mode') === 'true';

    const navigateToLogin = () => {
        window.location.href = '/Login';
    };

    const updateUser = (data: any) => {
        setUser((prev: any) => {
            if (!prev) return prev;
            return { ...prev, ...data };
        });
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            isAuthenticated,
            isLoadingAuth,
            isLoadingPublicSettings,
            authError,
            appPublicSettings,
            logout,
            navigateToLogin,
            checkAppState,
            isDemoMode,
            loginAsDemo,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

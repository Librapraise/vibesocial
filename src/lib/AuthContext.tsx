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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
    const [authError, setAuthError] = useState<any>(null);
    const [appPublicSettings] = useState<any>({ id: 'vibesocial', public_settings: {} });

    useEffect(() => {
        // 1. Get the initial session (handles page refresh)
        supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
            handleSessionChange(session);
        });

        // 2. Subscribe to auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
            (_event, session) => {
                handleSessionChange(session);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const handleSessionChange = async (session: Session | null) => {
        setIsLoadingAuth(true);
        if (session) {
            // Store token for axios interceptor
            localStorage.setItem('vibe_token', session.access_token);
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
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
    };

    const checkAppState = async () => {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        await handleSessionChange(session);
    };

    const logout = async (shouldRedirect = true) => {
        await supabaseBrowser.auth.signOut();
        if (shouldRedirect) {
            window.location.href = '/Login';
        }
    };

    const navigateToLogin = () => {
        window.location.href = '/Login';
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
            checkAppState
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

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import authService from '../services/authService';
import { setupInterceptors } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // We use a ref for the token so the interceptor can always get the latest value
    // without having to re-setup the interceptor on every token change.
    const accessTokenRef = useRef(null);

    const logout = useCallback(async () => {
        const userId = user?.user_id;
        
        // OPTIMISTIC: Clear local state immediately for a responsive UI
        setUser(null);
        accessTokenRef.current = null;
        setLoading(false);
        localStorage.removeItem('sc_session_hint');

        try {
            // Attempt to notify backend, but don't block the UI
            if (userId) {
                await authService.logout(userId);
            }
        } catch (error) {
            console.error('Logout API call failed, but local state was cleared:', error);
        }
    }, [user]);

    const setAccessToken = (token) => {
        accessTokenRef.current = token;
    };

    const getAccessToken = () => accessTokenRef.current;

    // Initialize interceptors
    useEffect(() => {
        setupInterceptors(getAccessToken, setAccessToken, logout);
    }, [logout]);

    // Initial check for session (silent refresh) on app load
    const checkStarted = useRef(false);
    useEffect(() => {
        if (checkStarted.current) return;
        checkStarted.current = true;

        const checkSession = async () => {
            const hasSessionHint = localStorage.getItem('sc_session_hint') === 'true';

            if (!hasSessionHint) {
                setLoading(false);
                return;
            }

            try {
                // PROACTIVE: Try to refresh the session first before calling /me 
                // to avoid a noisy 401 in the console if the token is expired.
                const data = await authService.refresh(); 
                setAccessToken(data.accessToken); 
                
                const userData = await authService.getMe();
                setUser(userData);
            } catch (err) {
                console.log('Session recovery failed, clearing hint');
                localStorage.removeItem('sc_session_hint');
            } finally {
                setLoading(false);
            }
        };

        checkSession();
    }, []);

    const login = async (credentials) => {
        const data = await authService.login(credentials);
        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem('sc_session_hint', 'true'); // Set hint on successful login
        return data;
    };

    const signup = async (userData) => {
        const data = await authService.signup(userData);
        setUser(data.user);
        setAccessToken(data.accessToken);
        localStorage.setItem('sc_session_hint', 'true'); // Set hint on successful signup
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

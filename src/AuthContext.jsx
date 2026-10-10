import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setAuthToken, setUnauthorizedHandler } from './api';

const STORAGE_KEY = 'auth';
const AuthContext = createContext(null);

const readSession = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(() => {
        const saved = readSession();
        setAuthToken(saved?.token ?? null);
        return saved;
    });

    const saveSession = useCallback((next) => {
        setAuthToken(next?.token ?? null);
        if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        else localStorage.removeItem(STORAGE_KEY);
        setSession(next);
    }, []);

    const logout = useCallback(() => saveSession(null), [saveSession]);

    useEffect(() => {
        setUnauthorizedHandler(logout);
    }, [logout]);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        saveSession(data);
    };

    const register = async (username, email, password) => {
        const { data } = await api.post('/users', { username, email, password });
        saveSession(data);
    };

    return (
        <AuthContext.Provider value={{ user: session?.user ?? null, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

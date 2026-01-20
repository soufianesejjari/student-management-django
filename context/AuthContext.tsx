"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { jwtDecode } from 'jwt-decode';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
    user_id: number;
    username: string;
    // Add other claims if needed
}

interface AuthContextType {
    user: User | null;
    login: (access: string, refresh: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Init auth from cookies
        const access = getCookie('access_token');
        if (access) {
            try {
                const decoded = jwtDecode<User>(access as string);
                setUser(decoded);
            } catch (e) {
                console.error("Invalid token", e);
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = (access: string, refresh: string) => {
        setCookie('access_token', access);
        setCookie('refresh_token', refresh);

        const decoded = jwtDecode<User>(access);
        setUser(decoded);

        router.push('/dashboard');
    };

    const logout = () => {
        deleteCookie('access_token');
        deleteCookie('refresh_token');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

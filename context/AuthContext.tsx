"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { jwtDecode } from 'jwt-decode';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type UserRole = 'admin' | 'secretaire';

export interface User {
    user_id: number;
    username: string;
    email?: string;
    full_name?: string;
    role: UserRole;
    is_admin: boolean;
    /** '*' means "all permissions" (admin). Otherwise an array of Django-style perm strings. */
    permissions: string[] | ['*'];
}

interface AuthContextType {
    user: User | null;
    login: (access: string, refresh: string) => void;
    logout: () => void;
    loading: boolean;
    /** Convenience: true when the logged-in user is an admin/superuser */
    isAdmin: boolean;
}

// -----------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const logout = () => {
        deleteCookie('access_token');
        deleteCookie('refresh_token');
        setUser(null);
        router.push('/login');
    };

    const isAdmin = !!(user && (user.is_admin || user.role === 'admin'));

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, isAdmin }}>
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


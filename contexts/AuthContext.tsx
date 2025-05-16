"use client"

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface User {
    name?: string;
    email: string;
    role: "user" | "admin";
}

interface AuthState {
    user: User | null;
    token: string | null;
}

interface AuthContextType {
    auth: AuthState;
    login: (user: User, token: string) => void;
    logout: () => void;
    signup: (email: string, password: string, name: string) => Promise<boolean>;
}

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [auth, setAuth] = useState<AuthState>({
        user: null,
        token: null,
    });

    useEffect(() => {
        const initializeAuth = async () => {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');

            if (storedUser && storedToken) {
                setAuth({
                    user: JSON.parse(storedUser),
                    token: storedToken,
                });
            }
        };

        initializeAuth();
    }, []);

    const login = (user: User, token: string) => {
        console.log("[AuthContext.tsx] login method invoked. User:", user, "Token:", token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        setAuth({ user, token });
        console.log("[AuthContext.tsx] Auth state updated. New auth.user:", user);
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setAuth({ user: null, token: null });
    };

    const signup = async (email: string, password: string, name: string) => {
        try {
            const response = await fetch(`http://localhost:3000/v1/api/user/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (data.token && data.user) {
                login(data.user, data.token);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Signup failed:", error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthProvider;

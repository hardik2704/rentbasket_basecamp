import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, LoginForm } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginForm) => Promise<boolean>;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('rentbasket_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [isLoading, setIsLoading] = useState(false);

    // Verify token on app load
    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('rentbasket_token');
            if (token) {
                try {
                    const response = await authAPI.getMe();
                    setUser(response.data.user);
                    localStorage.setItem('rentbasket_user', JSON.stringify(response.data.user));
                } catch {
                    // Token invalid, clear storage
                    localStorage.removeItem('rentbasket_token');
                    localStorage.removeItem('rentbasket_user');
                    setUser(null);
                }
            }
        };
        verifyToken();
    }, []);

    const login = useCallback(async (credentials: LoginForm): Promise<boolean> => {
        setIsLoading(true);

        try {
            const response = await authAPI.login(credentials.email, credentials.password);

            if (response.success) {
                setUser(response.data.user);
                localStorage.setItem('rentbasket_user', JSON.stringify(response.data.user));
                localStorage.setItem('rentbasket_token', response.data.token);
                setIsLoading(false);
                return true;
            }

            setIsLoading(false);
            return false;
        } catch (error) {
            console.error('Login error:', error);
            setIsLoading(false);
            return false;
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('rentbasket_user');
        localStorage.removeItem('rentbasket_token');
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

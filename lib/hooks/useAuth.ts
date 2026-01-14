/**
 * useAuth Hook
 * Manages authentication state with Supabase
 */

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser, onAuthStateChange, signInWithEmail, signOut, signUpWithEmail } from '../../services/auth';
import type { User } from '../../types';

interface UseAuthReturn {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<{ error: string | null }>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial user
        getCurrentUser().then((currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });

        // Subscribe to auth changes
        const { data: { subscription } } = onAuthStateChange((newUser) => {
            setUser(newUser);
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        const { user: newUser, error } = await signInWithEmail(email, password);
        if (newUser) {
            setUser(newUser);
        }
        setIsLoading(false);
        return { error };
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        setIsLoading(true);
        const { user: newUser, error } = await signUpWithEmail(email, password);
        if (newUser) {
            setUser(newUser);
        }
        setIsLoading(false);
        return { error };
    }, []);

    const logout = useCallback(async () => {
        setIsLoading(true);
        const { error } = await signOut();
        if (!error) {
            setUser(null);
        }
        setIsLoading(false);
        return { error };
    }, []);

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        logout,
    };
}

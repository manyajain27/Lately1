/**
 * Authentication Service
 * Handles email/password auth with Supabase
 */

import type { User } from '../types';
import { supabase } from './supabase';

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return { user: null, error: error.message };
        }

        if (data.user) {
            return {
                user: {
                    id: data.user.id,
                    email: data.user.email || email,
                    createdAt: data.user.created_at,
                    isPro: false,
                },
                error: null,
            };
        }

        return { user: null, error: 'Failed to create account' };
    } catch (err) {
        return { user: null, error: 'An unexpected error occurred' };
    }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { user: null, error: error.message };
        }

        if (data.user) {
            return {
                user: {
                    id: data.user.id,
                    email: data.user.email || email,
                    createdAt: data.user.created_at,
                    isPro: false, // TODO: Fetch from user profile
                },
                error: null,
            };
        }

        return { user: null, error: 'Failed to sign in' };
    } catch (err) {
        return { user: null, error: 'An unexpected error occurred' };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: string | null }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            return { error: error.message };
        }
        return { error: null };
    } catch (err) {
        return { error: 'An unexpected error occurred' };
    }
}

/**
 * Get the current session
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
        return {
            id: data.user.id,
            email: data.user.email || '',
            createdAt: data.user.created_at,
            isPro: false, // TODO: Fetch from user profile
        };
    }

    return null;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            callback({
                id: session.user.id,
                email: session.user.email || '',
                createdAt: session.user.created_at,
                isPro: false,
            });
        } else {
            callback(null);
        }
    });
}

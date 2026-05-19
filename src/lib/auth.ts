import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export async function signUp(params: { email: string; password: string; firstName?: string }) {
  const { email, password, firstName } = params;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName || null,
      },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  // Si email confirmation activée, data.user existe mais session=null
  // On gère ça côté UI : on dit à l'user de vérifier sa boîte mail
  return data;
}

export async function signIn(params: { email: string; password: string }) {
  const { email, password } = params;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(translateAuthError(error.message));
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Listener pour réagir aux changements d'auth en temps réel
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Reset password — envoie un email avec lien de reset
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });
  if (error) throw new Error(translateAuthError(error.message));
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (m.includes('email not confirmed')) {
    return 'Tu dois confirmer ton email avant de te connecter. Vérifie ta boîte.';
  }
  if (m.includes('user already registered') || m.includes('already exists')) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (m.includes('password')) {
    return 'Mot de passe trop faible (minimum 6 caractères).';
  }
  if (m.includes('email')) {
    return 'Email invalide.';
  }
  if (m.includes('rate limit')) {
    return 'Trop de tentatives, réessaie dans quelques minutes.';
  }
  return msg;
}

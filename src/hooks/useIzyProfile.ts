import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/types';
import { saveProfile as saveToDb, getProfile as getFromDb } from '@/lib/db';

const LS_KEY = 'izy_user_profile';

/**
 * Hook profil utilisateur.
 * Source de vérité : IndexedDB (déjà en place dans db.ts).
 * Miroir : localStorage (accès synchrone instantané pour l'UI).
 */
export function useIzyProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Init
  useEffect(() => {
    (async () => {
      // 1) tentative localStorage (instantané)
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as UserProfile;
          setProfile(parsed);
        }
      } catch {}

      // 2) source de vérité IndexedDB
      try {
        const db = await getFromDb();
        if (db) {
          setProfile(db);
          localStorage.setItem(LS_KEY, JSON.stringify(db));
        }
      } catch {}

      setLoaded(true);
    })();
  }, []);

  const update = useCallback(async (patch: Partial<UserProfile>) => {
    const next: UserProfile = { ...(profile || {} as UserProfile), ...patch };
    setProfile(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    try { await saveToDb(next); } catch {}
    return next;
  }, [profile]);

  const reset = useCallback(async () => {
    setProfile(null);
    try { localStorage.removeItem(LS_KEY); } catch {}
    // Note : on ne wipe pas IndexedDB ici car ça touche d'autres données.
    // Pour reset complet onboarding, on remet onboardingDone=false.
  }, []);

  const resetOnboarding = useCallback(async () => {
    await update({ onboardingDone: false, needs: [], izyTone: undefined, trade: undefined, modules: [] });
  }, [update]);

  return { profile, loaded, update, reset, resetOnboarding };
}

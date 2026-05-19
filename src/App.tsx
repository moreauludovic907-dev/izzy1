import { useEffect, useState } from 'react';
import { LoginScreen } from '@/modes/LoginScreen';
import { HomeScreen } from '@/modes/HomeScreen';
import { MyTimeMode } from '@/modes/MyTimeMode';
import { ModeIzyMode } from '@/modes/ModeIzyMode';
import { SocieteMode } from '@/modes/SocieteMode';
import { OnAirMode } from '@/modes/OnAirMode';
import { QuoteDetailScreen } from '@/modes/QuoteDetailScreen';
import { IzyOnboarding } from '@/components/onboarding/IzyOnboarding';
import { getProfile, saveProfile } from '@/lib/db';
import { getSession, onAuthStateChange } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { ModeName, UserProfile } from '@/types';

type AppState = 'loading' | 'login' | 'onboarding' | 'app';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [screen, setScreen] = useState<ModeName>('home');
  const [screenData, setScreenData] = useState<any>(null);

  // Vérif session au chargement + listener changements auth
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured()) {
        // Mode dégradé sans Supabase
        setAppState('login');
        return;
      }
      const session = await getSession();
      if (!mounted) return;
      if (!session) {
        setAppState('login');
        return;
      }
      await loadUserProfile();
    };

    const loadUserProfile = async () => {
      const p = await getProfile();
      if (!mounted) return;
      setProfile(p);
      if (p?.onboardingDone) {
        setAppState('app');
      } else {
        setAppState('onboarding');
      }
    };

    init();

    // Listener temps réel : si l'user se déconnecte d'un autre tab, on bascule en login
    const { data: { subscription } } = onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setAppState('login');
      } else if (event === 'SIGNED_IN') {
        loadUserProfile();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const navigate = (m: ModeName, data?: any) => {
    setScreen(m);
    setScreenData(data);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleAuthSuccess = async () => {
    const p = await getProfile();
    setProfile(p);
    if (p?.onboardingDone) {
      setAppState('app');
    } else {
      setAppState('onboarding');
    }
  };

  const handleOnboardingComplete = async (full: UserProfile) => {
    const merged: UserProfile = { ...(profile || {} as UserProfile), ...full, onboardingDone: true };
    // ⚠️ Navigation IMMÉDIATE : on optimistic-update l'UI d'abord, on sauvegarde après.
    // Comme ça même si saveProfile fail (RLS, réseau...), l'user atterrit sur le dashboard.
    setProfile(merged);
    setAppState('app');
    // Save en arrière-plan
    try {
      await saveProfile(merged);
    } catch (e) {
      console.error('saveProfile failed (non-blocking):', e);
      // L'user est déjà sur le dashboard. La sauvegarde se retentera quand il modifiera quelque chose.
    }
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded-full border-2 animate-spin"
          style={{ borderColor: '#8B5CF6', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (appState === 'login') {
    return <LoginScreen onAuth={handleAuthSuccess} />;
  }

  if (appState === 'onboarding') {
    return (
      <div className="min-h-screen max-w-md mx-auto">
        <IzyOnboarding
          baseProfile={{
            id: profile?.id,
            email: profile?.email || '',
            firstName: profile?.firstName,
          }}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  const transcript = (screenData && typeof screenData === 'object' && screenData.transcript)
    ? (screenData.transcript as string)
    : undefined;
  const quoteId = (typeof screenData === 'string') ? screenData : undefined;

  return (
    <div className="min-h-screen max-w-md mx-auto" key={screen}>
      <div className="screen-enter">
        {screen === 'home' && <HomeScreen onNavigate={navigate} onLogout={() => setAppState('login')} />}
        {screen === 'on-air' && <OnAirMode onNavigate={navigate} />}
        {screen === 'my-time' && <MyTimeMode onNavigate={navigate} initialTranscript={transcript} />}
        {screen === 'mode-izy' && <ModeIzyMode onNavigate={navigate} initialMessage={transcript} />}
        {screen === 'societe' && <SocieteMode onNavigate={navigate} />}
        {screen === 'quote-detail' && quoteId && (
          <QuoteDetailScreen quoteId={quoteId} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

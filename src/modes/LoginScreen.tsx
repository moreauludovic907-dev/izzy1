import { useState } from 'react';
import { IZYCore } from '@/components/IZYCore';
import { signIn, signUp, requestPasswordReset } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

type Props = { onAuth: () => void };

type Mode = 'signin' | 'signup' | 'reset';

export function LoginScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const configured = isSupabaseConfigured();

  const submit = async () => {
    setError('');
    setInfo('');

    if (!configured) {
      setError('Configuration manquante. Crée un .env.local avec tes clés Supabase.');
      return;
    }

    if (mode === 'reset') {
      if (!email) { setError('Email requis'); return; }
      setLoading(true);
      try {
        await requestPasswordReset(email);
        setInfo("Email de réinitialisation envoyé. Vérifie ta boîte.");
      } catch (e: any) {
        setError(e?.message || 'Erreur');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }
    if (password.length < 6) {
      setError('Mot de passe : 6 caractères minimum');
      return;
    }
    if (mode === 'signup' && !firstName.trim()) {
      setError('Ton prénom est requis');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signUp({ email, password, firstName: firstName.trim() });
        // Si email confirmation activée → session = null
        if (!result.session) {
          setInfo("Compte créé. Vérifie ton email pour confirmer (vérifie aussi les spams).");
          setMode('signin');
        } else {
          onAuth();
        }
      } else {
        await signIn({ email, password });
        onAuth();
      }
    } catch (e: any) {
      setError(e?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 relative">
      <div className="w-full max-w-md screen-enter">
        <div className="flex justify-center mb-6">
          <IZYCore size={140} />
        </div>

        <h1 className="font-display text-3xl text-center" style={{ letterSpacing: '-0.02em' }}>
          {mode === 'signup' && <>Crée ton <span className="italic" style={{ color: '#A78BFA' }}>compte</span>.</>}
          {mode === 'signin' && <>Bon retour, <span className="italic" style={{ color: '#A78BFA' }}>chef</span>.</>}
          {mode === 'reset' && <>Mot de passe <span className="italic" style={{ color: '#A78BFA' }}>oublié</span>.</>}
        </h1>
        <p className="text-sm text-center mt-2 mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {mode === 'signup' && 'En 30 secondes, IZY te connaît.'}
          {mode === 'signin' && 'Connecte-toi pour retrouver tes devis.'}
          {mode === 'reset' && 'Tape ton email, on t\'envoie un lien.'}
        </p>

        <div className="space-y-3">
          {mode === 'signup' && (
            <Field label="Ton prénom">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ludo"
                className="w-full bg-transparent text-base py-2 outline-none"
                autoComplete="given-name"
              />
            </Field>
          )}

          <Field label="Email">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full bg-transparent text-base py-2 outline-none"
              autoComplete="email"
            />
          </Field>

          {mode !== 'reset' && (
            <Field label="Mot de passe">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-base py-2 outline-none"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </Field>
          )}
        </div>

        {error && (
          <p className="text-xs mt-3 px-1" style={{ color: '#FF6B6B' }}>{error}</p>
        )}
        {info && (
          <p className="text-xs mt-3 px-1" style={{ color: '#6EE7B7' }}>{info}</p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="btn-violet w-full py-4 rounded-2xl font-semibold mt-6 disabled:opacity-50"
        >
          {loading
            ? '…'
            : mode === 'signup'
              ? 'Créer mon compte'
              : mode === 'signin'
                ? 'Se connecter'
                : 'Envoyer le lien'}
        </button>

        <div className="flex justify-between items-center mt-4">
          {mode !== 'reset' ? (
            <button
              onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {mode === 'signup' ? 'J\'ai déjà un compte' : 'Créer un compte'}
            </button>
          ) : (
            <button
              onClick={() => setMode('signin')}
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Retour à la connexion
            </button>
          )}

          {mode === 'signin' && (
            <button
              onClick={() => setMode('reset')}
              className="text-xs"
              style={{ color: 'rgba(196,181,253,0.7)' }}
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>

        {!configured && (
          <div
            className="mt-6 p-3 rounded-xl text-xs"
            style={{
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              color: '#FED7AA',
            }}
          >
            ⚠️ Supabase non configuré.<br />
            Crée un fichier <code>.env.local</code> à la racine avec :<br />
            <code>VITE_SUPABASE_URL=...</code><br />
            <code>VITE_SUPABASE_ANON_KEY=...</code>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.010))',
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}>
      <label className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

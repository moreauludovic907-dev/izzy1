import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { IZYCore } from '@/components/IZYCore';
import { IZYActivation } from '@/components/IZYActivation';
import { ModeCard } from '@/components/ModeCard';
import { Sheet } from '@/components/Sheet';
import { Camera, Mic, MessageCircle, BarChart3, LogOut, RotateCcw, Download, Trash2 } from 'lucide-react';
import { getProfile, saveProfile, exportUserData, deleteUserAccount } from '@/lib/db';
import { signOut } from '@/lib/auth';
import { useHaptic } from '@/hooks/useHaptic';
import { getMessages } from '@/data/izyMessages';
import type { ModeName, UserProfile } from '@/types';

type Props = {
  onNavigate: (m: ModeName, data?: any) => void;
  onLogout: () => void;
};

export function HomeScreen({ onNavigate, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const haptic = useHaptic();

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  const messages = getMessages(profile?.izyTone);

  const logout = async () => {
    await signOut();
    onLogout();
  };

  const handleExport = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `izy-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erreur lors de l'export.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Supprimer définitivement ton compte et toutes tes données ? Cette action est irréversible.')) return;
    if (!confirm('Vraiment sûr ? Tous tes devis seront perdus.')) return;
    try {
      await deleteUserAccount();
      onLogout();
    } catch (e) {
      alert("Erreur lors de la suppression.");
    }
  };

  const resetOnboarding = async () => {
    if (!profile) return;
    if (!confirm('Refaire l\'onboarding IZY ?')) return;
    await saveProfile({ ...profile, onboardingDone: false });
    location.reload();
  };

  const activateIzy = () => {
    haptic.activate();
    setActivationOpen(true);
  };

  // Greeting selon le ton et l'heure
  const greeting = (() => {
    const base = messages.dashboardGreeting(profile?.firstName);
    return base;
  })();

  return (
    <div className="min-h-screen flex flex-col relative">
      <TopBar onProfile={() => setProfileOpen(true)} onAdd={() => setAddOpen(true)} />

      {/* Noyau central */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 -mt-4">
        <p
          className="font-mono text-[10px] tracking-[0.4em] uppercase mb-1"
          style={{ color: 'var(--ink-faint)' }}
        >
          {profile?.company?.name || profile?.companyName || ''}
        </p>
        <h1 className="font-display text-2xl mb-10 text-center px-4" style={{ letterSpacing: '-0.02em' }}>
          {greeting.includes('chef') || greeting.includes(profile?.firstName || '___') ? (
            greeting
          ) : (
            <>
              {greeting} <span className="italic" style={{ color: '#A78BFA' }}>chef</span>.
            </>
          )}
        </h1>

        <IZYCore
          size={260}
          onClick={activateIzy}
          label="Touche pour parler"
        />
      </div>

      {/* Cartes modes */}
      <div className="px-5 pb-8 pt-8">
        <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-4 text-center" style={{ color: 'var(--ink-faint)' }}>
          ─── Modes ───
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ModeCard
            icon={<Camera size={18} style={{ color: '#C4B5FD' }} />}
            label="ON AIR"
            sublabel="Caméra & assistance terrain"
            onClick={() => onNavigate('on-air')}
            comingSoon
          />
          <ModeCard
            icon={<Mic size={18} style={{ color: '#C4B5FD' }} />}
            label="MY TIME"
            sublabel="Devis vocaux"
            onClick={() => onNavigate('my-time')}
          />
          <ModeCard
            icon={<MessageCircle size={18} style={{ color: '#C4B5FD' }} />}
            label="MODE IZY"
            sublabel="Discute avec moi"
            onClick={() => onNavigate('mode-izy')}
          />
          <ModeCard
            icon={<BarChart3 size={18} style={{ color: '#C4B5FD' }} />}
            label="SOCIÉTÉ"
            sublabel="Pilote ton activité"
            onClick={() => onNavigate('societe')}
          />
        </div>
      </div>

      {/* Activation IZY */}
      <IZYActivation
        open={activationOpen}
        onClose={() => setActivationOpen(false)}
        onRoute={(mode, transcript) => {
          setActivationOpen(false);
          onNavigate(mode, { transcript });
        }}
      />

      {/* Profil */}
      <Sheet open={profileOpen} onClose={() => setProfileOpen(false)} title="Mon profil">
        <div className="space-y-3 mb-4">
          {profile?.firstName && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}>
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>
                Prénom
              </p>
              <p className="text-base font-medium">{profile.firstName}</p>
            </div>
          )}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>
              Entreprise
            </p>
            <p className="text-base font-medium">{profile?.company?.name || profile?.companyName || '—'}</p>
            {profile?.company?.address && (
              <p className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>{profile.company.address}</p>
            )}
          </div>
          {profile?.trade && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}>
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>
                Métier
              </p>
              <p className="text-base font-medium capitalize">{profile.trade.replace('-', ' ')}</p>
            </div>
          )}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--ink-faint)' }}>
              Email
            </p>
            <p className="text-sm">{profile?.email || '—'}</p>
          </div>
        </div>

        <button
          onClick={resetOnboarding}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--line-mid)',
            color: 'var(--ink-dim)',
          }}
        >
          <RotateCcw size={14} />
          Refaire l'onboarding
        </button>

        <button
          onClick={handleExport}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs mt-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--line-mid)',
            color: 'var(--ink-dim)',
          }}
        >
          <Download size={14} />
          Exporter mes données (RGPD)
        </button>

        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold mt-3"
          style={{
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.25)',
            color: '#FF6B6B',
          }}
        >
          <LogOut size={16} />
          Déconnexion
        </button>

        <button
          onClick={handleDeleteAccount}
          className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs mt-2 opacity-70"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,107,107,0.20)',
            color: '#FF6B6B',
          }}
        >
          <Trash2 size={12} />
          Supprimer mon compte
        </button>
      </Sheet>

      {/* Ajout rapide */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Ajout rapide">
        <div className="space-y-2">
          <QuickAddBtn label="Activer IZY" onClick={() => { setAddOpen(false); setTimeout(activateIzy, 250); }} />
          <QuickAddBtn label="Nouveau devis vocal" onClick={() => { setAddOpen(false); onNavigate('my-time'); }} />
          <QuickAddBtn label="Discuter avec IZY" onClick={() => { setAddOpen(false); onNavigate('mode-izy'); }} />
          <QuickAddBtn label="Voir mes statistiques" onClick={() => { setAddOpen(false); onNavigate('societe'); }} />
        </div>
        <p className="text-xs px-1 pt-4" style={{ color: 'var(--ink-faint)' }}>
          Bientôt : tarifs, matériaux, clients, mots-clés vocaux.
        </p>
      </Sheet>
    </div>
  );
}

function QuickAddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left py-3 px-4 rounded-2xl text-sm font-medium transition-all"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--line-mid)',
      }}
    >
      {label}
    </button>
  );
}

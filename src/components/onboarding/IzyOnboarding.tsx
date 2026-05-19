import { useEffect, useRef, useState } from 'react';
import { IZYCore } from '@/components/IZYCore';
import { ProgressBar } from './ProgressBar';
import { OnboardingCard } from './OnboardingCard';
import { TRADES, NEEDS, TONES } from '@/data/onboardingData';
import { fetchCompanyBySiret, isValidSiret } from '@/lib/siret';
import { computeModules, MODULE_LABELS } from '@/lib/modules';
import { getMessages } from '@/data/izyMessages';
import { useHaptic } from '@/hooks/useHaptic';
import { ChevronLeft, ChevronRight, Loader2, Check, Search } from 'lucide-react';
import type { CompanyInfo, IzyNeed, IzyTone, Trade, UserProfile } from '@/types';
import type { IzyStateName } from '@/data/izyStates';

type Step = 'intro' | 'trade' | 'needs' | 'tone' | 'company' | 'final';

type Props = {
  baseProfile: { id?: string; email: string; firstName?: string };
  onComplete: (profile: UserProfile) => void;
};

export function IzyOnboarding({ baseProfile, onComplete }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const haptic = useHaptic();

  const [trade, setTrade] = useState<Trade | undefined>();
  const [needs, setNeeds] = useState<IzyNeed[]>([]);
  const [tone, setTone] = useState<IzyTone | undefined>();
  const [siret, setSiret] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState(baseProfile.email || '');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [siretLoading, setSiretLoading] = useState(false);
  const [siretError, setSiretError] = useState<string | null>(null);
  const [bubble, setBubble] = useState<{ key: number; text: string } | null>(null);

  const stepOrder: Step[] = ['trade', 'needs', 'tone', 'company'];
  const stepIndex = stepOrder.indexOf(step as any);
  const totalSteps = stepOrder.length;

  // ====== ÉTAT DE LA SPHÈRE selon l'étape ======
  const sphereState: IzyStateName = (() => {
    if (step === 'final') return 'success';
    if (step === 'company' && siretLoading) return 'thinking';
    if (step === 'company' && company) return 'memory';
    if (step === 'needs' && needs.includes('memoire-chantier')) return 'memory';
    return 'idle';
  })();

  // ====== BULLE IZY (wording court, terrain) ======
  useEffect(() => {
    let text = '';
    if (step === 'trade') text = "C'est quoi ton métier ?";
    else if (step === 'needs') {
      if (needs.includes('memoire-chantier')) text = "Je garde ça dans ta sphère.";
      else if (needs.length > 0) text = "OK, tu peux en cocher d'autres.";
      else text = "Qu'est-ce qui te ferait gagner du temps ?";
    }
    else if (step === 'tone') text = "Je te parle comment ?";
    else if (step === 'company') {
      if (company) text = "Trouvé. Tu confirmes ?";
      else if (siretLoading) text = "Je cherche…";
      else text = "Ton SIRET, je vais chercher.";
    }
    if (text) setBubble({ key: Date.now(), text });
  }, [step, needs, company, siretLoading]);

  const goNext = () => {
    haptic.tap();
    if (step === 'intro') setStep('trade');
    else if (step === 'trade') setStep('needs');
    else if (step === 'needs') setStep('tone');
    else if (step === 'tone') setStep('company');
    else if (step === 'company') finalize();
  };

  const goBack = () => {
    haptic.tap();
    if (step === 'trade') setStep('intro');
    else if (step === 'needs') setStep('trade');
    else if (step === 'tone') setStep('needs');
    else if (step === 'company') setStep('tone');
  };

  const doSiretLookup = async () => {
    setSiretError(null);
    if (!isValidSiret(siret)) {
      setSiretError('Le SIRET fait 14 chiffres.');
      return;
    }
    setSiretLoading(true);
    haptic.activate();
    try {
      const info = await fetchCompanyBySiret(siret);
      if (info) {
        setCompany(info);
        setCompanyName(info.name);
        haptic.success();
      } else {
        setSiretError('Entreprise introuvable.');
      }
    } catch (e) {
      setSiretError('Erreur lors de la recherche.');
    } finally {
      setSiretLoading(false);
    }
  };

  const finalize = () => {
    setStep('final');
  };

  // Construit le profil final à partir de l'état actuel.
  // Stable car ne dépend que des champs de state, mais on évite useCallback inutilement.
  const buildFinalProfile = (): UserProfile => {
    const finalCompany: CompanyInfo = company || {
      name: companyName || 'Mon entreprise',
      siret: siret || undefined,
      phone: companyPhone || undefined,
      email: companyEmail || undefined,
    };
    return {
      id: baseProfile.id || 'local',
      email: baseProfile.email,
      firstName: baseProfile.firstName,
      companyName: finalCompany.name,
      siret: finalCompany.siret,
      phone: finalCompany.phone || companyPhone,
      trade,
      needs,
      izyTone: tone,
      company: {
        ...finalCompany,
        phone: finalCompany.phone || companyPhone,
        email: finalCompany.email || companyEmail,
      },
      modules: computeModules(needs),
      onboardingDone: true,
      createdAt: new Date().toISOString(),
    };
  };

  // Garde anti-double-trigger (le bouton fallback ET le timer auto pourraient se déclencher)
  const completedRef = useRef(false);
  const triggerComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    haptic.success();
    onComplete(buildFinalProfile());
  };

  // Timer auto : déclenche triggerComplete après 3.5s
  useEffect(() => {
    if (step !== 'final') return;
    const t = setTimeout(() => {
      triggerComplete();
    }, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const canGoNext = (() => {
    if (step === 'intro') return true;
    if (step === 'trade') return !!trade;
    if (step === 'needs') return needs.length > 0;
    if (step === 'tone') return !!tone;
    if (step === 'company') return !!companyName.trim() && (!siret || isValidSiret(siret));
    return false;
  })();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header bar */}
      {step !== 'intro' && step !== 'final' && (
        <div className="px-5 pt-6 pb-2 safe-top fade-in">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={goBack}
              className="btn-ghost w-9 h-9 rounded-full flex items-center justify-center"
              aria-label="Retour"
            >
              <ChevronLeft size={18} className="text-white/70" />
            </button>
            <div className="flex-1">
              <ProgressBar current={stepIndex + 1} total={totalSteps} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-5 py-4">
        {step === 'intro' && <IntroStep onStart={goNext} />}

        {step !== 'intro' && step !== 'final' && (
          <div key={step} className="flex-1 flex flex-col fade-up">
            <BubbleIzy text={bubble?.text || ''} reactKey={bubble?.key || 0} />

            <div className="flex-1 mt-6 space-y-2.5 pb-24 overflow-y-auto stagger-children">
              {step === 'trade' && TRADES.map((tr) => (
                <OnboardingCard
                  key={tr.id}
                  selected={trade === tr.id}
                  onClick={() => { haptic.tap(); setTrade(tr.id); }}
                  icon={tr.emoji}
                  label={tr.label}
                  subtitle={tr.subtitle}
                />
              ))}

              {step === 'needs' && NEEDS.map((n) => (
                <OnboardingCard
                  key={n.id}
                  selected={needs.includes(n.id)}
                  onClick={() => {
                    haptic.tap();
                    setNeeds((p) => p.includes(n.id) ? p.filter(x => x !== n.id) : [...p, n.id]);
                  }}
                  label={n.label}
                  subtitle={n.subtitle}
                />
              ))}

              {step === 'tone' && TONES.map((t) => (
                <OnboardingCard
                  key={t.id}
                  selected={tone === t.id}
                  onClick={() => { haptic.tap(); setTone(t.id); }}
                  icon={t.emoji}
                  label={t.label}
                  subtitle={t.desc}
                  example={t.example}
                />
              ))}

              {step === 'company' && (
                <CompanyStep
                  siret={siret}
                  setSiret={setSiret}
                  companyName={companyName}
                  setCompanyName={setCompanyName}
                  companyPhone={companyPhone}
                  setCompanyPhone={setCompanyPhone}
                  companyEmail={companyEmail}
                  setCompanyEmail={setCompanyEmail}
                  company={company}
                  onLookup={doSiretLookup}
                  loading={siretLoading}
                  error={siretError}
                />
              )}
            </div>
          </div>
        )}

        {step === 'final' && (
          <FinalStep
            tone={tone}
            firstName={baseProfile.firstName}
            needs={needs}
            sphereState={sphereState}
            onForceComplete={triggerComplete}
          />
        )}
      </div>

      {/* Footer CTA */}
      {step !== 'intro' && step !== 'final' && (
        <div className="px-5 pb-6 pt-3 safe-bottom"
             style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7) 30%)' }}>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="btn-violet w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 'company' ? 'Continuer' : 'Suivant'}
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// SOUS-COMPOSANTS
// =====================================================================

function IntroStep({ onStart }: { onStart: () => void }) {
  const [phase, setPhase] = useState(0);
  const [pulse, setPulse] = useState(0);
  const haptic = useHaptic();

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleStart = () => {
    haptic.activate();
    // Déclenche un pulse sur la sphère = IZY accompagne l'action
    setPulse(p => p + 1);
    // Petit délai pour laisser le temps au pulse de partir avant la transition
    setTimeout(() => onStart(), 280);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center -mt-10">
      <IZYCore size={200} state="idle" externalPulse={pulse} />
      <h1
        className={`font-display text-3xl mt-14 transition-all duration-1000 ease-out ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ letterSpacing: '-0.02em', maxWidth: 320, lineHeight: 1.15 }}
      >
        Bienvenue dans ton <span className="italic" style={{ color: '#A78BFA' }}>espace terrain</span>.
      </h1>
      <p
        className={`text-[15px] mt-4 max-w-[260px] leading-relaxed transition-all duration-1000 ease-out ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        style={{ color: 'rgba(255,255,255,0.55)' }}
      >
        IZY apprend comment tu bosses.
      </p>
      <button
        onClick={handleStart}
        className={`btn-premium mt-14 px-12 py-4 rounded-2xl font-semibold transition-all duration-1000 ease-out ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
      >
        Commencer
      </button>
    </div>
  );
}

function BubbleIzy({ text, reactKey }: { text: string; reactKey: number }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-3 mt-2 fade-up" key={reactKey}>
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 breathe-soft"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #A78BFA, #6D28D9)',
          boxShadow: '0 0 18px rgba(139,92,246,0.35)',
        }}
      />
      <div
        className="flex-1 rounded-2xl rounded-tl-sm px-4 py-3"
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <p className="font-mono text-[9px] tracking-[0.32em] uppercase mb-1" style={{ color: 'rgba(196,181,253,0.7)' }}>
          IZY
        </p>
        <p className="text-[15px] leading-snug">{text}</p>
      </div>
    </div>
  );
}

function CompanyStep(props: {
  siret: string;
  setSiret: (s: string) => void;
  companyName: string;
  setCompanyName: (s: string) => void;
  companyPhone: string;
  setCompanyPhone: (s: string) => void;
  companyEmail: string;
  setCompanyEmail: (s: string) => void;
  company: CompanyInfo | null;
  onLookup: () => void;
  loading: boolean;
  error: string | null;
}) {
  const { siret, setSiret, companyName, setCompanyName, companyPhone, setCompanyPhone,
    companyEmail, setCompanyEmail, company, onLookup, loading, error } = props;

  const fieldStyle = {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.010))',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)' as const,
  };

  return (
    <div className="space-y-3">
      {/* SIRET */}
      <div className="rounded-2xl p-4" style={fieldStyle}>
        <label className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          SIRET <span style={{ color: 'rgba(196,181,253,0.7)' }}>(optionnel)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={siret}
            onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="14 chiffres"
            className="flex-1 bg-transparent text-base py-2 outline-none font-mono"
            style={{ color: '#FFFFFF', letterSpacing: '0.05em' }}
          />
          <button
            onClick={onLookup}
            disabled={!siret || loading}
            className="px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-40 transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(124,58,237,0.10))',
              border: '1px solid rgba(139,92,246,0.30)',
              color: '#C4B5FD',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <><Search size={14} /> Chercher</>}
          </button>
        </div>
        {error && <p className="text-xs mt-2" style={{ color: '#FF6B6B' }}>{error}</p>}
      </div>

      {/* Carte entreprise trouvée */}
      {company && (
        <div
          className="rounded-2xl p-4 fade-up"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.13), rgba(91,33,182,0.06))',
            border: '1px solid rgba(167,139,250,0.32)',
            boxShadow: '0 0 32px -8px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-start gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center check-pop"
                 style={{ background: '#10B981', boxShadow: '0 0 12px rgba(16,185,129,0.5)' }}>
              <Check size={12} className="text-white" strokeWidth={3} />
            </div>
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase pt-0.5" style={{ color: '#A78BFA' }}>
              Entreprise trouvée
            </p>
          </div>
          <p className="text-lg font-semibold">{company.name}</p>
          {company.address && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>{company.address}</p>}
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {company.legalForm && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }}>
                {company.legalForm}
              </span>
            )}
            {company.apeCode && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.65)' }}>
                APE {company.apeCode}
              </span>
            )}
            {company.active && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(16,185,129,0.13)', color: '#6EE7B7' }}>
                ● Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Nom entreprise */}
      <div className="rounded-2xl p-4" style={fieldStyle}>
        <label className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Nom de l'entreprise
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ex: Façades Moreau"
          className="w-full bg-transparent text-base py-2 outline-none"
        />
      </div>

      {/* Téléphone */}
      <div className="rounded-2xl p-4" style={fieldStyle}>
        <label className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Téléphone pro
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={companyPhone}
          onChange={(e) => setCompanyPhone(e.target.value)}
          placeholder="06 12 34 56 78"
          className="w-full bg-transparent text-base py-2 outline-none"
        />
      </div>

      {/* Email */}
      <div className="rounded-2xl p-4" style={fieldStyle}>
        <label className="font-mono text-[9px] tracking-[0.3em] uppercase block mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Email pro
        </label>
        <input
          type="email"
          inputMode="email"
          value={companyEmail}
          onChange={(e) => setCompanyEmail(e.target.value)}
          placeholder="contact@..."
          className="w-full bg-transparent text-base py-2 outline-none"
        />
      </div>
    </div>
  );
}

function FinalStep({
  tone, firstName, needs, sphereState, onForceComplete,
}: {
  tone?: IzyTone;
  firstName?: string;
  needs: IzyNeed[];
  sphereState: IzyStateName;
  onForceComplete: () => void;
}) {
  const [linesShown, setLinesShown] = useState<number>(0);
  const [showFinal, setShowFinal] = useState(false);
  const [showFallbackBtn, setShowFallbackBtn] = useState(false);
  const [currentSphereState, setCurrentSphereState] = useState<IzyStateName>('thinking');
  const messages = getMessages(tone);
  const modules = computeModules(needs);

  const sequence = [
    'Sphère terrain créée.',
    'Mémoire chantier activée.',
    'Préférences IZY appliquées.',
    'Espace devis prêt.',
  ];

  useEffect(() => {
    const timers: any[] = [];
    sequence.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setLinesShown(i + 1);
        if (i === sequence.length - 1) setCurrentSphereState('success');
        else if (i % 2 === 0) setCurrentSphereState('memory');
        else setCurrentSphereState('thinking');
      }, (i + 1) * 850));
    });
    timers.push(setTimeout(() => setShowFinal(true), sequence.length * 850 + 500));
    // Fallback : bouton visible après 2s pour permettre à l'user de forcer la transition
    // au cas où le timer auto (3.5s) plante pour une raison X
    timers.push(setTimeout(() => setShowFallbackBtn(true), 2000));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center -mt-6">
      <IZYCore size={180} state={currentSphereState} disableInteraction />

      <div className="mt-12 space-y-3 w-full max-w-xs">
        {sequence.map((label, i) => {
          const done = linesShown > i;
          return (
            <div
              key={label}
              className={`flex items-center gap-3 transition-all duration-700 ease-out ${done ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                style={{
                  background: done ? '#10B981' : 'rgba(255,255,255,0.06)',
                  boxShadow: done ? '0 0 12px rgba(16,185,129,0.45)' : 'none',
                }}
              >
                {done && <Check size={12} className="text-white check-pop" strokeWidth={3} />}
              </div>
              <p
                className="text-sm text-left transition-all duration-500"
                style={{ color: done ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.35)' }}
              >
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {showFinal && (
        <div className="mt-12 fade-up-slow max-w-xs">
          <p className="font-display text-xl leading-tight" style={{ letterSpacing: '-0.01em' }}>
            {messages.finalReady}
          </p>
          {modules.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-5">
              {modules.map((m, i) => (
                <span
                  key={m}
                  className="text-[10px] font-mono uppercase tracking-[0.15em] px-2.5 py-1 rounded-full chip-glow"
                  style={{
                    background: 'rgba(139,92,246,0.08)',
                    border: '1px solid rgba(139,92,246,0.22)',
                    color: '#C4B5FD',
                    animationDelay: `${i * 200}ms`,
                  }}
                >
                  {MODULE_LABELS[m].title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* signature subtile pour faire patienter */}
      {firstName && (
        <p className="mt-8 text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {firstName}
        </p>
      )}

      {/* Bouton fallback — visible après 2s, permet de forcer la transition manuellement
          si le timer auto a un souci */}
      {showFallbackBtn && (
        <button
          onClick={onForceComplete}
          className="btn-premium mt-10 px-10 py-3.5 rounded-2xl font-semibold fade-up"
        >
          Entrer dans IZY
        </button>
      )}
    </div>
  );
}

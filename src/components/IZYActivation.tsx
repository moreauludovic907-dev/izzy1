import { useEffect, useRef, useState } from 'react';
import { IZYCore } from './IZYCore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useHaptic } from '@/hooks/useHaptic';
import { routeIntent } from '@/lib/intent';
import type { ModeName } from '@/types';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onRoute: (mode: ModeName, transcript: string) => void;
};

type State = 'opening' | 'listening' | 'thinking' | 'routing' | 'silent';

/**
 * Overlay immersif d'activation IZY.
 *
 * Comportements :
 * - TAP COURT : auto-listen pendant 6s ou jusqu'au silence, puis route
 * - MAINTIEN DOIGT : écoute tant que la pression est là, lâcher = stop + route
 * - SWIPE / CLOSE : annule, retour à l'accueil sans rien faire
 *
 * Ne navigue PAS brutalement vers un autre écran : l'utilisateur reste
 * dans le même univers visuel. La transition vers un mode se fait seulement
 * APRÈS qu'IZY ait compris l'intention.
 */
export function IZYActivation({ open, onClose, onRoute }: Props) {
  const speech = useSpeechRecognition('fr-FR');
  const haptic = useHaptic();
  const [state, setState] = useState<State>('opening');
  const [isHolding, setIsHolding] = useState(false);
  const silenceTimerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  // Open : démarre la séquence d'activation
  useEffect(() => {
    if (!open) return;
    haptic.activate();
    setState('opening');
    startedRef.current = false;

    // Petite séquence : 600ms d'opening, puis on commence à écouter
    const tOpen = window.setTimeout(() => {
      setState('listening');
      speech.start();
      startedRef.current = true;

      // Auto-stop après 6 secondes max (sécurité si l'user dit rien)
      autoStopRef.current = window.setTimeout(() => {
        if (!isHolding) finalize();
      }, 6000);
    }, 600);

    return () => {
      clearTimeout(tOpen);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Détection de silence (auto-finalize après 1.5s de silence si pas en maintien)
  useEffect(() => {
    if (state !== 'listening' || isHolding) return;
    if (!speech.transcript && !speech.interim) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      finalize();
    }, 1500);

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript, speech.interim, state, isHolding]);

  const finalize = async () => {
    if (state === 'thinking' || state === 'routing') return;
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    const text = (speech.transcript + ' ' + speech.interim).trim();
    speech.stop();

    if (!text) {
      // Rien dit → on ferme proprement
      onClose();
      return;
    }

    setState('thinking');
    haptic.tap();

    try {
      const intent = await routeIntent(text);
      setState('routing');
      // petit délai pour l'animation de sortie
      await new Promise((r) => setTimeout(r, 350));
      haptic.success();
      onRoute(intent.mode, text);
    } catch (e) {
      console.error(e);
      onRoute('my-time', text); // fallback
    }
  };

  // Maintien doigt : écoute continue
  const handlePointerDown = () => {
    if (state !== 'listening') return;
    setIsHolding(true);
    haptic.hold();
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const handlePointerUp = () => {
    if (!isHolding) return;
    setIsHolding(false);
    haptic.tap();
    finalize();
  };

  if (!open) return null;

  const liveText = (speech.transcript + ' ' + speech.interim).trim();

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(15, 8, 32, 0.96) 0%, rgba(0, 0, 0, 0.98) 70%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        animation: 'izyOpen 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => { speech.stop(); onClose(); }}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
        aria-label="Fermer"
      >
        <X size={18} className="text-white/70" />
      </button>

      {/* Status */}
      <p
        className="font-mono text-[10px] tracking-[0.4em] uppercase mb-6 transition-colors duration-500"
        style={{
          color: state === 'thinking' || state === 'routing'
            ? '#C4B5FD'
            : state === 'listening'
              ? 'rgba(196, 181, 253, 0.85)'
              : 'rgba(255,255,255,0.4)',
        }}
      >
        {state === 'opening' && '· · ·'}
        {state === 'listening' && (isHolding ? '◉ MAINTIEN ACTIF' : '● IZY ÉCOUTE')}
        {state === 'thinking' && '⚡ IZY ANALYSE'}
        {state === 'routing' && '→ EN ROUTE'}
      </p>

      {/* Title — fond + tagline */}
      <h1
        className="font-display text-3xl text-center mb-3"
        style={{ letterSpacing: '-0.02em', maxWidth: 420 }}
      >
        {state === 'opening' && <>Je m'<span className="italic" style={{ color: '#A78BFA' }}>active</span>…</>}
        {state === 'listening' && !liveText && <>Je t'écoute <span className="italic" style={{ color: '#A78BFA' }}>chef</span>.</>}
        {state === 'listening' && liveText && <span className="text-white/95">{liveText}</span>}
        {state === 'thinking' && <>Une <span className="italic" style={{ color: '#A78BFA' }}>seconde</span>…</>}
        {state === 'routing' && <>C'est <span className="italic" style={{ color: '#A78BFA' }}>parti</span>.</>}
      </h1>

      {/* Sublabel d'aide */}
      {state === 'listening' && !liveText && !isHolding && (
        <p className="text-xs text-center mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Parle naturellement · ou maintiens le noyau pour continuer
        </p>
      )}
      {state === 'listening' && isHolding && (
        <p className="text-xs text-center mb-8" style={{ color: 'rgba(196,181,253,0.7)' }}>
          Lâche le noyau quand tu as fini
        </p>
      )}

      {/* Le noyau */}
      <div
        className="relative"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <IZYCore
          size={260}
          active={state === 'listening' || state === 'thinking'}
          volume={speech.volume}
          disableInteraction
        />
      </div>

      {/* Footer hint */}
      {(state === 'listening' || state === 'opening') && !liveText && (
        <p className="absolute bottom-10 text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>
          Touche pour parler · Tiens pour mode continu
        </p>
      )}

      <style>{`
        @keyframes izyOpen {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

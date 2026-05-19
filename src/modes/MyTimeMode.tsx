import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { IZYCore } from '@/components/IZYCore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { parseDictationToQuote } from '@/lib/ai';
import { newQuoteNumber, uid, finalizeQuote, fmtEUR } from '@/lib/quote';
import { saveQuote, listQuotes } from '@/lib/db';
import type { ModeName, Quote } from '@/types';
import { FileText, Check, RotateCcw } from 'lucide-react';

type Props = {
  onNavigate: (m: ModeName, data?: any) => void;
  initialTranscript?: string; // si l'user vient du noyau, on pré-remplit
};

export function MyTimeMode({ onNavigate, initialTranscript }: Props) {
  const speech = useSpeechRecognition('fr-FR');
  const [processing, setProcessing] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [autoText, setAutoText] = useState<string | null>(null);

  useEffect(() => {
    listQuotes().then(setQuotes);
  }, []);

  // Si on vient du noyau avec déjà du texte, on auto-traite
  useEffect(() => {
    if (initialTranscript && initialTranscript.trim().length > 0) {
      setAutoText(initialTranscript);
      handleValidateWith(initialTranscript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTranscript]);

  const liveText = (speech.transcript + ' ' + speech.interim).trim();
  const displayText = autoText || liveText;
  const listening = speech.state === 'listening';

  const handleValidateWith = async (text: string) => {
    if (!text) return;
    speech.stop();
    setProcessing(true);
    try {
      const parsed = await parseDictationToQuote(text);
      const now = new Date().toISOString();
      const q = finalizeQuote({
        id: uid(),
        number: newQuoteNumber(),
        clientName: parsed.clientName || 'Nouveau client',
        lines: parsed.lines,
        notes: parsed.notes || undefined,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });
      await saveQuote(q);
      onNavigate('quote-detail', q.id);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la création du devis.');
    } finally {
      setProcessing(false);
    }
  };

  const handleValidate = () => handleValidateWith(liveText);

  return (
    <div className="min-h-screen flex flex-col relative">
      <TopBar onBack={() => onNavigate('home')} title="MY TIME" />

      <div className="flex-1 flex flex-col items-center justify-center px-5 -mt-4">
        <p
          className="font-mono text-[10px] tracking-[0.4em] uppercase mb-2"
          style={{
            color: listening ? '#C4B5FD' : 'var(--ink-faint)',
          }}
        >
          {speech.state === 'unsupported'
            ? '✕ DICTÉE NON SUPPORTÉE'
            : listening
            ? '● EN ÉCOUTE'
            : processing
            ? '⚡ ANALYSE'
            : 'PRÊT'}
        </p>

        {!displayText && !processing && (
          <h1 className="font-display text-3xl mb-8 text-center" style={{ letterSpacing: '-0.02em' }}>
            Parle, <span className="italic" style={{ color: '#A78BFA' }}>je rédige</span>.
          </h1>
        )}

        {displayText && (
          <div
            className="w-full max-w-md mb-8 rounded-3xl p-5"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              border: '1px solid var(--line-mid)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <p
              className="font-mono text-[9px] tracking-[0.2em] uppercase mb-2"
              style={{ color: 'var(--ink-faint)' }}
            >
              Ta dictée
            </p>
            <p className="font-display text-lg leading-relaxed">
              {speech.transcript || autoText}
              <span style={{ color: 'var(--ink-faint)' }}>
                {speech.interim ? ' ' + speech.interim : ''}
              </span>
            </p>
          </div>
        )}

        <IZYCore
          size={220}
          active={listening || processing}
          volume={speech.volume}
          onClick={() => {
            if (processing) return;
            if (listening) speech.stop();
            else speech.start();
          }}
        />

        {!displayText && !listening && !processing && (
          <p className="mt-8 text-xs text-center max-w-xs" style={{ color: 'var(--ink-dim)' }}>
            Touche le noyau et dis : "Pose PAC Daikin, 8h main d'œuvre, TVA 10%"
          </p>
        )}

        {speech.state === 'unsupported' && (
          <div className="mt-6 rounded-2xl p-4 max-w-md text-sm" style={{ color: 'var(--ink-dim)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}>
            Ce navigateur ne supporte pas la dictée. Ouvre IZY sur Chrome (Android) ou Safari (iOS).
          </div>
        )}
      </div>

      <div className="safe-bottom px-5 pb-6 pt-2">
        {liveText && !listening && !processing && !autoText && (
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => { speech.reset(); }}
              className="flex-1 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line-mid)' }}
            >
              <RotateCcw size={16} />
              Effacer
            </button>
            <button
              onClick={handleValidate}
              className="btn-violet flex-1 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Créer devis
            </button>
          </div>
        )}

        {quotes.length > 0 && !displayText && !listening && (
          <div className="mt-4">
            <p
              className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2 px-1"
              style={{ color: 'var(--ink-faint)' }}
            >
              Devis récents
            </p>
            <div className="space-y-2">
              {quotes.slice(0, 3).map((q) => (
                <button
                  key={q.id}
                  onClick={() => onNavigate('quote-detail', q.id)}
                  className="w-full rounded-2xl p-3 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <FileText size={14} style={{ color: '#C4B5FD' }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{q.clientName}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
                      {q.number}
                    </p>
                  </div>
                  <p className="font-display text-base" style={{ color: '#A78BFA' }}>{fmtEUR(q.totalTTC)}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

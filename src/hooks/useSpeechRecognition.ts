import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechState = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

/**
 * Hook de dictée vocale + audio level meter.
 *
 * Robustesse v3 :
 * - SpeechRecognition lance toujours (priorité absolue à la transcription)
 * - AudioContext/volume meter est OPTIONNEL : si ça échoue, la dictée marche quand même
 * - Le AudioContext utilise un stream séparé, mais on tolère son échec silencieux
 * - Détection de non-support : sortie immédiate avec état clair
 * - Pas de race condition : l'ordre démarrage est strict
 */
export function useSpeechRecognition(lang = 'fr-FR') {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [volume, setVolume] = useState(0);

  const recRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const supportedRef = useRef(false);

  // Init Web Speech API (sans démarrer)
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setState('unsupported');
      supportedRef.current = false;
      return;
    }
    supportedRef.current = true;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let final = '';
      let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + ' ';
        else inter += t;
      }
      if (final) setTranscript((p) => (p + ' ' + final).trim());
      setInterim(inter);
    };

    rec.onerror = (e: any) => {
      console.warn('SpeechRecognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setState('denied');
      } else if (e.error === 'no-speech' || e.error === 'aborted') {
        // pas d'erreur fatale → on reste en listening, l'utilisateur peut continuer
      } else {
        setState('error');
      }
    };

    rec.onend = () => {
      // Si l'utilisateur veut encore écouter (state = 'listening') et que ça se coupe
      // tout seul (Web Speech le fait au bout d'un moment sur Chrome), on relance.
      setState((s) => {
        if (s === 'listening') {
          try {
            rec.start();
            return 'listening';
          } catch {
            return 'idle';
          }
        }
        return s;
      });
      setInterim('');
    };

    recRef.current = rec;

    return () => {
      try { rec.stop(); } catch {}
    };
  }, [lang]);

  // Volume meter (optionnel, ne bloque jamais la dictée)
  const startAudioMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        // Compression douce : faible bruit ignoré, parole amplifiée
        const v = Math.max(0, Math.min(1, (avg - 0.04) * 3.5));
        setVolume(v);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      console.warn('Audio meter unavailable (non-blocking):', e);
      // Pas grave : la dictée marche quand même, juste pas d'animation voix
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
    setVolume(0);
  }, []);

  const start = useCallback(() => {
    if (!supportedRef.current || !recRef.current) {
      setState('unsupported');
      return;
    }
    setTranscript('');
    setInterim('');
    setState('listening');
    try {
      recRef.current.start();
    } catch (e) {
      // Déjà en cours → on ignore
      console.warn('SR start warn (probably already running):', e);
    }
    // On démarre le meter en différé pour pas créer de conflit micro
    setTimeout(() => {
      startAudioMeter();
    }, 250);
  }, [startAudioMeter]);

  const stop = useCallback(() => {
    setState('idle');
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }
    stopAudioMeter();
  }, [stopAudioMeter]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return { state, transcript, interim, volume, start, stop, reset };
}

import { useEffect, useRef } from 'react';
import { izyStates, izyHues, type IzyStateName } from '@/data/izyStates';
import { useHaptic } from '@/hooks/useHaptic';

type Props = {
  size?: number;
  state?: IzyStateName;
  /** Compat ancien : active=true = state "listening" */
  active?: boolean;
  /** Volume voix 0..1, anime le halo en listening */
  volume?: number;
  onClick?: () => void;
  /** Trigger externe d'impulsion (ex: bouton Commencer touché) */
  externalPulse?: number;
  /** Désactive les handlers internes (utile si le parent gère déjà les pointer events) */
  disableInteraction?: boolean;
  label?: string;
};

/**
 * IZY Core v6 — noyau IA vivant + interaction premium.
 *
 * Interactions :
 * - TAP COURT  : impulsion lumineuse + haptic léger + pulse silencieuse + retour hypnotique
 * - MAINTIEN   : glow monte progressivement, anneaux accélèrent, plasma s'intensifie
 *                → relâche : retour calme exponentiel
 * - PULSE EXT  : un autre composant peut déclencher une réaction via externalPulse (= compteur)
 *
 * Aucune popup, aucun texte. Silence visuel total.
 */
export function IZYCore({
  size = 240, state, active, volume = 0, onClick, externalPulse = 0, disableInteraction = false, label,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const tRef = useRef(Math.random() * 100);
  const particlesRef = useRef<Particle[]>([]);
  const ringSegmentsRef = useRef<RingSegment[]>([]);
  const volSmoothedRef = useRef(0);
  const volTargetRef = useRef(0);
  const hotSpotRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Pulses (tap court ou externalPulse) : array pour permettre plusieurs en parallèle
  const pulsesRef = useRef<Pulse[]>([]);
  // Hold (smoothed)
  const holdSmoothedRef = useRef(0);
  const holdTargetRef = useRef(0);

  const haptic = useHaptic();

  const stateBlendRef = useRef<{ current: IzyStateName; target: IzyStateName; t: number }>({
    current: 'idle', target: 'idle', t: 1,
  });

  const effectiveState: IzyStateName = state || (active ? 'listening' : 'idle');

  useEffect(() => {
    const sb = stateBlendRef.current;
    if (sb.target !== effectiveState) {
      sb.current = sb.target;
      sb.target = effectiveState;
      sb.t = 0;
    }
  }, [effectiveState]);

  useEffect(() => {
    volTargetRef.current = volume;
  }, [volume]);

  // Trigger pulse externe
  useEffect(() => {
    if (externalPulse > 0) {
      pulsesRef.current.push({ start: tRef.current, kind: 'ext' });
    }
  }, [externalPulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // === Init particules ===
    if (particlesRef.current.length === 0) {
      const N = 14;
      for (let i = 0; i < N; i++) {
        const phase = (i / N) * Math.PI * 2;
        particlesRef.current.push({
          angle: phase,
          radius: 68 + Math.random() * 34,
          speed: 0.0006 + Math.random() * 0.0012,
          size: 0.4 + Math.random() * 1.1,
          opacity: 0.18 + Math.random() * 0.38,
          orbit: Math.random() > 0.5 ? 1 : -1,
          phase: Math.random() * Math.PI * 2,
          depth: Math.random(),
        });
      }
    }

    // === Init segments HUD ===
    if (ringSegmentsRef.current.length === 0) {
      const rings = [
        { ringIdx: 0, segCount: 5, tickCount: 12 },
        { ringIdx: 1, segCount: 3, tickCount: 16 },
        { ringIdx: 2, segCount: 7, tickCount: 8 },
      ];
      for (const r of rings) {
        for (let i = 0; i < r.segCount; i++) {
          ringSegmentsRef.current.push({
            type: 'segment',
            ringIdx: r.ringIdx,
            startAngle: (i / r.segCount) * Math.PI * 2 + Math.random() * 0.3,
            arc: 0.25 + Math.random() * 0.35,
            speed: 0.0008 * (r.ringIdx % 2 === 0 ? 1 : -1) * (0.6 + Math.random() * 0.5),
            opacity: 0.25 + Math.random() * 0.35,
          });
        }
        for (let i = 0; i < r.tickCount; i++) {
          ringSegmentsRef.current.push({
            type: 'tick',
            ringIdx: r.ringIdx,
            startAngle: (i / r.tickCount) * Math.PI * 2,
            arc: 0,
            speed: 0.0003 * (r.ringIdx % 2 === 0 ? 1 : -1),
            opacity: 0.15 + Math.random() * 0.20,
          });
        }
        const dotCount = r.ringIdx === 1 ? 2 : 1;
        for (let i = 0; i < dotCount; i++) {
          ringSegmentsRef.current.push({
            type: 'dot',
            ringIdx: r.ringIdx,
            startAngle: Math.random() * Math.PI * 2,
            arc: 0,
            speed: 0.0015 * (i % 2 === 0 ? 1 : -1) * (0.7 + Math.random() * 0.4),
            opacity: 0.55,
          });
        }
      }
    }

    const cx = size / 2;
    const cy = size / 2;

    const render = () => {
      tRef.current += 0.01;
      const t = tRef.current;

      // ===== INTERPOLATION D'ÉTAT =====
      const sb = stateBlendRef.current;
      sb.t = Math.min(1, sb.t + 0.025);
      const ease = easeInOut(sb.t);
      const curr = izyStates[sb.current];
      const targ = izyStates[sb.target];
      const breathSpeed = lerp(curr.breathSpeed, targ.breathSpeed, ease);
      const breathAmount = lerp(curr.breathAmount, targ.breathAmount, ease);
      const glowIntensity = lerp(curr.glowIntensity, targ.glowIntensity, ease);
      const particleSpeed = lerp(curr.particleSpeed, targ.particleSpeed, ease);
      const particleOpacity = lerp(curr.particleOpacity, targ.particleOpacity, ease);
      const ringTension = lerp(curr.ringTension, targ.ringTension, ease);
      const coreScale = lerp(curr.coreScale, targ.coreScale, ease);
      const showRings = targ.showRings;
      const showWaves = targ.showWaves;
      const pulseSync = targ.pulseSync;
      const hue = izyHues[targ.hue];

      // ===== VOLUME smoothed =====
      volSmoothedRef.current += (volTargetRef.current - volSmoothedRef.current) * 0.10;
      const vol = volSmoothedRef.current;

      // ===== HOLD smoothed (très important pour l'effet hypnotique) =====
      // Quand l'utilisateur maintient le doigt, holdTarget = 1.
      // Quand il relâche, target = 0. Smoothing exponentiel = montée/descente hypnotique.
      const holdRiseRate = 0.025;   // montée plus rapide
      const holdFallRate = 0.012;   // descente plus lente (= hypnotique)
      const target = holdTargetRef.current;
      const rate = target > holdSmoothedRef.current ? holdRiseRate : holdFallRate;
      holdSmoothedRef.current += (target - holdSmoothedRef.current) * rate;
      const hold = holdSmoothedRef.current; // 0..1

      // ===== RESPIRATION =====
      const breath1 = Math.sin(t * breathSpeed * 1.0) * 0.5 + 0.5;
      const breath2 = Math.sin(t * breathSpeed * 2.3 + 0.7) * 0.3 + 0.3;
      const breath = 1 + (breath1 * breathAmount * 1.2 + breath2 * breathAmount * 0.4);

      let beat = 1;
      if (pulseSync) {
        const beatA = Math.sin(t * 2.0) * 0.5 + 0.5;
        const beatB = Math.sin(t * 2.0 + 0.4) * 0.3 + 0.3;
        beat = 1 + (beatA * 0.035 + beatB * 0.018);
      }

      // ===== PULSES (tap + external) — gestion d'un array =====
      // Chaque pulse vit 1.4s puis disparaît.
      let pulseBoost = 0;
      let pulseWaves: { r: number; alpha: number; thickness: number }[] = [];
      pulsesRef.current = pulsesRef.current.filter(p => {
        const elapsed = t - p.start;
        if (elapsed > 1.4) return false;
        // Easing : exponentiel décroissant pour le boost
        const boost = Math.exp(-elapsed * 2.2) * (p.kind === 'ext' ? 0.4 : 0.6);
        pulseBoost += boost;
        // Onde qui s'éloigne
        const waveR = size * 0.22 + elapsed * size * 0.30;
        const waveAlpha = Math.max(0, 0.45 * (1 - elapsed / 1.4));
        pulseWaves.push({ r: waveR, alpha: waveAlpha, thickness: 1.2 });
        return true;
      });

      // ===== ENERGY TOTALE (mélange état + hold + pulse) =====
      // Le hold ajoute jusqu'à +0.5 en énergie, façon "montée hypnotique"
      const holdBoost = hold * 0.5;
      const energy = (glowIntensity + pulseBoost + holdBoost) * (1 + vol * 0.5);

      ctx.clearRect(0, 0, size, size);

      // ===========================================================
      // 1) HALO ATMOSPHÉRIQUE (avec touches magenta/bleu discrètes)
      // ===========================================================
      const haloR = size * 0.56 * breath * (1 + vol * 0.10 + pulseBoost * 0.2 + hold * 0.08);
      const halo = ctx.createRadialGradient(cx, cy, size * 0.10, cx, cy, haloR);
      halo.addColorStop(0, `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, ${0.18 * energy})`);
      halo.addColorStop(0.28, `rgba(180, 100, 220, ${0.07 * energy})`);
      halo.addColorStop(0.55, `rgba(${hue.deep[0]}, ${hue.deep[1]}, ${hue.deep[2]}, ${0.06 * energy})`);
      halo.addColorStop(0.80, `rgba(80, 60, 180, ${0.025 * energy})`);
      halo.addColorStop(1, `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fill();

      // ===========================================================
      // 2) ONDES PULSES (rebonds silencieux au clic / external pulse)
      // ===========================================================
      for (const w of pulseWaves) {
        ctx.beginPath();
        ctx.arc(cx, cy, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${w.alpha})`;
        ctx.lineWidth = w.thickness;
        ctx.stroke();
      }

      // ===========================================================
      // 3) ANNEAUX HUD (segments + ticks + points)
      // ===========================================================
      if (showRings) {
        const ringRadii = [size * 0.30, size * 0.36, size * 0.43];
        const tickInner = 3;
        const tickOuter = 5;
        // Hold accélère les segments aussi → "anneaux plus précis et actifs"
        const speedMul = 1 + ringTension * 1.5 + pulseBoost * 2 + hold * 1.2;

        for (const seg of ringSegmentsRef.current) {
          seg.startAngle += seg.speed * speedMul;
          const r = ringRadii[seg.ringIdx] * breath;

          if (seg.type === 'segment') {
            ctx.beginPath();
            ctx.arc(cx, cy, r, seg.startAngle, seg.startAngle + seg.arc);
            const opacityBoost = 1 + hold * 0.4 + pulseBoost * 0.6;
            ctx.strokeStyle = `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, ${seg.opacity * (0.6 + ringTension) * opacityBoost})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          } else if (seg.type === 'tick') {
            const innerR = r - tickInner;
            const outerR = r + tickOuter;
            const px1 = cx + Math.cos(seg.startAngle) * innerR;
            const py1 = cy + Math.sin(seg.startAngle) * innerR;
            const px2 = cx + Math.cos(seg.startAngle) * outerR;
            const py2 = cy + Math.sin(seg.startAngle) * outerR;
            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
            ctx.strokeStyle = `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, ${seg.opacity * (1 + hold * 0.5)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          } else if (seg.type === 'dot') {
            const px = cx + Math.cos(seg.startAngle) * r;
            const py = cy + Math.sin(seg.startAngle) * r;
            const dotR = 4 * (1 + hold * 0.4);
            const dotHalo = ctx.createRadialGradient(px, py, 0, px, py, dotR);
            dotHalo.addColorStop(0, `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${seg.opacity * (1 + hold * 0.4)})`);
            dotHalo.addColorStop(1, `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, 0)`);
            ctx.fillStyle = dotHalo;
            ctx.beginPath();
            ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, 1.0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${seg.opacity * 1.1})`;
            ctx.fill();
          }
        }
      }

      // ===========================================================
      // 4) ONDES VOIX (uniquement en listening)
      // ===========================================================
      if (showWaves && vol > 0.015) {
        const waveCount = 2;
        for (let w = 0; w < waveCount; w++) {
          const wt = ((t * 0.35) + w * 0.7) % 1.4;
          const wr = size * 0.21 + wt * (size * 0.22);
          const fade = 1 - wt / 1.4;
          const alpha = fade * vol * 0.55;
          ctx.beginPath();
          ctx.arc(cx, cy, wr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${alpha})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }
      }

      // ===========================================================
      // 5) PARTICULES (légère réaction au hold/pulse)
      // ===========================================================
      for (const p of particlesRef.current) {
        p.angle += p.speed * p.orbit * particleSpeed * (1 + vol * 0.6 + pulseBoost + hold * 0.8);
        const rOsc = Math.sin(t * 0.7 + p.phase) * 4;
        const radius = (p.radius + rOsc) * breath;
        const px = cx + Math.cos(p.angle) * radius;
        const py = cy + Math.sin(p.angle) * radius;
        const depthScale = 0.7 + p.depth * 0.5;
        const pSize = p.size * depthScale * (1 + hold * 0.25);
        const pAlpha = p.opacity * depthScale * particleOpacity * (0.5 + Math.sin(t * 0.9 + p.phase) * 0.35) * (1 + hold * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${pAlpha})`;
        ctx.fill();
      }

      // ===========================================================
      // 6) NOYAU CENTRAL avec PLASMA INTERNE
      // ===========================================================
      const coreR = size * 0.17 * breath * beat * coreScale * (1 + vol * 0.15 + pulseBoost * 0.15 + hold * 0.06);

      const targetHotX = -coreR * 0.30 + Math.sin(t * 0.30) * coreR * 0.06;
      const targetHotY = -coreR * 0.34 + Math.cos(t * 0.40) * coreR * 0.05;
      hotSpotRef.current.vx += (targetHotX - hotSpotRef.current.x) * 0.035;
      hotSpotRef.current.vy += (targetHotY - hotSpotRef.current.y) * 0.035;
      hotSpotRef.current.vx *= 0.90;
      hotSpotRef.current.vy *= 0.90;
      hotSpotRef.current.x += hotSpotRef.current.vx;
      hotSpotRef.current.y += hotSpotRef.current.vy;
      const hotX = cx + hotSpotRef.current.x;
      const hotY = cy + hotSpotRef.current.y;

      // Couche A : ombre interne
      const shadowOff = coreR * 0.55;
      const shadowGrad = ctx.createRadialGradient(
        cx + shadowOff * 0.3, cy + shadowOff * 0.3, 0,
        cx + shadowOff * 0.15, cy + shadowOff * 0.15, coreR * 1.4
      );
      shadowGrad.addColorStop(0, 'rgba(30, 12, 60, 0.40)');
      shadowGrad.addColorStop(0.5, 'rgba(30, 12, 60, 0.15)');
      shadowGrad.addColorStop(1, 'rgba(30, 12, 60, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Couche B : corps principal
      const coreGrad = ctx.createRadialGradient(hotX, hotY, 0, cx, cy, coreR);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      coreGrad.addColorStop(0.18, 'rgba(237, 233, 254, 0.92)');
      coreGrad.addColorStop(0.45, `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, 0.92)`);
      coreGrad.addColorStop(0.75, `rgba(${hue.deep[0]}, ${hue.deep[1]}, ${hue.deep[2]}, 0.90)`);
      coreGrad.addColorStop(1, `rgba(${hue.deep[0] * 0.5}, ${hue.deep[1] * 0.3}, ${hue.deep[2] * 0.6}, 0.75)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Couche B.5 : PLASMA INTERNE (s'intensifie avec hold)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 0.95, 0, Math.PI * 2);
      ctx.clip();

      const plasmaIntensity = 0.18 + pulseBoost * 0.3 + vol * 0.15 + hold * 0.35;
      const plasmaSpeed = 1 + hold * 0.6; // plus actif quand on maintient
      const blobs = [
        {
          x: cx + Math.sin(t * 0.35 * plasmaSpeed) * coreR * 0.25 + Math.cos(t * 0.21 * plasmaSpeed) * coreR * 0.15,
          y: cy + Math.cos(t * 0.42 * plasmaSpeed) * coreR * 0.20 + Math.sin(t * 0.18 * plasmaSpeed) * coreR * 0.18,
          r: coreR * (0.55 + Math.sin(t * 0.5 * plasmaSpeed) * 0.15),
          color: `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${plasmaIntensity})`,
        },
        {
          x: cx + Math.cos(t * 0.28 * plasmaSpeed + 1.5) * coreR * 0.22 + Math.sin(t * 0.16 * plasmaSpeed) * coreR * 0.12,
          y: cy + Math.sin(t * 0.31 * plasmaSpeed + 1.5) * coreR * 0.24 + Math.cos(t * 0.22 * plasmaSpeed) * coreR * 0.10,
          r: coreR * (0.45 + Math.cos(t * 0.6 * plasmaSpeed) * 0.12),
          color: `rgba(210, 150, 235, ${plasmaIntensity * 0.7})`,
        },
      ];
      for (const b of blobs) {
        const blobGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        blobGrad.addColorStop(0, b.color);
        blobGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = blobGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Couche C : ombre opposée
      const oppX = cx - hotSpotRef.current.x * 0.6;
      const oppY = cy - hotSpotRef.current.y * 0.6;
      const innerShadow = ctx.createRadialGradient(oppX, oppY, 0, oppX, oppY, coreR * 0.95);
      innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      innerShadow.addColorStop(0.7, 'rgba(30, 8, 70, 0)');
      innerShadow.addColorStop(1, 'rgba(30, 8, 70, 0.30)');
      ctx.fillStyle = innerShadow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Couche D : inner rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.clip();
      const rimGrad = ctx.createRadialGradient(cx, cy, coreR * 0.83, cx, cy, coreR);
      rimGrad.addColorStop(0, `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, 0)`);
      rimGrad.addColorStop(0.85, `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, 0)`);
      rimGrad.addColorStop(0.96, `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${0.28 + hold * 0.25})`);
      rimGrad.addColorStop(1, `rgba(255, 255, 255, ${0.45 + hold * 0.25})`);
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Couche E : hot spot
      const hsR = coreR * 0.40;
      const hs = ctx.createRadialGradient(hotX, hotY, 0, hotX, hotY, hsR);
      hs.addColorStop(0, `rgba(255, 255, 255, ${0.85 + hold * 0.10})`);
      hs.addColorStop(0.45, 'rgba(255, 255, 255, 0.20)');
      hs.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hs;
      ctx.beginPath();
      ctx.arc(hotX, hotY, hsR, 0, Math.PI * 2);
      ctx.fill();

      // Couche F : reflet secondaire
      const hs2R = coreR * 0.15;
      const hs2X = hotX + coreR * 0.20;
      const hs2Y = hotY + coreR * 0.12;
      const hs2 = ctx.createRadialGradient(hs2X, hs2Y, 0, hs2X, hs2Y, hs2R);
      hs2.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      hs2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = hs2;
      ctx.beginPath();
      ctx.arc(hs2X, hs2Y, hs2R, 0, Math.PI * 2);
      ctx.fill();

      // ===========================================================
      // 7) CONTOUR ÉNERGÉTIQUE (réactif au hold + pulse)
      // ===========================================================
      const contourR = coreR * 1.08;
      const contourSteps = 64;
      ctx.beginPath();
      for (let i = 0; i <= contourSteps; i++) {
        const a = (i / contourSteps) * Math.PI * 2;
        // perturbation plus marquée quand hold
        const ampMul = 1 + hold * 0.5;
        const perturb = (Math.sin(a * 4 + t * 0.5) * 1.2 + Math.cos(a * 7 - t * 0.3) * 0.7) * ampMul;
        const r = contourR + perturb;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      const contourAlpha = 0.12 + pulseBoost * 0.25 + vol * 0.10 + ringTension * 0.08 + hold * 0.25;
      ctx.strokeStyle = `rgba(${hue.rim[0]}, ${hue.rim[1]}, ${hue.rim[2]}, ${contourAlpha})`;
      ctx.lineWidth = 0.5 + hold * 0.5;
      ctx.stroke();

      // ===========================================================
      // 8) GLOW SERRÉ (boost par hold)
      // ===========================================================
      const innerHaloR = coreR * 1.7;
      const innerHalo = ctx.createRadialGradient(cx, cy, coreR * 0.95, cx, cy, innerHaloR);
      innerHalo.addColorStop(0, `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, ${(0.16 + pulseBoost * 0.4 + hold * 0.30) * energy})`);
      innerHalo.addColorStop(1, `rgba(${hue.aura[0]}, ${hue.aura[1]}, ${hue.aura[2]}, 0)`);
      ctx.fillStyle = innerHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, innerHaloR, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [size]);

  // ============= INTERACTIONS =============

  const handlePointerDown = () => {
    holdTargetRef.current = 1;
    haptic.tap();
  };

  const handlePointerUp = () => {
    // Si c'était un tap court (hold < 0.15) on déclenche un pulse silencieux
    // Sinon (long hold) on laisse juste le glow redescendre paisiblement
    if (holdSmoothedRef.current < 0.45) {
      pulsesRef.current.push({ start: tRef.current, kind: 'tap' });
      haptic.activate();
      onClick?.();
    } else {
      // Long hold → on déclenche onClick aussi (= équivalent activation)
      haptic.activate();
      onClick?.();
    }
    holdTargetRef.current = 0;
  };

  const handlePointerCancel = () => {
    holdTargetRef.current = 0;
  };

  return (
    <button
      onPointerDown={disableInteraction ? undefined : handlePointerDown}
      onPointerUp={disableInteraction ? undefined : handlePointerUp}
      onPointerLeave={disableInteraction ? undefined : handlePointerCancel}
      onPointerCancel={disableInteraction ? undefined : handlePointerCancel}
      className="relative inline-flex items-center justify-center select-none focus:outline-none active:scale-[0.985] transition-transform duration-700"
      style={{
        width: size, height: size, willChange: 'transform',
        touchAction: 'manipulation',
        pointerEvents: disableInteraction ? 'none' : 'auto',
      }}
      aria-label={label || 'IZY'}
    >
      <canvas ref={canvasRef} className="block" />
      {label && (
        <span
          className="absolute -bottom-9 text-[10px] font-mono tracking-[0.4em] uppercase whitespace-nowrap"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {label}
        </span>
      )}
    </button>
  );
}

type Particle = {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  orbit: 1 | -1;
  phase: number;
  depth: number;
};

type RingSegment = {
  type: 'segment' | 'tick' | 'dot';
  ringIdx: number;
  startAngle: number;
  arc: number;
  speed: number;
  opacity: number;
};

type Pulse = {
  start: number;
  kind: 'tap' | 'ext';
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

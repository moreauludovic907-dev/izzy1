import type { IzyTone } from '@/types';
import { getMessages } from './izyMessages';

/**
 * États émotionnels d'IZY — source unique de vérité.
 * Tous les composants qui montrent la sphère IZY doivent lire ces presets
 * pour avoir une cohérence parfaite.
 */

export type IzyStateName = 'idle' | 'listening' | 'thinking' | 'success' | 'memory' | 'warning';

export type IzyState = {
  // Animation sphère
  breathSpeed: number;       // multiplicateur de vitesse respiration (1 = normal)
  breathAmount: number;      // amplitude de la respiration (subtil)
  glowIntensity: number;     // 0..1.5
  hue: 'violet' | 'violet-warm' | 'violet-deep' | 'amber';
  particleSpeed: number;     // 1 = normal
  particleOpacity: number;   // 0..1
  ringTension: number;       // 0..1, plus c'est haut plus les anneaux se resserrent
  coreScale: number;         // facteur de taille du noyau central
  // Comportement
  showRings: boolean;
  showSynapses: boolean;
  showWaves: boolean;        // ondes voix
  pulseSync: boolean;        // pulse rythmé sur le battement
  // Message par défaut (peut être override)
  defaultMessage?: (tone: IzyTone | undefined) => string | null;
};

export const izyStates: Record<IzyStateName, IzyState> = {
  // === REPOS — respiration lente, halo calme, silence visuel ===
  idle: {
    breathSpeed: 0.4,
    breathAmount: 0.025,
    glowIntensity: 0.5,
    hue: 'violet',
    particleSpeed: 0.6,
    particleOpacity: 0.55,
    ringTension: 0,
    coreScale: 1,
    showRings: true,
    showSynapses: false,
    showWaves: false,
    pulseSync: false,
    defaultMessage: () => null,
  },

  // === ÉCOUTE — halo audio actif, captation ===
  listening: {
    breathSpeed: 0.8,
    breathAmount: 0.035,
    glowIntensity: 1.0,
    hue: 'violet',
    particleSpeed: 1.2,
    particleOpacity: 0.85,
    ringTension: 0.3,
    coreScale: 1.05,
    showRings: true,
    showSynapses: false,
    showWaves: true,
    pulseSync: false,
    defaultMessage: (tone) => getMessages(tone).imListening,
  },

  // === RÉFLEXION — mouvement interne, particules lentes ===
  thinking: {
    breathSpeed: 0.6,
    breathAmount: 0.03,
    glowIntensity: 0.85,
    hue: 'violet-deep',
    particleSpeed: 0.9,
    particleOpacity: 0.7,
    ringTension: 0.15,
    coreScale: 1.02,
    showRings: true,
    showSynapses: true,
    showWaves: false,
    pulseSync: false,
    defaultMessage: (tone) => getMessages(tone).imThinking,
  },

  // === SUCCÈS — pulse rapide puis retour calme ===
  success: {
    breathSpeed: 1.4,
    breathAmount: 0.05,
    glowIntensity: 1.3,
    hue: 'violet',
    particleSpeed: 1.5,
    particleOpacity: 1,
    ringTension: 0.5,
    coreScale: 1.1,
    showRings: true,
    showSynapses: false,
    showWaves: false,
    pulseSync: true,
    defaultMessage: (tone) => getMessages(tone).saved,
  },

  // === MÉMOIRE — impulsion glow ===
  memory: {
    breathSpeed: 0.7,
    breathAmount: 0.04,
    glowIntensity: 1.1,
    hue: 'violet-warm',
    particleSpeed: 1,
    particleOpacity: 0.9,
    ringTension: 0.2,
    coreScale: 1.04,
    showRings: true,
    showSynapses: false,
    showWaves: false,
    pulseSync: true,
    defaultMessage: (tone) => getMessages(tone).memory,
  },

  // === ATTENTION — lumière amber ===
  warning: {
    breathSpeed: 0.6,
    breathAmount: 0.04,
    glowIntensity: 0.9,
    hue: 'amber',
    particleSpeed: 0.7,
    particleOpacity: 0.7,
    ringTension: 0.1,
    coreScale: 1,
    showRings: true,
    showSynapses: false,
    showWaves: false,
    pulseSync: false,
    defaultMessage: () => null,
  },
};

/**
 * Palette de couleurs selon hue.
 * Pour rester dans l'identité violet/noir mais permettre de subtiles variations.
 */
export const izyHues = {
  violet: {
    aura: [167, 139, 250],      // #A78BFA
    deep: [124, 58, 237],       // #7C3AED
    rim: [196, 181, 253],       // #C4B5FD
  },
  'violet-warm': {
    aura: [196, 167, 250],
    deep: [147, 81, 237],
    rim: [221, 200, 253],
  },
  'violet-deep': {
    aura: [139, 92, 246],
    deep: [91, 33, 182],
    rim: [167, 139, 250],
  },
  amber: {
    aura: [251, 191, 36],       // #FBBF24
    deep: [180, 83, 9],         // #B45309
    rim: [254, 215, 170],       // #FED7AA
  },
};

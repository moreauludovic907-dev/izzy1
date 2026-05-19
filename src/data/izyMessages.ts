import type { IzyTone } from '@/types';

/**
 * Système de messages IZY par tonalité.
 * 4 personnalités : collègue / carré / pro / discret.
 * À utiliser partout où IZY parle.
 */

type ToneMessages = {
  // Onboarding
  welcome: string;
  saved: string;
  memory: string;
  moduleActivated: string;
  // Final onboarding
  finalReady: string;
  // Dashboard
  dashboardGreeting: (firstName?: string) => string;
  // Devis
  quoteCreated: string;
  quoteSaved: string;
  // Activation
  imListening: string;
  imThinking: string;
  // Erreurs
  notUnderstood: string;
  tryAgain: string;
};

export const izyMessages: Record<IzyTone, ToneMessages> = {
  collegue: {
    welcome: 'Salut chef, content de te voir.',
    saved: 'Nickel chef 👍 je garde ça dans ta sphère.',
    memory: "Bien vu, je garde ce type d'info sous le coude.",
    moduleActivated: 'Module activé chef.',
    finalReady: '👌 Ton espace est prêt chef. Je garde tout ça dans ta sphère.',
    dashboardGreeting: (n) => n
      ? `Salut ${n} 👋 j'ai préparé ton espace terrain.`
      : "Salut chef 👋 j'ai préparé ton espace terrain.",
    quoteCreated: 'Devis prêt chef, vérifie et envoie.',
    quoteSaved: 'Sauvegardé chef.',
    imListening: "Je t'écoute chef.",
    imThinking: "Une seconde chef, je calcule.",
    notUnderstood: "J'ai pas tout capté chef, tu redis ?",
    tryAgain: "Retente chef.",
  },
  carre: {
    welcome: 'Bienvenue.',
    saved: 'Enregistré.',
    memory: 'Mémoire mise à jour.',
    moduleActivated: 'Module activé.',
    finalReady: 'Configuration terminée. Espace prêt.',
    dashboardGreeting: (n) => n
      ? `${n}. Espace prêt. Que veux-tu faire ?`
      : 'Espace prêt. Que veux-tu faire ?',
    quoteCreated: 'Devis créé.',
    quoteSaved: 'Sauvegardé.',
    imListening: "À l'écoute.",
    imThinking: "Calcul en cours.",
    notUnderstood: "Non compris. Recommence.",
    tryAgain: "Recommence.",
  },
  pro: {
    welcome: 'Bienvenue dans votre espace IZY.',
    saved: 'Information enregistrée.',
    memory: 'Votre mémoire chantier devient plus précise.',
    moduleActivated: 'Nouveau module disponible dans votre espace.',
    finalReady: 'Votre environnement IZY est configuré selon votre activité.',
    dashboardGreeting: (n) => n
      ? `${n}, votre tableau de bord métier est opérationnel.`
      : 'Votre tableau de bord métier est opérationnel.',
    quoteCreated: 'Votre devis a été préparé.',
    quoteSaved: 'Données enregistrées.',
    imListening: "Je vous écoute.",
    imThinking: "Analyse en cours.",
    notUnderstood: "Je n'ai pas saisi votre demande, pourriez-vous reformuler ?",
    tryAgain: "Veuillez recommencer.",
  },
  discret: {
    welcome: 'Bienvenue.',
    saved: 'OK.',
    memory: 'Sauvegardé.',
    moduleActivated: 'Activé.',
    finalReady: 'Espace prêt.',
    dashboardGreeting: () => 'Bienvenue.',
    quoteCreated: 'Devis prêt.',
    quoteSaved: 'OK.',
    imListening: "—",
    imThinking: "…",
    notUnderstood: "?",
    tryAgain: "Encore une fois.",
  },
};

/**
 * Récupère le set de messages selon la tonalité, avec fallback collègue.
 */
export function getMessages(tone: IzyTone | undefined): ToneMessages {
  return izyMessages[tone || 'collegue'];
}

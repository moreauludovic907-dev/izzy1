import { supabase, isSupabaseConfigured } from './supabase';
import type { ModeName } from '@/types';

export type IntentMode = 'my-time' | 'on-air' | 'mode-izy' | 'societe';

export type IntentResult = {
  mode: IntentMode;
  confidence: number;
  reason: string;
};

/**
 * Détermine vers quel mode router selon ce que l'utilisateur a dit.
 *
 * - Si Supabase configuré : appelle l'Edge Function `route-intent`
 *   qui utilise Claude côté serveur (clé sécurisée)
 * - Sinon : fallback regex local
 */
export async function routeIntent(transcript: string): Promise<IntentResult> {
  const text = transcript.trim();
  if (!text) return { mode: 'my-time', confidence: 0, reason: 'empty' };

  // Si Supabase est configuré, on tente l'Edge Function
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('route-intent', {
        body: { transcript: text },
      });
      if (!error && data?.mode) {
        return data as IntentResult;
      }
      if (error) console.warn('Edge Function route-intent failed, fallback regex:', error);
    } catch (e) {
      console.warn('Edge Function invoke threw, fallback regex:', e);
    }
  }

  return routeWithRegex(text);
}

// ============================================================================
// FALLBACK REGEX (en cas d'échec Edge Function ou si non configuré)
// ============================================================================
function routeWithRegex(text: string): IntentResult {
  const t = text.toLowerCase();

  const onAir = [
    /infiltrat/, /fissur/, /d[ée]g[âa]t\s+des?\s+eaux/, /fuite/,
    /moisi/, /humidit[ée]/, /effondr/, /regarde\s+[çc]a/,
    /analyse\s+(la|le|cette|ce)/, /\bphoto\b/, /cam[ée]ra/,
    /probl[èe]me\s+sur\s+(le|un)\s+chantier/,
  ];
  for (const rx of onAir) {
    if (rx.test(t)) return { mode: 'on-air', confidence: 0.8, reason: rx.source };
  }

  const societe = [
    /chiffre\s+d.affaire/, /\bca\s+(du|de|ce|total|mensuel)/, /b[ée]n[ée]fice/,
    /\bmarge/, /rentabilit/, /statistiq/, /\bbilan/,
    /(montre|affiche|voir|donne)\s+(moi\s+)?(mes?|la|le)\s+(chiffres|stats|r[ée]sultat|activit|comptes)/,
    /comment\s+(je|on)\s+(va|me\s+d[ée]brouille)/,
    /tableau\s+de\s+bord/, /dashboard/, /pilote\s+(mon|ton)/,
  ];
  for (const rx of societe) {
    if (rx.test(t)) return { mode: 'societe', confidence: 0.75, reason: rx.source };
  }

  const modeIzy = [
    /^(quel|quelle|comment|pourquoi|qu.est|qu.es|c.est\s+quoi|que\s+(dois|faut|fais))/,
    /\btva\b/, /\bloi\b/, /conform/, /\bdroit/, /factur[ée]?\s+(electronique|x|le\s+client|impay)/,
    /relan[cç]/, /\bclient\s+qui\s+(ne|paie|paye)/, /aide.?moi\s+(à|a)\s+r[ée]dig/,
    /(comment|peux.tu)\s+(je\s+|m.)?(expliqu|conseill)/, /^dis.?moi/,
    /\bemail\b/, /e.?mail\s+pro/, /^explique/, /^c.est\s+(combien|quoi|quand)/,
  ];
  for (const rx of modeIzy) {
    if (rx.test(t)) return { mode: 'mode-izy', confidence: 0.7, reason: rx.source };
  }

  return { mode: 'my-time', confidence: 0.5, reason: 'default' };
}

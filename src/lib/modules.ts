import type { IzyNeed, IzyModule } from '@/types';

/**
 * Mémoire fake intelligente.
 * Selon les besoins cochés, certains modules sont activés.
 * Ces modules apparaîtront dans le dashboard et donneront une sensation d'IA personnalisée.
 */
const NEED_TO_MODULES: Record<IzyNeed, IzyModule[]> = {
  'devis-rapide': ['devis-rapide'],
  'envoi-client': ['envoi-client'],
  'infos-chantier': ['memoire-chantier'],
  'memoire-chantier': ['memoire-chantier'],
  'factures': ['facturation'],
  'suivi-equipe': ['suivi-equipe'],
  'detail-important': ['memoire-chantier'],
  'assistant-terrain': ['assistant-terrain'],
};

export function computeModules(needs: IzyNeed[]): IzyModule[] {
  const modules = new Set<IzyModule>();
  for (const n of needs) {
    for (const m of (NEED_TO_MODULES[n] || [])) {
      modules.add(m);
    }
  }
  // Devis rapide est toujours actif par défaut (c'est la fonction principale d'IZY)
  modules.add('devis-rapide');
  return Array.from(modules);
}

export const MODULE_LABELS: Record<IzyModule, { title: string; subtitle: string; icon: string }> = {
  'devis-rapide': {
    title: 'Devis rapide',
    subtitle: 'Dictée vocale → devis structuré',
    icon: 'Mic',
  },
  'memoire-chantier': {
    title: 'Mémoire chantier',
    subtitle: 'IZY se souvient de tes infos importantes',
    icon: 'Brain',
  },
  'suivi-equipe': {
    title: 'Suivi équipe',
    subtitle: 'Gère tes salariés et leurs heures',
    icon: 'Users',
  },
  'facturation': {
    title: 'Facturation',
    subtitle: 'Devis → facture → encaissement',
    icon: 'Receipt',
  },
  'envoi-client': {
    title: 'Envoi client',
    subtitle: 'Email + SMS automatiques',
    icon: 'Send',
  },
  'assistant-terrain': {
    title: 'Assistant terrain',
    subtitle: 'IZY t\'aide en temps réel sur chantier',
    icon: 'Sparkles',
  },
};

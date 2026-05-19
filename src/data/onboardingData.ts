import type { Trade, IzyNeed, IzyTone } from '@/types';

export const TRADES: { id: Trade; label: string; subtitle: string; emoji: string }[] = [
  { id: 'facadier', label: 'Façadier', subtitle: 'Ravalement, enduits, ITE', emoji: '🧱' },
  { id: 'electricien', label: 'Électricien', subtitle: 'Dépannage, neuf, rénovation', emoji: '⚡' },
  { id: 'plombier', label: 'Plombier', subtitle: 'Installation, dépannage, entretien', emoji: '🔧' },
  { id: 'peintre', label: 'Peintre', subtitle: 'Intérieur, extérieur, décoration', emoji: '🎨' },
  { id: 'macon', label: 'Maçon', subtitle: 'Gros œuvre, fondations, structure', emoji: '🏗️' },
  { id: 'menuisier', label: 'Menuisier', subtitle: 'Bois, agencement, pose', emoji: '🪵' },
  { id: 'multi-services', label: 'Multi-services', subtitle: 'Plusieurs corps de métier', emoji: '🔨' },
  { id: 'autre', label: 'Autre', subtitle: 'Décris-moi ton activité', emoji: '🛠️' },
];

export const NEEDS: { id: IzyNeed; label: string; subtitle: string }[] = [
  { id: 'devis-rapide', label: 'Faire mes devis plus vite', subtitle: 'Dictée vocale, IZY rédige' },
  { id: 'envoi-client', label: 'Envoyer directement aux clients', subtitle: 'Email + SMS auto' },
  { id: 'infos-chantier', label: 'Retrouver mes infos chantier', subtitle: 'Tout au même endroit' },
  { id: 'memoire-chantier', label: 'Garder une mémoire chantier', subtitle: 'IZY se souvient pour toi' },
  { id: 'factures', label: 'Gérer mes factures', subtitle: 'Devis → facture → paiement' },
  { id: 'suivi-equipe', label: 'Suivre mes équipes', subtitle: 'Heures, présences, missions' },
  { id: 'detail-important', label: "Ne plus oublier d'importants détails", subtitle: 'IZY te rappelle l\'essentiel' },
  { id: 'assistant-terrain', label: 'Avoir un assistant terrain', subtitle: 'IZY répond à tes questions' },
];

export const TONES: { id: IzyTone; label: string; emoji: string; desc: string; example: string }[] = [
  {
    id: 'collegue',
    label: 'Collègue terrain',
    emoji: '🤝',
    desc: 'Naturel, utile, proche du terrain.',
    example: 'Nickel chef 👍 je garde ça dans ta sphère.',
  },
  {
    id: 'carre',
    label: 'Carré',
    emoji: '⚡',
    desc: 'Rapide, direct, sans blabla.',
    example: 'Configuration enregistrée.',
  },
  {
    id: 'pro',
    label: 'Pro',
    emoji: '🧠',
    desc: 'Plus analytique, orienté optimisation.',
    example: 'IZY adaptera ses suggestions à votre activité.',
  },
  {
    id: 'discret',
    label: 'Discret',
    emoji: '🌙',
    desc: "Minimal, seulement l'essentiel.",
    example: 'Enregistré.',
  },
];

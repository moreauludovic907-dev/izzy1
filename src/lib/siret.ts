import type { CompanyInfo } from '@/types';

/**
 * Récupère les informations d'une entreprise depuis son SIRET.
 *
 * Aujourd'hui : mock avec données plausibles.
 * Demain : appel API Sirene gratuite (api.insee.fr / api.gouv.fr).
 *
 * Format SIRET : 14 chiffres (9 pour SIREN + 5 pour NIC).
 */
export async function fetchCompanyBySiret(siret: string): Promise<CompanyInfo | null> {
  const cleaned = siret.replace(/\s+/g, '');

  if (!/^\d{14}$/.test(cleaned)) {
    return null;
  }

  // Simulation latence réseau (350-700ms)
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 350));

  // === MOCK ===
  // Plusieurs profils mock selon les 2 premiers chiffres pour rendre crédible
  const first = parseInt(cleaned.substring(0, 2), 10);
  const mockProfiles: Omit<CompanyInfo, 'siret' | 'active'>[] = [
    {
      name: 'DUPONT PLOMBERIE',
      address: '12 rue des Artisans, 66000 Perpignan',
      legalForm: 'SARL',
      apeCode: '4322A',
    },
    {
      name: 'MOREAU FACADES',
      address: '24 avenue du Bâtiment, 34000 Montpellier',
      legalForm: 'Auto-entrepreneur',
      apeCode: '4399C',
    },
    {
      name: 'BTP ELECTRICITE',
      address: '8 boulevard de la République, 30000 Nîmes',
      legalForm: 'SAS',
      apeCode: '4321A',
    },
    {
      name: 'MAISON & FINITIONS',
      address: '5 impasse du Travail, 13000 Marseille',
      legalForm: 'SARL',
      apeCode: '4334Z',
    },
  ];
  const profile = mockProfiles[first % mockProfiles.length];

  return {
    ...profile,
    siret: cleaned,
    active: true,
  };
}

/**
 * Valide un SIRET (longueur + algorithme Luhn).
 * Aujourd'hui on accepte tout SIRET de 14 chiffres pour le mock.
 */
export function isValidSiret(siret: string): boolean {
  const cleaned = siret.replace(/\s+/g, '');
  return /^\d{14}$/.test(cleaned);
}

/**
 * Formate un SIRET pour affichage : "12345678901234" → "123 456 789 01234"
 */
export function formatSiret(siret: string): string {
  const c = siret.replace(/\s+/g, '');
  if (c.length !== 14) return siret;
  return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6, 9)} ${c.slice(9, 14)}`;
}

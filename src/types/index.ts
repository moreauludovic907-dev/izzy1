export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
};

export type QuoteLine = {
  id: string;
  label: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate: number;
};

export type Quote = {
  id: string;
  number: string;
  clientName: string;
  lines: QuoteLine[];
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
  updatedAt: string;
  totalHT: number;
  totalTTC: number;
  totalVAT: number;
};

// ============ ONBOARDING / PROFIL ENRICHI ============

export type Trade =
  | 'facadier' | 'electricien' | 'plombier' | 'peintre'
  | 'macon' | 'menuisier' | 'multi-services' | 'autre';

export type IzyTone = 'collegue' | 'carre' | 'pro' | 'discret';

export type IzyNeed =
  | 'devis-rapide'
  | 'envoi-client'
  | 'infos-chantier'
  | 'memoire-chantier'
  | 'factures'
  | 'suivi-equipe'
  | 'detail-important'
  | 'assistant-terrain';

export type IzyModule =
  | 'devis-rapide'
  | 'memoire-chantier'
  | 'suivi-equipe'
  | 'facturation'
  | 'envoi-client'
  | 'assistant-terrain';

export type CompanyInfo = {
  name: string;
  siret?: string;
  address?: string;
  legalForm?: string;
  apeCode?: string;
  phone?: string;
  email?: string;
  active?: boolean;
};

export type UserProfile = {
  id: string;
  email: string;
  firstName?: string;
  // Compat ancienne version (lecture seule)
  companyName: string;
  phone?: string;
  siret?: string;
  trade?: Trade;
  // Nouveaux champs onboarding
  needs?: IzyNeed[];
  izyTone?: IzyTone;
  company?: CompanyInfo;
  modules?: IzyModule[];
  onboardingDone?: boolean;
  createdAt?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'izy';
  content: string;
  timestamp: number;
};

export type ModeName = 'home' | 'on-air' | 'my-time' | 'mode-izy' | 'societe' | 'quote-detail';

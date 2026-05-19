import type { Quote, QuoteLine } from '@/types';

export const fmtEUR = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const round2 = (n: number) => Math.round(n * 100) / 100;

export const computeTotals = (lines: QuoteLine[]) => {
  let totalHT = 0;
  let totalVAT = 0;
  for (const l of lines) {
    const ht = l.quantity * l.unitPrice;
    totalHT += ht;
    totalVAT += ht * (l.vatRate / 100);
  }
  return {
    totalHT: round2(totalHT),
    totalVAT: round2(totalVAT),
    totalTTC: round2(totalHT + totalVAT),
  };
};

export const newQuoteNumber = () => {
  const d = new Date();
  const yymm = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `D-${yymm}-${rand}`;
};

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const finalizeQuote = (q: Omit<Quote, 'totalHT' | 'totalTTC' | 'totalVAT'>): Quote => ({
  ...q,
  ...computeTotals(q.lines),
});

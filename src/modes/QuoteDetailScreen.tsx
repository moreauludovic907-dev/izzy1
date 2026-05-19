import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { getQuote, saveQuote, getProfile } from '@/lib/db';
import { computeTotals, fmtEUR, uid } from '@/lib/quote';
import { downloadQuotePDF } from '@/lib/pdf';
import { Plus, Trash2, Download, Send } from 'lucide-react';
import type { Quote, QuoteLine, UserProfile, ModeName } from '@/types';

type Props = {
  quoteId: string;
  onNavigate: (m: ModeName, data?: any) => void;
};

export function QuoteDetailScreen({ quoteId, onNavigate }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getQuote(quoteId).then((q) => q && setQuote(q));
    getProfile().then(setProfile);
  }, [quoteId]);

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: 'var(--ink-dim)' }}>Chargement…</p>
      </div>
    );
  }

  const updateLine = (id: string, patch: Partial<QuoteLine>) => {
    setQuote((q) => {
      if (!q) return q;
      const lines = q.lines.map((l) => (l.id === id ? { ...l, ...patch } : l));
      return { ...q, lines, ...computeTotals(lines) };
    });
  };

  const addLine = () => {
    setQuote((q) => {
      if (!q) return q;
      const lines = [...q.lines, { id: uid(), label: '', quantity: 1, unit: 'u', unitPrice: 0, vatRate: 10 }];
      return { ...q, lines, ...computeTotals(lines) };
    });
  };

  const removeLine = (id: string) => {
    setQuote((q) => {
      if (!q) return q;
      const lines = q.lines.filter((l) => l.id !== id);
      return { ...q, lines, ...computeTotals(lines) };
    });
  };

  const save = async () => {
    if (!quote) return;
    await saveQuote({ ...quote, updatedAt: new Date().toISOString() });
  };

  const send = async () => {
    if (!quote) return;
    const updated: Quote = { ...quote, status: 'sent', updatedAt: new Date().toISOString() };
    await saveQuote(updated);
    setQuote(updated);
  };

  return (
    <div className="pb-12">
      <TopBar onBack={async () => { await save(); onNavigate('my-time'); }} title={quote.number} />

      <div className="px-5 pt-2">
        {/* Client */}
        <div className="card rounded-2xl p-4 mb-4">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-1.5" style={{ color: 'var(--ink-faint)' }}>
            Client
          </p>
          <input
            type="text"
            value={quote.clientName}
            onChange={(e) => setQuote({ ...quote, clientName: e.target.value })}
            placeholder="Nom du client"
            className="w-full bg-transparent text-base font-medium"
          />
        </div>

        {/* Statut */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="font-mono text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background: quote.status === 'draft' ? 'rgba(255,200,61,0.15)' : 'rgba(139,92,246,0.15)',
              color: quote.status === 'draft' ? '#FFC83D' : '#A78BFA',
            }}
          >
            {quote.status === 'draft' ? 'BROUILLON' : quote.status === 'sent' ? 'ENVOYÉ' : 'PAYÉ'}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>
            {new Date(quote.createdAt).toLocaleDateString('fr-FR')}
          </span>
        </div>

        <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--ink-faint)' }}>
          Prestations · {quote.lines.length}
        </p>

        <div className="space-y-3 mb-4">
          {quote.lines.map((l) => (
            <div key={l.id} className="card rounded-2xl p-4">
              <div className="flex items-start gap-2 mb-3">
                <input
                  type="text"
                  value={l.label}
                  onChange={(e) => updateLine(l.id, { label: e.target.value })}
                  placeholder="Désignation"
                  className="flex-1 bg-transparent text-sm font-medium"
                />
                <button onClick={() => removeLine(l.id)} className="text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={l.quantity}
                  onChange={(e) => updateLine(l.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="col-span-3 rounded-xl px-2 py-2 text-sm text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}
                />
                <select
                  value={l.unit || 'u'}
                  onChange={(e) => updateLine(l.id, { unit: e.target.value })}
                  className="col-span-2 rounded-xl px-2 py-2 text-sm"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)', color: 'white' }}
                >
                  <option value="u">u</option>
                  <option value="h">h</option>
                  <option value="m">m</option>
                  <option value="m²">m²</option>
                  <option value="j">j</option>
                  <option value="forfait">fft</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(l.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="col-span-4 rounded-xl px-2 py-2 text-sm text-right"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)' }}
                />
                <select
                  value={l.vatRate}
                  onChange={(e) => updateLine(l.id, { vatRate: parseFloat(e.target.value) })}
                  className="col-span-3 rounded-xl px-2 py-2 text-sm"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-mid)', color: 'white' }}
                >
                  <option value="5.5">5,5%</option>
                  <option value="10">10%</option>
                  <option value="20">20%</option>
                </select>
              </div>
              <div className="text-right mt-2 text-xs font-mono" style={{ color: 'var(--ink-dim)' }}>
                Total : <span className="text-violet font-semibold">{fmtEUR(l.quantity * l.unitPrice)}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addLine}
          className="w-full py-3 rounded-2xl card flex items-center justify-center gap-2 text-sm font-semibold mb-5"
        >
          <Plus size={16} />
          Ajouter une ligne
        </button>

        <div className="card rounded-2xl p-5 mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: 'var(--ink-dim)' }}>Total HT</span>
            <span className="font-medium">{fmtEUR(quote.totalHT)}</span>
          </div>
          <div className="flex justify-between text-sm mb-3">
            <span style={{ color: 'var(--ink-dim)' }}>TVA</span>
            <span className="font-medium">{fmtEUR(quote.totalVAT)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t" style={{ borderColor: 'var(--line-strong)' }}>
            <span className="text-sm font-semibold">Total TTC</span>
            <span className="font-display text-2xl text-violet">{fmtEUR(quote.totalTTC)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={async () => { await save(); downloadQuotePDF(quote, profile); }}
            className="w-full py-3.5 rounded-2xl card flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <Download size={16} />
            Télécharger le PDF
          </button>
          {quote.status === 'draft' && (
            <button
              onClick={send}
              className="btn-violet w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm"
            >
              <Send size={16} />
              Marquer comme envoyé
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

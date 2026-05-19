import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { listQuotes, listClients } from '@/lib/db';
import { fmtEUR } from '@/lib/quote';
import type { ModeName, Quote, Client } from '@/types';
import { TrendingUp, AlertTriangle, Lightbulb, Target, Users, FileText } from 'lucide-react';

type Props = { onNavigate: (m: ModeName) => void };

type Insight = {
  type: 'warning' | 'tip' | 'success' | 'info';
  icon: any;
  title: string;
  text: string;
};

export function SocieteMode({ onNavigate }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    listQuotes().then(setQuotes);
    listClients().then(setClients);
  }, []);

  // ---- Calculs ----
  const total = quotes.reduce((s, q) => s + q.totalTTC, 0);
  const paid = quotes.filter((q) => q.status === 'paid');
  const sent = quotes.filter((q) => q.status === 'sent');
  const draft = quotes.filter((q) => q.status === 'draft');
  const totalPaid = paid.reduce((s, q) => s + q.totalTTC, 0);
  const totalSent = sent.reduce((s, q) => s + q.totalTTC, 0);

  const thisMonth = quotes.filter((q) => {
    const d = new Date(q.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const totalMonth = thisMonth.reduce((s, q) => s + q.totalTTC, 0);

  // Par mois 6 derniers
  const byMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    byMonth[monthKey(d)] = 0;
  }
  for (const q of quotes) {
    const k = monthKey(new Date(q.createdAt));
    if (k in byMonth) byMonth[k] += q.totalTTC;
  }
  const maxMonth = Math.max(...Object.values(byMonth), 1);

  // ---- Insights (mock intelligent) ----
  const insights: Insight[] = generateInsights({ quotes, clients, totalMonth, draft, sent });

  return (
    <div className="min-h-screen pb-12">
      <TopBar onBack={() => onNavigate('home')} title="SOCIÉTÉ" />

      <div className="px-5 pt-2">
        {/* Header */}
        <h1 className="font-display text-3xl mb-1" style={{ letterSpacing: '-0.02em' }}>
          Ton <span className="text-violet italic">activité</span>
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-dim)' }}>
          Vue d'ensemble · Insights IZY
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <KPI icon={TrendingUp} label="CA Total" value={fmtEUR(total)} sub={`${quotes.length} devis`} />
          <KPI icon={Target} label="Encaissé" value={fmtEUR(totalPaid)} sub={`${paid.length} payés`} accent />
          <KPI icon={FileText} label="En attente" value={fmtEUR(totalSent)} sub={`${sent.length} envoyés`} />
          <KPI icon={Users} label="Clients" value={String(clients.length)} sub="actifs" />
        </div>

        {/* Insights IA */}
        {insights.length > 0 && (
          <>
            <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>
              ⬢ IZY a remarqué
            </p>
            <div className="space-y-2 mb-6">
              {insights.map((ins, i) => (
                <InsightCard key={i} insight={ins} />
              ))}
            </div>
          </>
        )}

        {/* Graph 6 mois */}
        <p className="font-mono text-[9px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--ink-faint)' }}>
          ⬢ Évolution · 6 mois
        </p>
        <div className="card rounded-2xl p-5 mb-6">
          <div className="flex items-end justify-between gap-2 h-32">
            {Object.entries(byMonth).map(([m, v]) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                  <div
                    className="rounded-t-md w-full"
                    style={{
                      height: `${(v / maxMonth) * 100}%`,
                      background: 'linear-gradient(180deg, #A78BFA, #6D28D9)',
                      minHeight: v > 0 ? '4px' : '0',
                      boxShadow: v > 0 ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono" style={{ color: 'var(--ink-faint)' }}>
                  {m}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--ink-faint)' }}>
            CA mensuel · Max : {fmtEUR(maxMonth)}
          </p>
        </div>

        {/* Note finale */}
        <p className="text-[10px] text-center mt-2 mb-8" style={{ color: 'var(--ink-faint)' }}>
          Rentabilité par chantier · Marge IA · Prévisions — Plan ELITE
        </p>
      </div>
    </div>
  );
}

// ---- Composants ----
function KPI({ icon: Icon, label, value, sub, accent }: any) {
  return (
    <div className="card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className="text-violet-300" />
        <span className="text-[10px] font-mono tracking-wider uppercase" style={{ color: 'var(--ink-faint)' }}>
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl ${accent ? 'text-violet' : ''}`}>{value}</p>
      <p className="text-[10px] mt-1" style={{ color: 'var(--ink-dim)' }}>
        {sub}
      </p>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = insight.icon;
  const colors = {
    warning: { bg: 'rgba(255,200,61,0.08)', border: 'rgba(255,200,61,0.3)', text: '#FFC83D' },
    tip: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', text: '#A78BFA' },
    success: { bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.3)', text: '#34D399' },
    info: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', text: '#D1D5DB' },
  };
  const c = colors[insight.type];
  return (
    <div className="rounded-2xl p-4 flex gap-3 border" style={{ background: c.bg, borderColor: c.border }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: c.border }}
      >
        <Icon size={14} style={{ color: c.text }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5" style={{ color: c.text }}>
          {insight.title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
          {insight.text}
        </p>
      </div>
    </div>
  );
}

// ---- Logique insights ----
function generateInsights({ quotes, clients, totalMonth, draft, sent }: any): Insight[] {
  const out: Insight[] = [];

  if (draft.length >= 3) {
    out.push({
      type: 'warning',
      icon: AlertTriangle,
      title: `${draft.length} devis en brouillon`,
      text: "Termine-les vite, c'est du CA potentiel qui dort. Plus tu attends, moins le client se souvient de ta proposition.",
    });
  }

  if (sent.length >= 2) {
    out.push({
      type: 'tip',
      icon: Lightbulb,
      title: 'Pense aux relances',
      text: `Tu as ${sent.length} devis envoyés sans réponse. Une relance polite 5-7 jours après envoi double tes chances de signer.`,
    });
  }

  if (quotes.length >= 3) {
    const avg = quotes.reduce((s: number, q: Quote) => s + q.totalTTC, 0) / quotes.length;
    out.push({
      type: 'info',
      icon: TrendingUp,
      title: `Panier moyen : ${fmtEUR(avg)}`,
      text: 'Pour augmenter ce chiffre, propose systématiquement une option premium ou un complément (entretien annuel, garantie étendue).',
    });
  }

  if (totalMonth === 0 && quotes.length === 0) {
    out.push({
      type: 'tip',
      icon: Lightbulb,
      title: 'Commence par un devis',
      text: "Touche le noyau IZY sur l'accueil et dicte ton premier devis. Tu verras, ça change la vie.",
    });
  }

  if (clients.length >= 5) {
    out.push({
      type: 'success',
      icon: Target,
      title: `${clients.length} clients dans ton portefeuille`,
      text: 'Pense à les recontacter régulièrement. Un client existant coûte 5x moins cher à reconquérir qu\'un nouveau.',
    });
  }

  return out.slice(0, 3);
}

function monthKey(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short' });
}

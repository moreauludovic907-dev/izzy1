import { TopBar } from '@/components/TopBar';
import { Camera, Eye, Zap, Cpu } from 'lucide-react';
import type { ModeName } from '@/types';

type Props = { onNavigate: (m: ModeName) => void };

export function OnAirMode({ onNavigate }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar onBack={() => onNavigate('home')} title="ON AIR" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-8">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center card neon-border"
            style={{
              boxShadow: '0 0 40px rgba(139,92,246,0.3)',
            }}
          >
            <Camera size={36} className="text-violet-300" />
          </div>
          <span
            className="absolute -top-2 -right-2 font-mono text-[9px] tracking-[0.15em] uppercase px-2 py-1 rounded-full"
            style={{
              background: 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)',
              color: '#C4B5FD',
            }}
          >
            Bientôt
          </span>
        </div>

        <h1 className="font-display text-3xl mb-3" style={{ letterSpacing: '-0.02em' }}>
          IZY voit <span className="text-violet italic">avec toi</span>.
        </h1>
        <p className="text-sm max-w-sm mb-8" style={{ color: 'var(--ink-dim)' }}>
          Le mode caméra + assistance terrain temps réel arrive bientôt. IZY observera ton chantier et t'aidera
          à estimer, comparer, mémoriser.
        </p>

        <div className="w-full max-w-md space-y-2">
          <Feature icon={Eye} title="Analyse visuelle du chantier" />
          <Feature icon={Cpu} title="Estimation automatique des matériaux" />
          <Feature icon={Zap} title="Comparaison avec tes anciens chantiers" />
        </div>

        <p className="font-mono text-[10px] mt-10 tracking-[0.3em]" style={{ color: 'var(--ink-faint)' }}>
          ON AIR · V2
        </p>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title }: any) {
  return (
    <div className="card rounded-2xl p-3 flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(139,92,246,0.12)' }}
      >
        <Icon size={14} className="text-violet-300" />
      </div>
      <p className="text-sm text-left">{title}</p>
    </div>
  );
}

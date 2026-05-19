import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
};

export function ModeCard({ icon, label, sublabel, onClick, disabled, comingSoon }: Props) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`card card-hover w-full rounded-2xl p-4 flex flex-col items-start gap-3 relative ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      {comingSoon && (
        <span
          className="absolute top-3 right-3 font-mono text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#C4B5FD',
            border: '1px solid rgba(139, 92, 246, 0.25)',
          }}
        >
          BIENTÔT
        </span>
      )}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: 'rgba(139, 92, 246, 0.12)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
        }}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className="font-display text-base font-medium">{label}</p>
        {sublabel && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-dim)' }}>
            {sublabel}
          </p>
        )}
      </div>
    </button>
  );
}

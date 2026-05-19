import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  selected?: boolean;
  onClick: () => void;
  icon?: ReactNode | string;
  label: string;
  subtitle?: string;
  example?: string;
};

export function OnboardingCard({ selected, onClick, icon, label, subtitle, example }: Props) {
  return (
    <button
      onClick={onClick}
      className="card-hover w-full text-left rounded-2xl p-4 focus:outline-none"
      style={{
        background: selected
          ? 'linear-gradient(180deg, rgba(139,92,246,0.14), rgba(124,58,237,0.06))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.010))',
        border: selected
          ? '1px solid rgba(167,139,250,0.40)'
          : '1px solid rgba(255,255,255,0.05)',
        boxShadow: selected
          ? '0 0 32px -8px rgba(139,92,246,0.30), inset 0 1px 0 rgba(255,255,255,0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 30px -10px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{
              background: selected ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
              border: selected ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(255,255,255,0.04)',
            }}
          >
            {typeof icon === 'string' ? <span>{icon}</span> : icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-medium leading-tight"
            style={{ color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.92)' }}
          >
            {label}
          </p>
          {subtitle && (
            <p className="text-xs mt-0.5 leading-snug" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {subtitle}
            </p>
          )}
          {example && (
            <p
              className="text-xs mt-2 italic leading-snug"
              style={{ color: selected ? 'rgba(196,181,253,0.80)' : 'rgba(255,255,255,0.38)' }}
            >
              "{example}"
            </p>
          )}
        </div>
        {selected && (
          <div
            className="check-pop w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: '#8B5CF6',
              boxShadow: '0 0 12px rgba(139,92,246,0.5)',
            }}
          >
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
    </button>
  );
}

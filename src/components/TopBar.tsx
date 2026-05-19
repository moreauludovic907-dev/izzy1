import { User, Plus, ArrowLeft } from 'lucide-react';

type Props = {
  onProfile?: () => void;
  onAdd?: () => void;
  onBack?: () => void;
  title?: string;
};

export function TopBar({ onProfile, onAdd, onBack, title }: Props) {
  return (
    <div className="safe-top px-5 pt-4 pb-3 flex items-center justify-between relative z-10">
      {onBack ? (
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center card"
        >
          <ArrowLeft size={18} />
        </button>
      ) : (
        <button
          onClick={onProfile}
          className="w-10 h-10 rounded-full flex items-center justify-center card neon-border"
        >
          <User size={16} />
        </button>
      )}

      {title && <h1 className="font-display text-base flex-1 text-center">{title}</h1>}
      {!title && <div className="flex-1" />}

      {onAdd && (
        <button
          onClick={onAdd}
          className="w-10 h-10 rounded-full flex items-center justify-center card neon-border"
        >
          <Plus size={18} />
        </button>
      )}
      {!onAdd && <div className="w-10" />}
    </div>
  );
}

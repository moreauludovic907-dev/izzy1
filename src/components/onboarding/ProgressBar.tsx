type Props = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: Props) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div className="w-full">
      <div
        className="h-[2px] w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #8B5CF6, #C4B5FD)',
            boxShadow: '0 0 12px rgba(139,92,246,0.5)',
          }}
        />
      </div>
      <p
        className="mt-2 font-mono text-[9px] tracking-[0.35em] uppercase text-center"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {current} / {total}
      </p>
    </div>
  );
}

import { formatYen } from "../../lib/format";

export function ProgressBar({ collected, target }: { collected: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-semibold text-(--text)">{formatYen(collected)}</span>
        <span className="text-muted">dari target {formatYen(target)}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--primary)" }}
        />
      </div>
      <p className="text-xs text-muted mt-1">{pct}% tercapai</p>
    </div>
  );
}

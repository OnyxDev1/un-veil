import type { WalletResult } from "../lib/useWalletTracker";

export function StatsBar({ wallets }: { wallets: WalletResult[] }) {
  const active   = wallets.filter(w => w.status === "active").length;
  const bestPnl  = wallets.reduce((best, w) => Math.max(best, w.pnlEstimate), 0);

  const scored   = wallets.filter(w => w.confidence !== null);
  const avgConf  = scored.length > 0
    ? Math.round(scored.reduce((s, w) => s + (w.confidence ?? 0), 0) / scored.length)
    : null;

  const stats = [
    { label: "Flagged wallets", value: wallets.length.toString(),      accent: false },
    { label: "Active traders",  value: active.toString(),              accent: false },
    { label: "Best PnL",        value: `+${bestPnl.toFixed(2)} SOL`,  accent: true  },
    ...(avgConf !== null
      ? [{ label: "Avg confidence", value: `${avgConf}%`, accent: false }]
      : []),
  ];

  return (
    <div className={`grid gap-3 mb-6 ${stats.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
      {stats.map((s) => (
        <div key={s.label} className="bg-uv-card border border-uv-border rounded-lg p-3">
          <div className="text-xs text-gray-600 font-mono mb-1 uppercase tracking-wider">{s.label}</div>
          <div className={`text-xl font-semibold tabular-nums ${s.accent ? "text-uv-yellow" : "text-white"}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

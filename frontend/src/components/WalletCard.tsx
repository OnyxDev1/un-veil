"use client";
import { useState } from "react";
import type { WalletResult, HeldToken } from "../lib/useWalletTracker";

const DEPTH_STYLES: Record<number, { label: string; dot: string; text: string; border: string }> = {
  1: { label: "depth 1", dot: "bg-red-500",     text: "text-red-400",     border: "border-red-900/40" },
  2: { label: "depth 2", dot: "bg-amber-400",   text: "text-amber-400",   border: "border-amber-900/40" },
  3: { label: "depth 3", dot: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-900/40" },
};

function shorten(addr: string) {
  return addr.slice(0, 5) + "…" + addr.slice(-4);
}

function timeAgo(iso: string | null) {
  if (!iso) return "unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TokenPill({ token }: { token: HeldToken }) {
  const [imgError, setImgError] = useState(false);
  const value = token.valueUsd != null ? `$${token.valueUsd.toFixed(2)}` : null;

  return (
    <div className="flex items-center gap-1.5 bg-uv-border rounded-lg px-2 py-1.5 min-w-0">
      {token.image && !imgError ? (
        <img
          src={token.image}
          alt={token.symbol}
          width={20}
          height={20}
          className="rounded-full shrink-0 object-cover"
          style={{ width: 20, height: 20 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-uv-muted shrink-0 flex items-center justify-center text-[8px] text-gray-400 font-bold">
          {token.symbol.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs font-mono text-white font-medium truncate">{token.symbol}</div>
        {value && <div className="text-[10px] text-gray-500">{value}</div>}
      </div>
    </div>
  );
}

export function WalletCard({ wallet }: { wallet: WalletResult }) {
  const depth = DEPTH_STYLES[wallet.depth] ?? DEPTH_STYLES[3];
  const pnlPos = wallet.pnlEstimate >= 0;
  const hasTokens = wallet.heldTokens && wallet.heldTokens.length > 0;
  const totalValueUsd = wallet.heldTokens?.reduce((s, t) => s + (t.valueUsd ?? 0), 0) ?? 0;

  return (
    <div className="card-in bg-uv-card border border-uv-border rounded-xl p-4 hover:border-uv-muted transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${depth.dot} shrink-0`} />
            <span className="font-mono text-sm text-white font-medium">{shorten(wallet.address)}</span>
            <button
              onClick={() => navigator.clipboard.writeText(wallet.address)}
              className="text-xs text-uv-muted hover:text-white transition-colors"
              title="Copy address"
            >⧉</button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${depth.border} ${depth.text} font-mono`}>
              {depth.label}
            </span>
            {wallet.status === "active" ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-uv-yellow/10 text-uv-yellow border border-uv-yellow/20 font-mono">
                ◉ trading
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-uv-border text-gray-500 border border-uv-muted/30 font-mono">
                ◎ watching
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-lg font-semibold tabular-nums ${pnlPos ? "text-emerald-400" : "text-red-400"}`}>
            {pnlPos ? "+" : ""}{wallet.pnlEstimate.toFixed(2)} SOL
          </div>
          <div className="text-xs text-gray-600">{wallet.solBalance.toFixed(2)} SOL balance</div>
          {totalValueUsd > 0 && (
            <div className="text-xs text-gray-500">${totalValueUsd.toFixed(2)} in tokens</div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-600 font-mono mb-3">
        <span>{wallet.swapCount} swaps</span>
        <span>{wallet.txCount} txs</span>
        <span>{timeAgo(wallet.lastActive)}</span>
      </div>

      {/* Held tokens with images */}
      {hasTokens && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-2">Holdings</div>
          <div className="flex gap-2 flex-wrap">
            {wallet.heldTokens.map(t => (
              <TokenPill key={t.mint} token={t} />
            ))}
          </div>
        </div>
      )}

      {/* Fund trail */}
      <div className="flex items-center gap-1 flex-wrap text-xs text-gray-700 font-mono pt-2.5 border-t border-uv-border">
        {wallet.trail.map((addr, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-gray-600">{shorten(addr)}</span>
            <span className="text-uv-yellow/40">→</span>
          </span>
        ))}
        <span className="text-gray-400">{shorten(wallet.address)}</span>
      </div>

      <a
        href={`https://solscan.io/account/${wallet.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1 text-xs text-gray-700 hover:text-uv-yellow transition-colors w-fit font-mono"
      >
        solscan ↗
      </a>
    </div>
  );
}

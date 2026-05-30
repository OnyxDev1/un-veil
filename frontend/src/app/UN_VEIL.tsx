"use client";
import { useState } from "react";
import Image from "next/image";
import { useWalletTracker } from "../lib/useWalletTracker";
import { WalletCard } from "../components/WalletCard";
import { StatsBar } from "../components/StatsBar";

export default function UnVeil() {
  const [input, setInput] = useState("");
  const { track, reset, state, wallets, statusMsg, error } = useWalletTracker();

  function handleTrack() {
    const addr = input.trim();
    if (!addr) return;
    track(addr);
  }

  function handleReset() {
    setInput("");
    reset();
  }

  const isScanning = state === "scanning";
  const hasResults = wallets.length > 0;
  const activeWallets = wallets.filter(w => w.status === "active");
  const watchingWallets = wallets.filter(w => w.status === "watching");

  return (
    <div className="min-h-screen bg-uv-black text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.04]">
          <defs>
            <pattern id="circuit" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M0 40 H30 M50 40 H80 M40 0 V30 M40 50 V80" stroke="#FFD726" strokeWidth="0.5" fill="none"/>
              <circle cx="40" cy="40" r="3" fill="none" stroke="#FFD726" strokeWidth="0.5"/>
              <circle cx="0" cy="40" r="2" fill="#FFD726"/>
              <circle cx="80" cy="40" r="2" fill="#FFD726"/>
              <circle cx="40" cy="0" r="2" fill="#FFD726"/>
              <circle cx="40" cy="80" r="2" fill="#FFD726"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)"/>
        </svg>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-10">
        <header className="flex items-center gap-4 mb-12">
          <div className="relative w-12 h-12 shrink-0">
            <Image src="/logo.jpg" alt="UN/VEIL logo" fill className="object-contain rounded-lg" priority/>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">
              UN<span className="text-uv-yellow">/</span>VEIL
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-mono tracking-wider">SOLANA FUND FLOW INTELLIGENCE</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-uv-yellow animate-pulse-slow" />
            <span className="text-xs text-gray-600 font-mono">LIVE</span>
          </div>
        </header>

        {/* CA display — below header */}
        <div className="font-mono text-sm mb-6 px-1">
          <span className="text-uv-yellow font-bold">CA: </span>
          <span className="text-emerald-400">94SknxRxCDodZ1WdPjnaEqcm5y5eP4THG5jseAHVpump</span>
        </div>

        <div className="mb-10">
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">
            Paste any Solana wallet. UN/VEIL traces where the funds went, filters exchanges,
            and surfaces wallets actively trading meme tokens — in real time.
          </p>
          <div className="relative">
            <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-uv-yellow rounded-full" />
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleTrack()}
                placeholder="Enter wallet address…"
                disabled={isScanning}
                className="flex-1 bg-uv-card border border-uv-border rounded-lg px-4 py-3 font-mono text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-uv-yellow/40 transition-colors disabled:opacity-50"
              />
              {state === "idle" || state === "error" ? (
                <button
                  onClick={handleTrack}
                  disabled={!input.trim()}
                  className="px-5 py-3 bg-uv-yellow text-black text-sm font-bold rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap tracking-tight"
                >
                  Unveil
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="px-5 py-3 bg-uv-card border border-uv-border text-gray-400 text-sm font-medium rounded-lg hover:border-gray-600 transition-colors whitespace-nowrap"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {(isScanning || state === "done") && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-uv-card border border-uv-border rounded-lg">
            {isScanning ? (
              <>
                <div className="w-3 h-3 rounded-full border border-uv-yellow border-t-transparent animate-spin shrink-0" />
                <span className="font-mono text-xs text-gray-400">{statusMsg}</span>
              </>
            ) : (
              <>
                <span className="text-uv-yellow text-sm shrink-0">✓</span>
                <span className="font-mono text-xs text-gray-400">{statusMsg}</span>
                <span className="ml-auto text-xs text-gray-600">{wallets.length} wallets found</span>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-950/50 border border-red-900/50 rounded-lg text-sm text-red-400 font-mono">
            ✗ {error}
          </div>
        )}

        {hasResults && (
          <>
            <StatsBar wallets={wallets} />
            {activeWallets.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-uv-yellow uppercase tracking-[0.15em]">Active traders</span>
                  <span className="flex-1 h-px bg-uv-border" />
                  <span className="text-xs text-gray-600 font-mono">{activeWallets.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {activeWallets.map(w => <WalletCard key={w.address} wallet={w} />)}
                </div>
              </div>
            )}
            {watchingWallets.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-gray-600 uppercase tracking-[0.15em]">Watching</span>
                  <span className="flex-1 h-px bg-uv-border" />
                  <span className="text-xs text-gray-600 font-mono">{watchingWallets.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {watchingWallets.map(w => <WalletCard key={w.address} wallet={w} />)}
                </div>
              </div>
            )}
          </>
        )}

        {state === "idle" && (
          <div className="text-center py-16">
            <div className="relative w-16 h-16 mx-auto mb-4 opacity-20">
              <Image src="/logo.jpg" alt="" fill className="object-contain" />
            </div>
            <p className="text-sm text-gray-700 font-mono">AWAITING TARGET WALLET</p>
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-uv-border flex justify-between items-center">
          <span className="text-xs text-gray-700 font-mono">UN/VEIL</span>
          <span className="text-xs text-gray-700 font-mono">POWERED BY HELIUS</span>
        </footer>
      </div>
    </div>
  );
}

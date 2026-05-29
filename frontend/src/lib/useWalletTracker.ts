"use client";
import { useCallback, useRef, useState } from "react";

export type HeldToken = {
  mint: string;
  symbol: string;
  name: string;
  image: string | null;
  uiAmount: number;
  priceUsd: number | null;
  valueUsd: number | null;
};

export type WalletResult = {
  address: string;
  depth: 1 | 2 | 3;
  trail: string[];
  swapCount: number;
  solBalance: number;
  tradedTokens: string[];
  heldTokens: HeldToken[];
  pnlEstimate: number;
  isActive: boolean;
  lastActive: string | null;
  status: "active" | "watching";
  txCount: number;
};

export type TrackState = "idle" | "scanning" | "done" | "error";

export function useWalletTracker() {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<TrackState>("idle");
  const [wallets, setWallets] = useState<WalletResult[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const track = useCallback((address: string) => {
    if (ws.current) ws.current.close();
    setWallets([]);
    setError("");
    setState("scanning");
    setStatusMsg("Connecting…");

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => socket.send(JSON.stringify({ type: "track", address }));

    socket.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.type === "status") setStatusMsg(msg.message);
      if (msg.type === "wallet") {
        setWallets(prev => {
          if (prev.find(w => w.address === msg.data.address)) return prev;
          return [...prev, msg.data];
        });
      }
      if (msg.type === "done")  { setState("done");  setStatusMsg("Scan complete"); }
      if (msg.type === "error") { setState("error"); setError(msg.message); }
    };

    socket.onerror = () => { setState("error"); setError("Could not connect to backend. Is it running?"); };
    socket.onclose = () => { if (state === "scanning") setState("done"); };
  }, []);

  const reset = useCallback(() => {
    ws.current?.close();
    setState("idle");
    setWallets([]);
    setStatusMsg("");
    setError("");
  }, []);

  return { track, reset, state, wallets, statusMsg, error };
}

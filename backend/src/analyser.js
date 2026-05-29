import { EXCHANGE_ADDRESSES, DEX_PROGRAM_IDS } from "./blocklist.js";
import { getTransactionHistory, getSolBalance, getHeldTokens } from "./helius.js";

const MIN_TRANSFER_SOL = 0.01;
const MIN_SOL_BALANCE  = 0.05;
const MAX_DEPTH        = 3;
const MIN_OUTFLOW_PCT  = 30; // ignore transfers below 30% of total outflow

export async function analyseWallet(
  address,
  apiKey,
  depth        = 1,
  trail        = [],
  emit,
  parentTokens = [],   // traded tokens of the wallet that sent funds here
  sweepData    = null  // { outflowPct, balanceDrainPct, transferTimestamp }
) {
  if (depth > MAX_DEPTH) return;
  if (EXCHANGE_ADDRESSES.has(address)) return;

  emit({ type: "status", message: `Scanning ${shorten(address)} (depth ${depth})…` });

  let txs;
  try {
    txs = await getTransactionHistory(address, apiKey, 100);
  } catch (e) {
    emit({ type: "error", message: `Failed to fetch txs for ${shorten(address)}: ${e.message}` });
    return;
  }

  const swapTxs      = txs.filter(tx => isDexSwap(tx));
  const tradedTokens = extractTradedTokens(swapTxs);
  const pnlEstimate  = estimatePnl(swapTxs);
  const lastTx       = txs[0];
  const lastActive   = lastTx ? new Date(lastTx.timestamp * 1000) : null;
  const isActive     = swapTxs.length > 0 &&
    lastActive &&
    (Date.now() - lastActive.getTime()) < 24 * 60 * 60 * 1000;

  const [solBal, heldTokens] = await Promise.all([
    getSolBalance(address, apiKey).catch(() => 0),
    getHeldTokens(address, apiKey).catch(() => []),
  ]);

  // --- Confidence score (only meaningful for depth > 1) ---
  let confidence = null;
  if (depth > 1 && sweepData) {
    // Token overlap: how many tokens does this wallet trade that the parent also trades?
    const tokenOverlap = tradedTokens.filter(t => parentTokens.includes(t)).length;

    // Timing: did this wallet start trading shortly after receiving the funds?
    const transferTs = sweepData.transferTimestamp;
    const firstSwapAfter = swapTxs
      .map(tx => tx.timestamp)
      .filter(ts => ts > transferTs)
      .sort((a, b) => a - b)[0] ?? null;
    const tradedQuicklyHours = firstSwapAfter !== null
      ? (firstSwapAfter - transferTs) / 3600
      : null;

    confidence = computeConfidence({
      outflowPct:      sweepData.outflowPct,
      balanceDrainPct: sweepData.balanceDrainPct,
      tokenOverlap,
      tradedQuicklyHours,
    });
  }

  if (solBal < MIN_SOL_BALANCE && depth > 1) {
    emit({ type: "status", message: `Skipping empty wallet ${shorten(address)}` });
  } else if (swapTxs.length > 0 || depth === 1) {
    emit({
      type: "wallet",
      data: {
        address,
        depth,
        trail:        [...trail],
        swapCount:    swapTxs.length,
        solBalance:   solBal,
        tradedTokens,
        heldTokens,
        pnlEstimate,
        isActive,
        lastActive:   lastActive?.toISOString() ?? null,
        status:       isActive ? "active" : "watching",
        txCount:      txs.length,
        confidence,
      },
    });
  }

  // Detect sweep targets from this wallet and recurse
  const sweepTargets = detectSweepTargets(txs, address, solBal);

  for (const target of sweepTargets) {
    if (EXCHANGE_ADDRESSES.has(target.address)) {
      emit({ type: "status", message: `Skipping exchange: ${shorten(target.address)}` });
      continue;
    }
    emit({
      type: "status",
      message: `Following sweep → ${shorten(target.address)} (${target.outflowPct.toFixed(0)}% of outflow)`,
    });
    await sleep(300);
    await analyseWallet(
      target.address,
      apiKey,
      depth + 1,
      [...trail, address],
      emit,
      tradedTokens,
      {
        outflowPct:       target.outflowPct,
        balanceDrainPct:  target.balanceDrainPct,
        transferTimestamp: target.transferTimestamp,
      }
    );
  }
}

// ─── Sweep detection ────────────────────────────────────────────────────────
// Returns destinations that received >= MIN_OUTFLOW_PCT of the wallet's total
// outflow — i.e. significant fund relocations, not noise payments.

function detectSweepTargets(txs, fromAddress, currentSolBalance) {
  const targets    = new Map();
  let totalOutflow = 0;

  for (const tx of txs) {
    for (const transfer of tx.nativeTransfers ?? []) {
      if (transfer.fromUserAccount !== fromAddress) continue;
      const to = transfer.toUserAccount;
      if (!to || to === fromAddress) continue;
      const sol = transfer.amount / 1e9;
      if (sol < MIN_TRANSFER_SOL) continue;
      totalOutflow += sol;
      const prev = targets.get(to);
      targets.set(to, {
        solSent:           (prev?.solSent ?? 0) + sol,
        // Keep the latest transfer timestamp for timing correlation
        transferTimestamp: Math.max(prev?.transferTimestamp ?? 0, tx.timestamp ?? 0),
      });
    }
  }

  // estimatedTotal ≈ what the wallet held before it started sending
  const estimatedTotal = currentSolBalance + totalOutflow;

  return [...targets.entries()]
    .map(([address, d]) => ({
      address,
      solSent:           d.solSent,
      outflowPct:        totalOutflow > 0 ? (d.solSent / totalOutflow) * 100 : 0,
      balanceDrainPct:   estimatedTotal > 0 ? (d.solSent / estimatedTotal) * 100 : 0,
      transferTimestamp: d.transferTimestamp,
    }))
    .filter(t => t.outflowPct >= MIN_OUTFLOW_PCT)
    .sort((a, b) => b.outflowPct - a.outflowPct); // highest concentration first
}

// ─── Confidence scoring ──────────────────────────────────────────────────────
// Combines four signals into a 0–100 score.

function computeConfidence({ outflowPct, balanceDrainPct, tokenOverlap, tradedQuicklyHours }) {
  let score = 0;

  // 1. Sweep concentration — what % of total outflow went to this one address (0–40 pts)
  if (outflowPct >= 80)      score += 40;
  else if (outflowPct >= 60) score += 28;
  else if (outflowPct >= 40) score += 16;
  else                       score +=  6; // 30–40 %

  // 2. Balance drain — what % of the wallet's estimated total SOL moved here (0–30 pts)
  if (balanceDrainPct >= 90)      score += 30;
  else if (balanceDrainPct >= 70) score += 20;
  else if (balanceDrainPct >= 50) score += 12;
  else if (balanceDrainPct >= 30) score +=  5;

  // 3. Token overlap — same meme coins traded by both wallets (0–20 pts)
  if (tokenOverlap >= 3)      score += 20;
  else if (tokenOverlap >= 2) score += 13;
  else if (tokenOverlap >= 1) score +=  6;

  // 4. Timing — started trading quickly after receiving funds (0–10 pts)
  if (tradedQuicklyHours !== null) {
    if (tradedQuicklyHours <= 6)       score += 10;
    else if (tradedQuicklyHours <= 24) score +=  5;
  }

  return Math.min(100, Math.round(score));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDexSwap(tx) {
  return (tx.instructions ?? []).some(ix => DEX_PROGRAM_IDS.has(ix.programId));
}

function extractTradedTokens(swapTxs) {
  const tokens = new Set();
  for (const tx of swapTxs) {
    for (const transfer of tx.tokenTransfers ?? []) {
      if (transfer.mint) tokens.add(transfer.mint);
    }
  }
  return [...tokens].slice(0, 8);
}

function estimatePnl(swapTxs) {
  let sol = 0;
  for (const tx of swapTxs) {
    for (const t of tx.nativeTransfers ?? []) {
      sol += t.amount / 1e9;
    }
  }
  return Math.round(sol * 100) / 100;
}

function shorten(addr) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

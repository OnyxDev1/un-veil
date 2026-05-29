import { EXCHANGE_ADDRESSES, DEX_PROGRAM_IDS } from "./blocklist.js";
import { getTransactionHistory, getSolBalance, getHeldTokens } from "./helius.js";

const MIN_TRANSFER_SOL = 0.01;
const MIN_SOL_BALANCE  = 0.05;
const MAX_DEPTH        = 3;

export async function analyseWallet(address, apiKey, depth = 1, trail = [], emit) {
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

  const transferTargets = detectTransfers(txs, address);
  const swapTxs         = txs.filter(tx => isDexSwap(tx));
  const tradedTokens    = extractTradedTokens(swapTxs);
  const pnlEstimate     = estimatePnl(swapTxs);
  const lastTx          = txs[0];
  const lastActive      = lastTx ? new Date(lastTx.timestamp * 1000) : null;
  const isActive        = swapTxs.length > 0 &&
    lastActive &&
    (Date.now() - lastActive.getTime()) < 24 * 60 * 60 * 1000;

  const [solBal, heldTokens] = await Promise.all([
    getSolBalance(address, apiKey).catch(() => 0),
    getHeldTokens(address, apiKey).catch(() => []),
  ]);

  if (solBal < MIN_SOL_BALANCE && depth > 1) {
    emit({ type: "status", message: `Skipping empty wallet ${shorten(address)}` });
  } else if (swapTxs.length > 0 || depth === 1) {
    emit({
      type: "wallet",
      data: {
        address,
        depth,
        trail: [...trail],
        swapCount:    swapTxs.length,
        solBalance:   solBal,
        tradedTokens,
        heldTokens,
        pnlEstimate,
        isActive,
        lastActive:   lastActive?.toISOString() ?? null,
        status:       isActive ? "active" : "watching",
        txCount:      txs.length,
      },
    });
  }

  for (const target of transferTargets) {
    if (EXCHANGE_ADDRESSES.has(target)) {
      emit({ type: "status", message: `Skipping exchange: ${shorten(target)}` });
      continue;
    }
    await sleep(300);
    await analyseWallet(target, apiKey, depth + 1, [...trail, address], emit);
  }
}

function detectTransfers(txs, fromAddress) {
  const targets = new Map();
  for (const tx of txs) {
    for (const transfer of tx.nativeTransfers ?? []) {
      if (transfer.fromUserAccount !== fromAddress) continue;
      const to = transfer.toUserAccount;
      if (!to || to === fromAddress) continue;
      const solAmount = transfer.amount / 1e9;
      if (solAmount < MIN_TRANSFER_SOL) continue;
      targets.set(to, (targets.get(to) ?? 0) + solAmount);
    }
  }
  return [...targets.keys()];
}

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

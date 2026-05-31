import fetch from "node-fetch";

const RPC = "https://mainnet.helius-rpc.com";

// ─── Round-robin key rotation ─────────────────────────────────────────────────
let _keys = [];
let _cursor = 0;

export function initKeys(keys) {
  _keys = keys.filter(Boolean);
  if (_keys.length === 0) throw new Error("No Helius API keys configured");
  console.log(`Helius: ${_keys.length} key(s) loaded`);
}

function nextKey() {
  const key = _keys[_cursor % _keys.length];
  _cursor++;
  return key;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rpcUrl(key) {
  return `${RPC}/?api-key=${key}`;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export async function getTransactionHistory(address, _ignored, limit = 100) {
  const key = nextKey();
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Helius error: ${res.status} — ${text}`);
  }
  return res.json();
}

export async function getSolBalance(address, _ignored) {
  const key = nextKey();
  const res = await fetch(rpcUrl(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "sol",
      method: "getBalance",
      params: [address],
    }),
  });
  const data = await res.json();
  return (data.result?.value ?? 0) / 1e9;
}

export async function getHeldTokens(address, _ignored) {
  const key = nextKey();
  const res = await fetch(rpcUrl(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "assets",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: address,
        page: 1,
        limit: 50,
        displayOptions: {
          showFungible: true,
          showNativeBalance: false,
        },
      },
    }),
  });
  const data = await res.json();
  const items = data.result?.items ?? [];

  return items
    .filter(item => {
      const isFungible = item.interface === "FungibleToken" || item.interface === "FungibleAsset";
      const balance = item.token_info?.balance ?? 0;
      const decimals = item.token_info?.decimals ?? 0;
      const uiAmount = balance / Math.pow(10, decimals);
      return isFungible && uiAmount > 0;
    })
    .map(item => ({
      mint: item.id,
      symbol: item.token_info?.symbol ?? item.content?.metadata?.symbol ?? "???",
      name: item.content?.metadata?.name ?? "",
      image: item.content?.links?.image ?? item.content?.files?.[0]?.uri ?? null,
      uiAmount: (item.token_info?.balance ?? 0) / Math.pow(10, item.token_info?.decimals ?? 0),
      priceUsd: item.token_info?.price_info?.price_per_token ?? null,
      valueUsd: item.token_info?.price_info?.total_price ?? null,
    }))
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .slice(0, 10);
}

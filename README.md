# Wallet Radar

Track Solana wallets, detect fund sweeps, and surface active meme traders — in real time.

## How it works

1. You paste a wallet address
2. Backend fetches its full transaction history via Helius
3. Detects "sweep" transactions — when 80%+ of funds move to a single new address
4. Filters out known exchange addresses (Binance, Coinbase, etc.)
5. If the destination wallet is trading on DEXes (Raydium, Jupiter, Pump.fun), it gets flagged
6. Recursively follows the trail up to depth 3

## Project structure

```
wallet-radar/
  backend/    — Node.js + Express + WebSocket server
  frontend/   — Next.js 14 app
```

## Setup

### 1. Get a Helius API key

Sign up free at https://helius.dev — the free tier gives 100k credits/month, enough for development.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and paste your HELIUS_API_KEY
npm install
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Frontend runs on http://localhost:3000

## Environment variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `HELIUS_API_KEY` | Your Helius API key (required) |
| `PORT` | Server port (default: 3001) |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WS_URL` | WebSocket URL of backend (default: ws://localhost:3001) |

## Depth levels

| Depth | Colour | Meaning |
|---|---|---|
| 1 | Red | Direct recipient of a sweep from the tracked wallet |
| 2 | Amber | One hop away |
| 3 | Teal | Two hops away |

## Adding more exchange addresses

Edit `backend/src/blocklist.js` and add addresses to `EXCHANGE_ADDRESSES`. Good sources:
- https://etherscan.io/labelcloud (cross-reference with Solscan)
- https://github.com/duneanalytics/spellbook

## Deploying

**Backend**: Deploy to Railway, Render, or any Node.js host. Set `HELIUS_API_KEY` as an env var. Make sure WebSocket connections are supported (Railway supports them natively).

**Frontend**: Deploy to Vercel. Set `NEXT_PUBLIC_WS_URL` to your deployed backend URL (use `wss://` for production).

## Tech stack

- **Backend**: Node.js, Express, ws (WebSocket), Helius API
- **Frontend**: Next.js 14, React, Tailwind CSS, native WebSocket API

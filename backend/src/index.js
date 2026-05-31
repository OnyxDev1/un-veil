import "dotenv/config";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { analyseWallet } from "./analyser.js";
import { initKeys } from "./helius.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT ?? 3001;

// Load up to 3 Helius API keys for round-robin rotation
initKeys([
  process.env.HELIUS_API_KEY_1,
  process.env.HELIUS_API_KEY_2,
  process.env.HELIUS_API_KEY_3,
]);

app.get("/health", (_, res) => res.json({ ok: true }));

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type !== "track") return;

    const address = msg.address?.trim();
    if (!address || address.length < 32) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid Solana address" }));
      return;
    }

    function emit(event) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(event));
      }
    }

    emit({ type: "start", address });

    try {
      await analyseWallet(address, null, 1, [], emit);
      emit({ type: "done" });
    } catch (e) {
      emit({ type: "error", message: e.message });
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

server.listen(PORT, () => {
  console.log(`Wallet Radar backend running on port ${PORT}`);
});

import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { submitOrderToEngine } from "./engineClient.js";
import { buildDemoOrder, ACCOUNT_MAP } from "./orderSamples.js";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.send({
    ok: true,
    message: "RSR Engine demo is running",
    endpoints: ["/health", "/orders/engine/demo", "/orders/engine (POST)"]
  });
});

app.get("/health", (_req, res) => {
  res.send({ ok: true, env: { STORE_NAME: process.env.STORE_NAME ? "set" : "missing", RS_GROUP_API_KEY: process.env.RS_GROUP_API_KEY ? "set" : "missing" } });
});

/**
 * GET /orders/engine/demo
 * Optional query params:
 *  - account=99901|99902 (your provided test mapping; we record it in PONum)
 *  - po=custom-po
 */
app.get("/orders/engine/demo", async (req, res) => {
  try {
    const account = String(req.query.account || "99901");
    const mapped = ACCOUNT_MAP[account] || "unknown";
    const po = String(req.query.po || `PO-${account}-${Date.now()}`);

    const payload = buildDemoOrder({
      storeName: process.env.STORE_NAME,
      poNum: po
    });

    // Add visible mapping to the PO for quick validation in logs (no functional effect)
    payload.PONum = `${po}-ACC${account}-MAP${mapped}`;

    const result = await submitOrderToEngine(payload);
    res.status(200).send({ ok: true, sent: payload, result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ ok: false, error: String(err?.message || err) });
  }
});

/**
 * POST /orders/engine
 * Body: full payload matching the Engine schema
 */
app.post("/orders/engine", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).send({ ok: false, error: "Invalid JSON body" });
    }
    const result = await submitOrderToEngine(payload);
    res.status(200).send({ ok: true, sent: payload, result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ ok: false, error: String(err?.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`[rsr-engine-demo] listening on port ${PORT}`);
});

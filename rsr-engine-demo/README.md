# RSR Engine Order Demo (Replit-ready)

This tiny Node/Express app submits an order **to your Engine endpoint**, which then forwards to RSR. It mirrors the payload your Next.js hook builds.

## What it does

- Starts an Express server
- Provides a **demo route** to send a test order to your Engine
- Provides a **POST route** where you can send your own payload (JSON)

## Environment variables

Create a **.env** in Replit with at least:

```
RS_GROUP_API_KEY=your-engine-api-key-here
STORE_NAME=THE GUN FIRM
ENGINE_ORDER_URL=https://engine.thegunfirmapp.com/webhook/api/rsr/create-order
PORT=3000
# Optional: fallback FFL license if you don't attach a dealer in your test payload
FFL_FALLBACK=1-23-45678
```

> **Note:** In your existing project, we saw related keys like `RS_GROUP_API_KEY`, `STORE_NAME`, etc. Use those names here as well. Do **not** paste secrets into source control.

## Run on Replit

1. Create a new **Node.js** Repl.
2. Upload these files or import this project zip.
3. Add the **.env** values above (left sidebar → Secrets / Environment).
4. Click **Run**.

You should see:
```
[rsr-engine-demo] listening on port 3000
```

## Test it

### Demo order (GET)

Open this in the Replit webview or your browser:

```
/orders/engine/demo?account=99901
```

- `account` supports your test mapping: `99901 -> 60742`, `99902 -> 63824`.
- We record the mapping in the `PONum` for easy log verification.

### Custom order (POST)

Send your own JSON payload matching the Engine schema:

```bash
curl -X POST "http://localhost:3000/orders/engine" \
  -H "Content-Type: application/json" \
  -d '{
    "Storename": "THE GUN FIRM",
    "ShipAddress": "123 Main St",
    "ShipAddress2": "",
    "ShipCity": "Phoenix",
    "ShipState": "AZ",
    "ShipZip": "85001",
    "ShipToStore": "N",
    "ShipAcccount": "",
    "ShipFFL": "1-23-45678",
    "ContactNum": "0000000000",
    "POS": "I",
    "PONum": "PO-TEST-12345",
    "Email": "orders@example.com",
    "Items": [{ "PartNum": "SPXDD9801HC-2-TIGERSCT", "WishQTY": 1 }],
    "FillOrKill": 1
  }'
```

The app will forward this to your Engine with the required `TGF-API-KEY` header.

## Notes & gotchas

- The request key **`ShipAcccount`** is spelled with **three** `c` characters to match your existing code. Keep it consistent unless you change the Engine as well.
- In production, avoid using fallback FFLs. Attach a real `fflDealer` and use that license/address.
- Direct-to-RSR ordering is **not** included here since your current flow submits to the Engine. You can add it later once the endpoint & schema are confirmed.

## Files

- `index.js` — Express server and routes
- `engineClient.js` — Axios client for Engine
- `orderSamples.js` — builder for demo payloads + the 99901/99902 mapping
- `.env.example` — environment var template
- `package.json` — deps & start script
- `.replit` — tells Replit how to run
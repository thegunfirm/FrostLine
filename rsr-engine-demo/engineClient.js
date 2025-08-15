import axios from "axios";

/**
 * Posts an order to your Engine, which then submits to RSR.
 * Auth is via the 'TGF-API-KEY' header (RS_GROUP_API_KEY env var).
 */
export async function submitOrderToEngine(orderPayload) {
  const url = process.env.ENGINE_ORDER_URL || "https://engine.thegunfirmapp.com/webhook/api/rsr/create-order";
  const apiKey = process.env.RS_GROUP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RS_GROUP_API_KEY env var");
  }

  const headers = {
    "Content-Type": "application/json",
    "TGF-API-KEY": apiKey
  };

  const { data } = await axios.post(url, orderPayload, { headers, timeout: 30000 });
  return data;
}
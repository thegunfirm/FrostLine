// /scripts/check-summary.js
// Usage examples:
//   node scripts/check-summary.js https://<your-frostline-host> 129
//   node scripts/check-summary.js http://localhost:<port> 129

const BASE = process.argv[2];
const ORDER_ID = process.argv[3];

if (!BASE || !ORDER_ID) {
  console.error("Usage: node scripts/check-summary.js <BASE_URL> <ORDER_ID>");
  process.exit(1);
}

(async () => {
  const url = `${BASE}/api/orders/${encodeURIComponent(ORDER_ID)}/summary`;

  try {
    const res = await fetch(url);
    const text = await res.text();

    console.log("GET summary status:", res.status);
    console.log("GET summary raw:", text);

    let j;
    try { j = JSON.parse(text); } catch {
      console.log("JSON parse failed (HTML or non-JSON).");
      process.exit(0);
    }

    // Minimal contract checks for the frozen page
    const hasOrderNumber =
      typeof j.orderNumber === "string" && j.orderNumber.includes("-");
    const hasLines = Array.isArray(j.lines) && j.lines.length > 0;
    const first = hasLines ? j.lines[0] : null;

    const qtyOK = !!first && typeof first.qty === "number";
    const priceOK = !!first && first.pricingSnapshot && typeof first.pricingSnapshot.retail === "number";
    const imgOK = !!first && first.product && first.product.image && typeof first.product.image.url === "string" && first.product.image.url.length > 0;

    console.log("ASSERT orderNumber (minted, with -0 or -Z*):", hasOrderNumber);
    console.log("ASSERT lines[0].qty (number):", qtyOK);
    console.log("ASSERT lines[0].pricingSnapshot.retail (number):", priceOK);
    console.log("ASSERT lines[0].product.image.url (string):", imgOK);

  } catch (e) {
    console.error("Request failed:", e.message);
  }
})();
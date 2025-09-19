// client/src/lib/finalizeOrder.ts
type CartLine = {
  upc: string;            // REQUIRED (your search key)
  mpn?: string;           // nice-to-have
  sku?: string;           // not used for biz logic but kept if present
  name: string;
  qty: number;
  price: number;          // unit price charged
};

type Customer = { email: string; name?: string };

export async function finalizeOrder(opts: {
  orderId: string | number;            // the id you already use in ?orderId=
  txnId: string;                       // Authorize.net transaction id
  status?: 'processing'|'paid'|'fulfilled'|'canceled';
  shippingOutcomes?: ('IH>Customer'|'DS>FFL'|'IH>FFL'|'DS>Customer')[];
  lines: CartLine[];
  customer: Customer;
}) {
  const {
    orderId, txnId, lines, customer,
    status = 'processing',
    shippingOutcomes = ['IH>Customer'],
  } = opts;

  // Minimal shape the server expects; no images required.
  const payload = {
    txnId,
    status,
    customer,
    shippingOutcomes,
    items: lines.map(l => ({
      upc: String(l.upc),
      mpn: l.mpn ? String(l.mpn) : '',
      sku: l.sku ? String(l.sku) : '',
      name: String(l.name),
      qty: Number(l.qty || 1),
      price: Number(l.price || 0),
      imageUrl: '/images/placeholder.jpg' // ignored by business logic
    }))
  };

  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(()=>'');
    throw new Error(`snapshot failed ${res.status}: ${err}`);
  }

  // Redirect the buyer to the frozen confirmation page
  window.location.href = `/order-confirmation?orderId=${encodeURIComponent(String(orderId))}`;
}
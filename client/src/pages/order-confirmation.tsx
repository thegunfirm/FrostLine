/* client/src/pages/order-confirmation.tsx
Customer-facing Order Confirmation with full item details and tier savings.
IMPORTANT: This page intentionally DOES NOT read or display SKU anywhere.

Safe guarantees:

Does NOT import product or FFL components.

Does NOT call Algolia or Inventory from the browser.

Reads a single order payload from your server summary endpoint(s).
*/

import React from 'react';

type TierMap = Record<string, number>;
type TierLabels = Record<string, string>;

type PricingSnapshot = {
  retail?: number;
  tiers?: TierMap; // e.g., { guest: 1000, bronze: 980, gold: 950, platinum: 930 }
};

type ProductSnapshot = {
  name?: string;
  imageUrl?: string;
  // NOTE: No SKU usage in UI. Only keep typed fields used below.
  upc?: string; // may also arrive as upc_code/UPC; UI normalizes
  mpn?: string; // manufacturer part number (aka MPN/MNP); UI normalizes
  manufacturerPart?: string; // tolerant alias
};

type SummaryLine = {
  // sku?: string; // present from server is OK, but NOT used in UI
  qty: number;
  unitPricePaid?: number; // if available from server
  lineTotal?: number; // if available from server
  pricingSnapshot?: PricingSnapshot;
  productSnapshot?: ProductSnapshot;
};

type Shipment = {
  suffix?: 'A'|'B'|'C'|'D';
  outcome?: 'DS>FFL'|'DS>Customer'|'IH>FFL'|'IH>Customer'|string;
  lines: SummaryLine[];
  ffl?: { id?: string; name?: string; address1?: string; city?: string; state?: string; zip?: string; };
};

type Totals = { items: number; shipping: number; tax: number; grand: number; };

type Savings = {
  actual: number; // what they DID save at current tier vs Retail
  potential: number; // what they COULD have saved at a higher tier
  byTier?: Record<string, number>;
};

type OrderSummary = {
  orderId: string;
  baseNumber?: string;
  displayNumber?: string; // e.g., "123456-0" or "123456-Z"
  status?: string; // e.g., "processing"
  pipeline?: string; // e.g., "Qualification"
  paymentId?: string; // ANet transaction id; may be "transactionId" in your API
  membershipTier?: string|null; // "Guest" | "Bronze" | "Gold" | "Platinum" | etc.
  tierLabels?: TierLabels; // { gold: "Gold", platinum: "Platinum", ... }
  shipments?: Shipment[]; // present when "-Z"; else may be omitted
  lines?: SummaryLine[]; // present when "-0"
  totals: Totals;
  createdAt?: string;
  savings?: Savings; // server-computed; UI will compute if missing and possible
};

function useQueryParam(key: string): string | null {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const params = new URLSearchParams(search);
  return params.get(key);
}

// Normalize possibly-missing/renamed fields:
function getUPC(p?: ProductSnapshot): string | undefined {
  if (!p) return undefined;
  return p.upc || (p as any).UPC || (p as any).upc_code || undefined;
}
function fmtMoney(v?: number): string {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

// If server didn't compute savings, compute minimally from pricingSnapshot:
function computeSavingsClient(summary: OrderSummary): Savings | undefined {
  const tier = summary.membershipTier ?? 'Guest';
  const lines = summary.shipments?.flatMap(s => s.lines) ?? summary.lines ?? [];
  let actual = 0;
  let potential = 0;

  for (const line of lines) {
    const q = line.qty || 0;
    const snap = line.pricingSnapshot || {};
    const retail = snap.retail ?? undefined;
    const tiers = snap.tiers ?? {};

    // Paid unit: prefer explicit unitPricePaid → else tier price → else retail
    const paidUnit = (typeof line.unitPricePaid === 'number')
      ? line.unitPricePaid
      : (typeof tiers[tier] === 'number' ? tiers[tier] : (retail ?? 0));
    const tierValues = Object.values(tiers).filter(v => typeof v === 'number');
    const bestUnit = tierValues.length ? Math.min(...tierValues) : (retail ?? paidUnit);

    if (typeof retail === 'number') {
      actual += Math.max(0, retail - paidUnit) * q;
    }
    potential += Math.max(0, paidUnit - bestUnit) * q;
  }
  if (actual === 0 && potential === 0) return undefined;
  actual = Math.round(actual * 100) / 100;
  potential = Math.round(potential * 100) / 100;
  return { actual, potential };
}

const OrderConfirmationPage: React.FC = () => {
  const qpOrderId = useQueryParam('orderId');
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<OrderSummary | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const orderId = qpOrderId || window.location.pathname.split('/').filter(Boolean).pop();
        if (!orderId) throw new Error('Missing orderId');

        // Try summary endpoint first, then fallback to a generic order endpoint
        const tryUrls = [
          `/api/orders/${encodeURIComponent(orderId)}/summary`,
          `/api/orders/${encodeURIComponent(orderId)}`
        ];
        let data: OrderSummary | null = null;
        for (const url of tryUrls) {
          // Force fresh responses to avoid 304 issues
          const cacheUrl = `${url}?t=${Date.now()}`;
          const res = await fetch(cacheUrl, { credentials: 'include', cache: 'no-store' });
          if ((res.ok || res.status === 304) && res.headers.get('content-type')?.includes('application/json')) {
            const rawData = await res.json();
            
            // Normalize server fields to match frontend expectations
            if (rawData) {
              // Map orderNumber to displayNumber if needed
              if (!rawData.displayNumber && rawData.orderNumber) {
                rawData.displayNumber = rawData.orderNumber;
              }
              
              // Map totals fields if needed
              if (rawData.totals?.subtotal !== undefined) {
                rawData.totals = {
                  items: rawData.totals.subtotal,
                  shipping: rawData.totals.shipping ?? 0,
                  tax: rawData.totals.tax ?? 0,
                  grand: rawData.totals.grandTotal ?? (rawData.totals.subtotal + (rawData.totals.shipping || 0) + (rawData.totals.tax || 0))
                };
              }
              
              // Map product fields for lines
              const mapLines = (lines: any[]) => {
                return lines?.map(line => {
                  if (line.product && !line.productSnapshot) {
                    line.productSnapshot = {
                      name: line.product.name || line.name,
                      imageUrl: line.product.imageUrl || line.product.image?.url || line.imageUrl,
                      upc: line.product.upc || line.upc,
                      mpn: line.product.mpn || line.mpn
                    };
                  }
                  return line;
                });
              };
              
              // Apply mapping to both shipments and direct lines
              if (rawData.shipments) {
                rawData.shipments = rawData.shipments.map((shipment: any) => ({
                  ...shipment,
                  lines: mapLines(shipment.lines)
                }));
              }
              if (rawData.lines) {
                rawData.lines = mapLines(rawData.lines);
              }
            }
            
            data = rawData;
            break;
          }
        }
        if (!data) throw new Error('Order not found or invalid response');

        if (!cancelled) setSummary(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [qpOrderId]);

  if (loading) return <div style={{ padding: 24 }}>Loading order…</div>;
  if (err) return <div style={{ padding: 24, color: 'crimson' }}>Error: {err}</div>;
  if (!summary) return <div style={{ padding: 24 }}>No order.</div>;

  const displayNumber = summary.displayNumber || summary.baseNumber || summary.orderId;
  const membershipTier = summary.membershipTier ?? 'Guest';
  const tierLabels = summary.tierLabels || {};
  const tierKey = (membershipTier || '').toLowerCase();
  const serverSavings = summary.savings;
  const clientSavings = computeSavingsClient(summary);
  const savings = serverSavings || clientSavings || undefined;

  const isSplit = Boolean(summary.shipments && summary.shipments.length);
  const txnId = summary.paymentId || (summary as any).transactionId || '';

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', fontFamily: 'system-ui, Arial, sans-serif' }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Order Confirmed</h1>
      <p style={{ marginTop: 6, color: '#2f6f2f' }}>
        Thank you for your purchase. Your payment has been processed successfully.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginTop: 16 }}>
        <div style={{ border: '1px solid #e3e3e3', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#666', fontSize: 12 }}>TGF Order Number</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{displayNumber}</div>
        </div>
        <div style={{ border: '1px solid #e3e3e3', borderRadius: 8, padding: 12 }}>
          <div style={{ color: '#666', fontSize: 12 }}>Order Status</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{summary.status || 'Processing'}</div>
          {summary.pipeline && <div style={{ color: '#777', fontSize: 12 }}>Pipeline: {summary.pipeline}</div>}
        </div>
      </div>


      {/* Items */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Order Items</h2>

        {isSplit ? (
          (summary.shipments || []).map((sh, idx) => {
            const shipmentSuffix = sh.suffix || String.fromCharCode(65 + idx);
            const fullOrderNumber = `${displayNumber.replace('-0', '')}-${shipmentSuffix}`;
            
            // Determine destination based on outcome
            let destinationText = '';
            let destinationAddress = null;
            if (sh.outcome === 'DS>FFL' || sh.outcome === 'IH>FFL') {
              if (sh.ffl) {
                destinationAddress = {
                  name: sh.ffl.name || 'FFL Dealer',
                  address1: sh.ffl.address1,
                  city: sh.ffl.city,
                  state: sh.ffl.state,
                  zip: sh.ffl.zip
                };
                destinationText = sh.outcome === 'IH>FFL' 
                  ? 'Ships to our warehouse first, then to FFL'
                  : 'Ships directly to FFL';
              } else {
                destinationText = 'Ships to FFL (dealer information pending)';
              }
            } else if (sh.outcome === 'DS>Customer' || sh.outcome === 'IH>Customer') {
              if (summary.customer?.address) {
                destinationAddress = {
                  name: `${summary.customer.firstName || ''} ${summary.customer.lastName || ''}`.trim() || 'Customer',
                  address1: summary.customer.address,
                  city: summary.customer.city,
                  state: summary.customer.state,
                  zip: summary.customer.zip
                };
                destinationText = sh.outcome === 'IH>Customer'
                  ? 'Ships from our warehouse'
                  : 'Ships directly to you';
              } else {
                destinationText = 'Ships to customer address';
              }
            }
            
            return (
              <div key={idx} style={{ border: '1px solid #e3e3e3', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ padding: '10px 12px', background: '#f2f2f2', borderBottom: '1px solid #e3e3e3', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Shipment {fullOrderNumber}</strong>
                    <span style={{ color: '#666', fontSize: 14 }}>{destinationText}</span>
                  </div>
                  {destinationAddress && (
                    <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
                      <strong>Destination:</strong> {destinationAddress.name}<br />
                      {destinationAddress.address1}<br />
                      {destinationAddress.city}, {destinationAddress.state} {destinationAddress.zip}
                    </div>
                  )}
                </div>
                <div>
                  {sh.lines.map((ln, i) => <ItemRow key={i} line={ln} membershipTier={membershipTier} tierLabels={tierLabels} />)}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ border: '1px solid #e3e3e3', borderRadius: 8 }}>
            {(summary.lines || []).map((ln, i) => <ItemRow key={i} line={ln} membershipTier={membershipTier} tierLabels={tierLabels} />)}
          </div>
        )}
      </div>

      {/* Totals */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
        <div>
          <h3 style={{ marginTop: 0 }}>What's Next?</h3>
          <ul style={{ marginTop: 6, color: '#444' }}>
            <li>You will receive an email confirmation shortly.</li>
            <li>Your order will be processed within 1–2 business days.</li>
            <li>For firearms purchases, items will be shipped to your selected FFL dealer.</li>
            <li>You'll receive tracking information once your order ships.</li>
          </ul>
        </div>
        <div style={{ border: '1px solid #e3e3e3', borderRadius: 8, padding: 12, background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6 }}>
            <div>Items</div><div>{fmtMoney(summary.totals?.items)}</div>
            <div>Shipping</div><div>{fmtMoney(summary.totals?.shipping)}</div>
            <div>Tax</div><div>{fmtMoney(summary.totals?.tax)}</div>
            {savings && savings.actual > 0 && (
              <>
                <div>Membership Savings</div><div>-{fmtMoney(savings.actual)}</div>
              </>
            )}
            <div style={{ borderTop: '1px solid #ddd', marginTop: 6 }} />
            <div style={{ fontWeight: 700 }}>Total Paid</div><div style={{ fontWeight: 700 }}>{fmtMoney(summary.totals?.grand)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ItemRow: React.FC<{ line: SummaryLine; membershipTier: string; tierLabels: TierLabels; }> = ({ line, membershipTier }) => {
  const p = line.productSnapshot || {};
  const name = p.name || 'Item';
  const img = p.imageUrl;
  const upc = getUPC(p) || '—';
  const qty = line.qty || 0;

  const tiers = line.pricingSnapshot?.tiers || {};
  const retail = line.pricingSnapshot?.retail;
  const paidUnit = typeof line.unitPricePaid === 'number'
    ? line.unitPricePaid
    : (typeof tiers[membershipTier] === 'number' ? tiers[membershipTier] : (retail ?? undefined));

  const lineTotal = typeof line.lineTotal === 'number'
    ? line.lineTotal
    : (typeof paidUnit === 'number' ? paidUnit * qty : undefined);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: 12, padding: 12, borderBottom: '1px solid #eee' }}>
      <div style={{ width: 84, height: 84, background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {img ? <img src={img} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ color: '#999' }}>No Image</span>}
      </div>
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div style={{ marginTop: 2, color: '#555', fontSize: 13 }}>
          <div>UPC: {upc}</div>
        </div>
        <div style={{ marginTop: 2, color: '#555', fontSize: 13 }}>
          Qty: {qty}
        </div>
      </div>
      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div>{typeof paidUnit === 'number' ? fmtMoney(paidUnit) : '—'}</div>
        <div style={{ color: '#777', fontSize: 12 }}>{typeof lineTotal === 'number' ? fmtMoney(lineTotal) : '—'}</div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
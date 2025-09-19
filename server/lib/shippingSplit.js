// /server/lib/shippingSplit.js
// Deterministic splitter for your four known outcomes.

const VALID = new Set(['DS>FFL', 'DS>Customer', 'IH>FFL', 'IH>Customer']);

function normalizeOutcome(s) {
  const v = String(s || '').trim();
  if (!VALID.has(v)) {
    throw new Error(`Invalid shipping outcome: ${v}`);
  }
  return v;
}

/**
 * Accepts an array with possible duplicates or unordered items,
 * returns a de-duped, stable order for suffix assignment.
 * Order: DS>FFL, DS>Customer, IH>FFL, IH>Customer (match your prior discussions).
 */
function splitOutcomes(arr) {
  const seen = new Set();
  const order = ['DS>FFL', 'DS>Customer', 'IH>FFL', 'IH>Customer'];
  for (const s of arr) seen.add(normalizeOutcome(s));
  return order.filter(o => seen.has(o));
}

export { splitOutcomes, normalizeOutcome };
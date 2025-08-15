/**
 * Sample helpers to build payloads that match your Engine's expected schema,
 * mirroring your Next.js hook.
 *
 * Important field names (copying exactly what your code uses):
 *  - Storename
 *  - ShipAddress, ShipAddress2, ShipCity, ShipState, ShipZip
 *  - ShipToStore ("Y" | "N")
 *  - ShipAcccount  <-- NOTE: spelled with 3 'c' characters in your code
 *  - ShipFFL
 *  - ContactNum
 *  - POS (often "I")
 *  - PONum
 *  - Email
 *  - Items: [{ PartNum, WishQTY }]
 *  - FillOrKill (0 | 1)
 */

export const ACCOUNT_MAP = {
  "99901": "60742", // test mapping provided by user
  "99902": "63824"
};

export function buildDemoOrder({
  storeName,
  poNum = "PO-DEMO",
  ffl = process.env.FFL_FALLBACK || "1-23-45678",
  shipToStore = "N",
  ship = {
    address1: "123 Main St",
    address2: "",
    city: "Phoenix",
    state: "AZ",
    zip: "85001"
  },
  items = [
    // Use a real PartNum when testing against Engine/RSR; this is an example
    { PartNum: "SPXDD9801HC-2-TIGERSCT", WishQTY: 1 }
  ]
} = {}) {
  return {
    Storename: storeName || process.env.STORE_NAME || "Default Store Name",
    ShipAddress: ship.address1,
    ShipAddress2: ship.address2,
    ShipCity: ship.city,
    ShipState: ship.state,
    ShipZip: ship.zip,
    ShipToStore: shipToStore,
    ShipAcccount: "", // mirror the exact key used by your code
    ShipFFL: ffl,
    ContactNum: "0000000000",
    POS: "I",
    PONum: poNum,
    Email: "orders@example.com",
    Items: items,
    FillOrKill: 1
  };
}
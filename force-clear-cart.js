// Run this in browser console to force clear cart
localStorage.removeItem('cart-storage');
localStorage.removeItem('cart_items');
console.log('Cart localStorage cleared');

// Also make API call to clear server cart
fetch('/api/cart/force-clear', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 10 })
}).then(r => r.json()).then(console.log);
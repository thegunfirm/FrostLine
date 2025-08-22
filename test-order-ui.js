// Test script to create a UI order with authentic products
// This simulates the actual UI workflow for testing

const puppeteer = require('puppeteer');

async function createTestOrder() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Opening website...');
    await page.goto('http://localhost:5000');
    
    // Wait for page to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    console.log('🔍 Searching for Glock product...');
    // Search for Glock
    const searchInput = await page.waitForSelector('input[placeholder*="search"], input[type="search"]', { timeout: 5000 });
    await searchInput.type('Glock 17 Gen5');
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForTimeout(2000);
    
    console.log('📦 Adding Glock to cart...');
    // Click first product result (assuming it's our Glock)
    const productLink = await page.waitForSelector('a[href*="product"]', { timeout: 5000 });
    await productLink.click();
    
    // Add to cart
    await page.waitForTimeout(1000);
    const addToCartBtn = await page.waitForSelector('button:contains("Add to Cart"), button[data-testid="add-to-cart"]', { timeout: 5000 });
    await addToCartBtn.click();
    
    console.log('🔍 Searching for accessory...');
    // Go back to search for accessory
    await page.goto('http://localhost:5000');
    await page.waitForSelector('input[placeholder*="search"], input[type="search"]', { timeout: 5000 });
    const searchInput2 = await page.$('input[placeholder*="search"], input[type="search"]');
    await searchInput2.clear();
    await searchInput2.type('Shield magazine extension');
    await searchInput2.press('Enter');
    
    await page.waitForTimeout(2000);
    
    console.log('📦 Adding accessory to cart...');
    // Add accessory to cart
    const productLink2 = await page.waitForSelector('a[href*="product"]', { timeout: 5000 });
    await productLink2.click();
    
    await page.waitForTimeout(1000);
    const addToCartBtn2 = await page.waitForSelector('button:contains("Add to Cart"), button[data-testid="add-to-cart"]', { timeout: 5000 });
    await addToCartBtn2.click();
    
    console.log('🛒 Going to cart...');
    // Go to cart
    const cartBtn = await page.waitForSelector('a[href*="cart"], button:contains("Cart")', { timeout: 5000 });
    await cartBtn.click();
    
    console.log('🔑 Starting checkout (will need manual intervention for login/forms)...');
    // Go to checkout
    const checkoutBtn = await page.waitForSelector('button:contains("Checkout")', { timeout: 5000 });
    await checkoutBtn.click();
    
    console.log('⏸️ Browser opened for manual completion. Please:');
    console.log('1. Register/login with fake customer data');
    console.log('2. Select FFL: BACK ACRE GUN WORKS (1-59-017-07-6F-13700)');
    console.log('3. Use test credit card: 4111111111111111, exp: 12/25, cvv: 123');
    console.log('4. Complete the order');
    console.log('5. Close browser when done');
    
    // Keep browser open for manual completion
    console.log('Press Ctrl+C in terminal when finished...');
    await new Promise(resolve => {
      process.on('SIGINT', resolve);
    });
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

createTestOrder().catch(console.error);
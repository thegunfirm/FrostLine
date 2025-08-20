# ACTUAL UI TEST - Step by Step Process

## Test Configuration
- **Customer**: Fake test user
- **Products**: Real RSR inventory (Glock 43X + ZAF accessories)
- **FFL**: Real FFL from database
- **Payment**: Sandbox Authorize.Net
- **RSR API**: No interaction

## Products to Add:
1. Glock 43X 9mm - $478.99 (SKU: GLOCK43X, ID: 153784)
2. ZAF Upper Parts Kit Gen 5 - $94.99 (SKU: ZAFUPK195, ID: 153693)
3. ZAF Upper Parts Kit Gen 1-3 - $85.49 (SKU: ZAF19UPK, ID: 153688)

**Total Order Value: $659.47**

## Step-by-Step UI Test Process:

### Step 1: Access Website
- Navigate to http://localhost:5000
- Verify homepage loads with product listings

### Step 2: Register Test User
- Click register/signup
- Email: uitest@example.com
- Password: TestPass123!
- First Name: John
- Last Name: TestUser
- Phone: 555-123-4567
- Tier: Gold

### Step 3: Navigate to Products
- Search for "Glock 43X" 
- Add to cart
- Search for "ZAF" accessories
- Add both accessories to cart

### Step 4: Review Cart
- Verify all 3 products in cart
- Check total = $659.47
- Proceed to checkout

### Step 5: Checkout Process
- Enter shipping information
- Select FFL dealer for firearm
- Enter payment information (test card)
- Complete order

### Step 6: Order Confirmation
- Verify TGF order number generated
- Check enhanced order details
- Review status information

### Step 7: Account Orders
- Navigate to account/orders
- Verify new order appears
- Check enhanced UI elements

### Step 8: Order Detail View
- Click on order for details
- Verify Zoho CRM data display
- Check pipeline progression

## Expected Enhanced UI Elements:
- TGF Order Numbers
- Order status progression
- Firearms compliance status
- Deal names from Zoho
- Pipeline stages
- Fulfillment information
- Estimated ship dates
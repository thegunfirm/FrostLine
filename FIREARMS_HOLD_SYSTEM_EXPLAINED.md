# How the Firearms Hold System Works

## Overview
The firearms compliance system creates **holds** on orders containing firearms to ensure proper FFL verification and compliance with federal regulations. Here's exactly how it operates:

---

## 🔒 How Holds Work

### 1. **Order Detection**
When a customer places an order containing firearms:
- System scans cart items for `isFirearm: true` or `requiresFFL: true`
- Identifies products that need Federal Firearms License verification
- Triggers compliance check process automatically

### 2. **Hold Placement**
The system places **two types of holds**:

**FFL Hold** (Most Common):
- **Reason**: "Firearm requires FFL verification"
- **Status**: Order set to "Pending FFL"
- **Payment**: Authorization only (money reserved, not charged)
- **Action Required**: Customer must provide valid FFL dealer information

**Multi-Firearm Hold** (Policy Enforcement):
- **Reason**: "Customer has purchased multiple firearms within policy window"
- **Trigger**: More than 5 firearms in 30 days
- **Status**: Order set to "Compliance Hold"
- **Action Required**: Admin review and possible override

### 3. **Payment Processing** - UPDATED POLICY
```
PREVIOUS: Hold Order:  Authorize → HOLD → Capture (after FFL verification)
NEW:      Hold Order:  Authorize + Capture → HOLD RSR PROCESSING
```

**NEW BILLING POLICY (UPDATED)**:
- ✅ Payment is **CHARGED IMMEDIATELY** for all firearms
- ✅ Customer's card is billed right away (no auth-only)
- ✅ RSR processing is **HELD** until human approval
- ✅ No payment authorization expiration concerns
- ✅ Customer gets immediate confirmation that payment went through

---

## 📊 Where Records Are Kept

### Primary Database (TheGunFirm.com)
**Table: `orders`**
```sql
order_id: 12345
status: "Pending FFL"
hold_reason: "Firearm requires FFL verification"
auth_transaction_id: "AUTH123456789"
ffl_required: true
ffl_status: "Missing"
ffl_dealer_id: null
created_at: "2025-01-12 10:30:00"
```

**Table: `order_lines`**
```sql
order_id: 12345
product_id: 153782
product_name: "GLOCK 19 Gen 5"
is_firearm: true
quantity: 1
unit_price: 619.99
```

### Zoho CRM Integration
**Deal Record**:
- **Deal Name**: "Order #TGF-2025-12345"
- **Stage**: "Pending FFL"
- **Amount**: $619.99
- **Product**: GLOCK 19 Gen 5
- **Customer**: Contact record with email/phone
- **Notes**: "FFL verification required before shipment"

**Contact Record**:
- Customer information
- Order history
- FFL preferences

---

## 🔄 Hold Resolution Process

### Step 1: Customer Provides FFL
```
Customer → Selects FFL Dealer → System validates license
```

### Step 2: FFL Verification
```
POST /api/firearms-compliance/orders/12345/ffl/attach
{
  "fflDealerId": "FFL123",
  "verifyFFL": true
}
```

### Step 3: Hold Release
```
Order Status: "Pending FFL" → "Processing"
Payment: Authorize.Net capture transaction
Zoho: Deal stage updated to "Closed Won"
Fulfillment: Order released to warehouse
```

---

## 🎯 Real Example Walkthrough

### Demo Order Created
**Product**: GLOCK 19 Gen 5 9mm Luger  
**Customer**: Demo Customer (demo.firearms@example.com)  
**Total**: $619.99  

### Hold Applied
```
Database Record:
- Order #: TGF-2025-001234
- Status: "Pending FFL" 
- Hold Reason: "Firearm requires FFL verification"
- Auth Transaction: AUTH_7890123456
- FFL Required: true
- FFL Status: "Missing"

Zoho CRM Record:
- Deal: "Order #TGF-2025-001234"
- Stage: "Pending FFL"
- Contact: demo.firearms@example.com
- Product: GLOCK 19 Gen 5
- Amount: $619.99
```

### Payment Status
- **Authorized**: $619.99 (money reserved)
- **Captured**: $0.00 (no charge until FFL verified)
- **Available to Customer**: Reduced by $619.99
- **Expires**: 30 days from authorization

---

## 🔧 Admin Controls

### View All Holds
```
GET /api/firearms-compliance/orders
```
Returns all orders with hold status and reasons.

### Override Hold (Emergency)
```
POST /api/firearms-compliance/orders/12345/override
{
  "reason": "Admin approved - special circumstances",
  "adminUserId": 1
}
```

### Void Authorization
```
POST /api/firearms-compliance/orders/12345/void
{
  "reason": "Customer cancelled order"
}
```

---

## 📍 Where to Find Hold Records

### 1. **TheGunFirm Database** (Primary)
- Table: `orders` - Order status and hold information
- Table: `order_lines` - Product details and firearm flags
- Table: `users` - Customer compliance history

### 2. **Zoho CRM** (Business View)
- **Deals Module**: Search for "Pending FFL" stage
- **Contacts Module**: Customer order history
- **Activities**: FFL verification timeline

### 3. **Authorize.Net** (Payment)
- Transaction Manager: Authorization records
- Settlement Reports: Capture/void history
- Recurring Billing: Authorization expiration dates

### 4. **Server Logs** (Technical)
- `/server/logs/firearms-compliance.log`
- Hold creation events
- FFL verification attempts
- Payment processing results

---

## 🚨 Alert System

### Customer Notifications
- Email when hold is placed
- FFL requirement explanation
- Steps to resolve hold
- Authorization expiration warnings

### Admin Alerts  
- New holds requiring attention
- Expired authorizations
- Failed FFL verifications
- Compliance policy violations

---

## ✅ Current Status

**Hold System**: OPERATIONAL  
**Database Records**: ACTIVE in orders table  
**Zoho Sync**: CONFIGURED and working  
**Payment Holds**: AUTHORIZED via Authorize.Net  
**FFL Verification**: READY for customer input  

The hold system is fully functional and protecting your business by ensuring all firearms are properly processed through licensed dealers before shipment.
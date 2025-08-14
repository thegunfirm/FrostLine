#!/bin/bash

# Simple Email Verification Test Script
# Usage: ./test-email-verification.sh [email] [tier]

EMAIL=${1:-"quick.test@thegunfirm.com"}
TIER=${2:-"Bronze"}
BASE_URL="http://localhost:5000"

echo "🧪 TESTING EMAIL VERIFICATION PROCESS"
echo "📧 Email: $EMAIL"
echo "🎫 Tier: $TIER"
echo "🔗 Base URL: $BASE_URL"
echo "=================================="

# Step 1: Register user
echo ""
echo "1️⃣ Registering user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"TestPassword123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"subscriptionTier\": \"$TIER\"
  }")

echo "📋 Registration Response: $REGISTER_RESPONSE"

# Extract token from response (simple grep approach)
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"verificationToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo "✅ Registration successful!"
  echo "🎫 Verification Token: $TOKEN"
  
  # Step 2: Verify email
  echo ""
  echo "2️⃣ Verifying email..."
  VERIFY_RESPONSE=$(curl -s -I -X GET "$BASE_URL/verify-email?token=$TOKEN")
  
  echo "📋 Verification Response Headers:"
  echo "$VERIFY_RESPONSE"
  
  # Step 3: Test login
  echo ""
  echo "3️⃣ Testing login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"TestPassword123!\"
    }")
  
  echo "📋 Login Response: $LOGIN_RESPONSE"
  
  if [[ $LOGIN_RESPONSE == *"success":true* ]]; then
    echo "✅ EMAIL VERIFICATION TEST COMPLETED SUCCESSFULLY!"
  else
    echo "❌ Login test failed"
  fi
  
else
  echo "❌ Registration failed or no verification token returned"
fi

echo ""
echo "🏁 Test completed!"
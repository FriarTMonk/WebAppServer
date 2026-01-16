#!/bin/bash

# Test Email 2FA Flow
# This script tests the complete email 2FA functionality

API_URL="http://localhost:3697"
TEST_EMAIL="2fa-test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_FIRSTNAME="2FA"
TEST_LASTNAME="Test"

echo "=== Testing Email 2FA Flow ==="
echo ""

# Step 1: Register a new user
echo "1. Registering test user: $TEST_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"firstName\": \"$TEST_FIRSTNAME\",
    \"lastName\": \"$TEST_LASTNAME\"
  }")

echo "Register Response: $REGISTER_RESPONSE"
echo ""

# Extract access token
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to get access token from registration"
  exit 1
fi

echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 2: Get current 2FA status
echo "2. Getting 2FA status (should be disabled)"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/auth/2fa/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Status Response: $STATUS_RESPONSE"
echo ""

# Step 3: Enable email 2FA
echo "3. Enabling email 2FA (this sends verification code)"
ENABLE_RESPONSE=$(curl -s -X POST "$API_URL/auth/2fa/email/enable" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "Enable Response: $ENABLE_RESPONSE"
echo ""

# Step 4: Prompt for verification code
echo "4. Verification code has been sent to email (check email service logs)"
echo "NOTE: In a real scenario, you would enter the code from the email"
echo "For testing, we'll check the database directly..."
echo ""

# Step 5: Get verification code from database (for testing only)
VERIFICATION_CODE=$(cd /mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/packages/api && \
  npx prisma db execute --stdin <<EOF
SELECT "emailVerificationCode" FROM "User" WHERE "email" = '$TEST_EMAIL' LIMIT 1;
EOF
)

echo "Verification code from database: $VERIFICATION_CODE"
echo ""

# Extract the actual code (it's in the output somewhere)
# This is a bit hacky but works for testing
CODE=$(echo "$VERIFICATION_CODE" | grep -oE '[0-9]{6}' | head -1)

if [ -z "$CODE" ]; then
  echo "ERROR: Could not extract verification code"
  exit 1
fi

echo "Extracted code: $CODE"
echo ""

# Step 6: Verify the code to complete 2FA setup
echo "5. Verifying code to complete 2FA setup"
VERIFY_RESPONSE=$(curl -s -X POST "$API_URL/auth/2fa/email/verify" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$CODE\"}")

echo "Verify Response: $VERIFY_RESPONSE"
echo ""

# Step 7: Check status again (should now be enabled)
echo "6. Getting 2FA status (should now be enabled)"
STATUS_RESPONSE2=$(curl -s -X GET "$API_URL/auth/2fa/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Status Response: $STATUS_RESPONSE2"
echo ""

# Step 8: Test login with 2FA
echo "7. Testing login with 2FA enabled"
echo "   First login attempt (should require 2FA)..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Extract userId for 2FA verification
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"userId":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "ERROR: Expected requires2FA response with userId"
  exit 1
fi

echo "User ID for 2FA: $USER_ID"
echo ""

# Step 9: Get the new verification code from database
echo "8. Getting new verification code from database..."
VERIFICATION_CODE2=$(cd /mnt/d/CodeLang/ClaudeCode/WebAppServer/mychristiancounselor/packages/api && \
  npx prisma db execute --stdin <<EOF
SELECT "emailVerificationCode" FROM "User" WHERE "email" = '$TEST_EMAIL' LIMIT 1;
EOF
)

CODE2=$(echo "$VERIFICATION_CODE2" | grep -oE '[0-9]{6}' | head -1)

if [ -z "$CODE2" ]; then
  echo "ERROR: Could not extract verification code for login"
  exit 1
fi

echo "Login verification code: $CODE2"
echo ""

# Step 10: Complete login with 2FA verification
echo "9. Completing login with 2FA verification"
LOGIN_2FA_RESPONSE=$(curl -s -X POST "$API_URL/auth/login/verify-2fa" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"code\": \"$CODE2\",
    \"method\": \"email\"
  }")

echo "Login 2FA Response: $LOGIN_2FA_RESPONSE"
echo ""

# Extract new access token
NEW_ACCESS_TOKEN=$(echo $LOGIN_2FA_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$NEW_ACCESS_TOKEN" ]; then
  echo "ERROR: Failed to complete 2FA login"
  exit 1
fi

echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
echo ""

# Step 11: Disable 2FA
echo "10. Disabling 2FA"
DISABLE_RESPONSE=$(curl -s -X POST "$API_URL/auth/2fa/disable" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "Disable Response: $DISABLE_RESPONSE"
echo ""

# Step 12: Final status check
echo "11. Final 2FA status (should be disabled)"
STATUS_RESPONSE3=$(curl -s -X GET "$API_URL/auth/2fa/status" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")

echo "Status Response: $STATUS_RESPONSE3"
echo ""

echo "=== Email 2FA Test Complete ==="

#!/bin/bash
# Deployment Verification Script
# Verifies that deployment actually worked

set -e

API_URL="https://api.mychristiancounselor.online"

echo "1. Checking health endpoint..."
HEALTH=$(curl -s "$API_URL/health/live" | jq -r '.status')
if [ "$HEALTH" != "alive" ]; then
    echo "❌ FAILED: Health check returned: $HEALTH"
    exit 1
fi
echo "✅ Health check passed"

echo "2. Checking CORS headers..."
CORS=$(curl -s -I -H "Origin: https://www.mychristiancounselor.online" "$API_URL/profile" | grep -i "access-control-allow-origin")
if [ -z "$CORS" ]; then
    echo "❌ FAILED: No CORS headers"
    exit 1
fi
echo "✅ CORS headers present"

echo "3. Checking deployed image version..."
DEPLOYED_IMAGE=$(aws lightsail get-container-services --service-name api --region us-east-2 --query 'containerServices[0].currentDeployment.containers.api.image' --output text)
echo "Deployed image: $DEPLOYED_IMAGE"

echo "4. Checking environment variables..."
AI_TOKENS=$(aws lightsail get-container-services --service-name api --region us-east-2 --query 'containerServices[0].currentDeployment.containers.api.environment.AI_MAX_TOKENS_COMPREHENSIVE' --output text)
if [ "$AI_TOKENS" != "3200" ]; then
    echo "❌ FAILED: AI_MAX_TOKENS_COMPREHENSIVE is $AI_TOKENS, expected 3200"
    exit 1
fi
echo "✅ Environment variables correct"

echo ""
echo "✅ ALL VERIFICATION CHECKS PASSED"

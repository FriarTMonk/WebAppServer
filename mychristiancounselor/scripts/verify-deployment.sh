#!/bin/bash
# Deployment Verification Script
# Verifies that deployment actually worked

set -e

API_URL="https://api.mychristiancounselor.online"

echo "1. Checking readiness endpoint..."
READY_RESPONSE=$(curl -s "$API_URL/health/ready")
READY_STATUS=$(echo "$READY_RESPONSE" | jq -r '.status')

if [ "$READY_STATUS" != "ready" ]; then
    echo "❌ FAILED: Readiness check returned: $READY_STATUS"
    echo "Response: $READY_RESPONSE"
    exit 1
fi

# Verify all health checks passed
DB_CHECK=$(echo "$READY_RESPONSE" | jq -r '.checks[] | select(.name=="database") | .status')
REDIS_CHECK=$(echo "$READY_RESPONSE" | jq -r '.checks[] | select(.name=="redis") | .status')
ENV_CHECK=$(echo "$READY_RESPONSE" | jq -r '.checks[] | select(.name=="environment") | .status')

if [ "$DB_CHECK" != "healthy" ]; then
    echo "❌ FAILED: Database check unhealthy"
    exit 1
fi

if [ "$REDIS_CHECK" != "healthy" ]; then
    echo "❌ FAILED: Redis check unhealthy"
    exit 1
fi

if [ "$ENV_CHECK" != "healthy" ]; then
    echo "❌ FAILED: Environment variables check unhealthy"
    exit 1
fi

echo "✅ Readiness check passed (database, Redis, environment all healthy)"

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
# Read expected value from config file instead of hardcoding
EXPECTED_AI_TOKENS=$(jq -r '.containers.api.environment.AI_MAX_TOKENS_COMPREHENSIVE' lightsail-api-deployment.json)
AI_TOKENS=$(aws lightsail get-container-services --service-name api --region us-east-2 --query 'containerServices[0].currentDeployment.containers.api.environment.AI_MAX_TOKENS_COMPREHENSIVE' --output text)
if [ "$AI_TOKENS" != "$EXPECTED_AI_TOKENS" ]; then
    echo "❌ FAILED: AI_MAX_TOKENS_COMPREHENSIVE is $AI_TOKENS, expected $EXPECTED_AI_TOKENS"
    exit 1
fi
echo "✅ Environment variables correct (AI_MAX_TOKENS_COMPREHENSIVE=$AI_TOKENS)"

echo ""
echo "✅ ALL VERIFICATION CHECKS PASSED"

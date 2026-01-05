#!/bin/bash

# Soft Launch Deployment Script
# Deploys API and Web services to AWS Lightsail
# Version: soft-launch.26 (API), soft-launch.25 (Web)
#
# IMPORTANT: This script automatically updates lightsail-*-deployment.json files
# with the newly pushed image tags. This ensures deployments always use the
# correct image version and prevents deploying stale code.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-2"
API_SERVICE="api"
WEB_SERVICE="web"
API_VERSION="soft-launch-32"
WEB_VERSION="soft-launch-32"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MyChristianCounselor Soft Launch${NC}"
echo -e "${BLUE}  Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}ERROR: Docker is not installed or not in PATH${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists aws; then
    echo -e "${RED}ERROR: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command_exists jq; then
    echo -e "${RED}ERROR: jq is not installed${NC}"
    echo "Please install jq: https://stedolan.github.io/jq/download/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ AWS CLI is installed${NC}"
echo -e "${GREEN}✓ jq is installed${NC}"
echo ""

# Check Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}This will deploy:${NC}"
echo "  - API version: ${API_VERSION}"
echo "  - Web version: ${WEB_VERSION}"
echo "  - Region: ${REGION}"
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 0: Validate Production Build${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Run validation script
echo -e "${YELLOW}Running production build validation...${NC}"
if [ ! -f "scripts/validate-production-build.sh" ]; then
    echo -e "${RED}ERROR: Validation script not found${NC}"
    echo "Please ensure scripts/validate-production-build.sh exists"
    exit 1
fi

bash scripts/validate-production-build.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Production build validation failed${NC}"
    echo "Please fix the issues above before deploying"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 1: Build Docker Images (Parallel)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Build both Docker images in parallel
echo -e "${YELLOW}Building API Docker image from prebuilt artifacts...${NC}"
docker build -f Dockerfile.api-prebuilt -t api:${API_VERSION} . &
API_BUILD_PID=$!

echo -e "${YELLOW}Building Web Docker image from prebuilt artifacts...${NC}"
docker build -f Dockerfile.web-prebuilt -t web:${WEB_VERSION} . &
WEB_BUILD_PID=$!

# Wait for both builds to complete
echo -e "${YELLOW}Waiting for both builds to complete...${NC}"
wait $API_BUILD_PID
API_BUILD_STATUS=$?
wait $WEB_BUILD_PID
WEB_BUILD_STATUS=$?

if [ $API_BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}ERROR: API Docker build failed${NC}"
    exit 1
fi

if [ $WEB_BUILD_STATUS -ne 0 ]; then
    echo -e "${RED}ERROR: Web Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Both Docker images built successfully${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 2: Push Images & Update Configs${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Push API image and capture the output
echo -e "${YELLOW}Pushing API image to Lightsail...${NC}"
API_PUSH_OUTPUT=$(aws lightsail push-container-image \
  --service-name ${API_SERVICE} \
  --label ${API_VERSION} \
  --image api:${API_VERSION} \
  --region ${REGION} 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to push API image to Lightsail${NC}"
    echo "$API_PUSH_OUTPUT"
    exit 1
fi

# Extract the new image tag from the output
# AWS outputs: Refer to this image as ":api.soft-launch-32.168" in deployments.
API_IMAGE_TAG=$(echo "$API_PUSH_OUTPUT" | grep -oP 'Refer to this image as "\K[^"]+' | head -1)
if [ -z "$API_IMAGE_TAG" ]; then
    echo -e "${RED}ERROR: Could not extract API image tag from push output${NC}"
    echo "$API_PUSH_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ API image pushed: ${API_IMAGE_TAG}${NC}"
echo ""

# Push Web image and capture the output
echo -e "${YELLOW}Pushing Web image to Lightsail...${NC}"
WEB_PUSH_OUTPUT=$(aws lightsail push-container-image \
  --service-name ${WEB_SERVICE} \
  --label ${WEB_VERSION} \
  --image web:${WEB_VERSION} \
  --region ${REGION} 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to push Web image to Lightsail${NC}"
    echo "$WEB_PUSH_OUTPUT"
    exit 1
fi

# Extract the new image tag from the output
# AWS outputs: Refer to this image as ":web.soft-launch-32.168" in deployments.
WEB_IMAGE_TAG=$(echo "$WEB_PUSH_OUTPUT" | grep -oP 'Refer to this image as "\K[^"]+' | head -1)
if [ -z "$WEB_IMAGE_TAG" ]; then
    echo -e "${RED}ERROR: Could not extract Web image tag from push output${NC}"
    echo "$WEB_PUSH_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Web image pushed: ${WEB_IMAGE_TAG}${NC}"
echo ""

# Update API deployment JSON with new image tag
echo -e "${YELLOW}Updating API deployment config with new image tag...${NC}"
if [ ! -f "lightsail-api-deployment.json" ]; then
    echo -e "${RED}ERROR: lightsail-api-deployment.json not found${NC}"
    exit 1
fi

# Create backup
cp lightsail-api-deployment.json lightsail-api-deployment.json.backup

# Update the image tag in the JSON file
jq --arg img "$API_IMAGE_TAG" '.containers.api.image = $img' lightsail-api-deployment.json > lightsail-api-deployment.json.tmp
mv lightsail-api-deployment.json.tmp lightsail-api-deployment.json

echo -e "${GREEN}✓ API deployment config updated${NC}"
echo ""

# Deploy API service
echo -e "${YELLOW}Deploying API service with image: ${API_IMAGE_TAG}...${NC}"
aws lightsail create-container-service-deployment \
  --service-name ${API_SERVICE} \
  --cli-input-json file://lightsail-api-deployment.json \
  --region ${REGION}

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to deploy API service${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API deployment initiated${NC}"
echo ""

# Wait for API deployment
echo -e "${YELLOW}Waiting for API deployment to complete...${NC}"
for i in {1..30}; do
    STATE=$(aws lightsail get-container-services \
      --service-name ${API_SERVICE} \
      --region ${REGION} \
      --query 'containerServices[0].state' \
      --output text)

    if [ "$STATE" = "RUNNING" ]; then
        echo -e "${GREEN}✓ API service is RUNNING${NC}"
        break
    elif [ "$STATE" = "DEPLOYING" ] || [ "$STATE" = "UPDATING" ]; then
        echo -n "."
        sleep 10
    else
        echo -e "${RED}ERROR: API deployment failed with state: ${STATE}${NC}"
        exit 1
    fi
done

if [ "$STATE" != "RUNNING" ]; then
    echo -e "${RED}ERROR: API deployment timed out${NC}"
    echo "Check status: aws lightsail get-container-services --service-name ${API_SERVICE} --region ${REGION}"
    exit 1
fi

echo ""
echo ""

# Test API health
echo -e "${YELLOW}Testing API health...${NC}"
sleep 5  # Give it a moment to stabilize

HEALTH_RESPONSE=$(curl -s https://api.mychristiancounselor.online/health/live || echo "failed")
if [[ $HEALTH_RESPONSE == *"alive"* ]]; then
    echo -e "${GREEN}✓ API health check passed${NC}"
    echo "  Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}WARNING: API health check failed${NC}"
    echo "  Response: $HEALTH_RESPONSE"
    echo "  The API may need a few more moments to start"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 3: Deploy Web${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Update Web deployment JSON with new image tag
echo -e "${YELLOW}Updating Web deployment config with new image tag...${NC}"
if [ ! -f "lightsail-web-deployment.json" ]; then
    echo -e "${RED}ERROR: lightsail-web-deployment.json not found${NC}"
    exit 1
fi

# Create backup
cp lightsail-web-deployment.json lightsail-web-deployment.json.backup

# Update the image tag in the JSON file
jq --arg img "$WEB_IMAGE_TAG" '.containers.web.image = $img' lightsail-web-deployment.json > lightsail-web-deployment.json.tmp
mv lightsail-web-deployment.json.tmp lightsail-web-deployment.json

echo -e "${GREEN}✓ Web deployment config updated${NC}"
echo ""

# Deploy Web service
echo -e "${YELLOW}Deploying Web service with image: ${WEB_IMAGE_TAG}...${NC}"
aws lightsail create-container-service-deployment \
  --service-name ${WEB_SERVICE} \
  --cli-input-json file://lightsail-web-deployment.json \
  --region ${REGION}

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to deploy Web service${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Web deployment initiated${NC}"
echo ""

# Wait for Web deployment
echo -e "${YELLOW}Waiting for Web deployment to complete...${NC}"
for i in {1..30}; do
    STATE=$(aws lightsail get-container-services \
      --service-name ${WEB_SERVICE} \
      --region ${REGION} \
      --query 'containerServices[0].state' \
      --output text)

    if [ "$STATE" = "RUNNING" ]; then
        echo -e "${GREEN}✓ Web service is RUNNING${NC}"
        break
    elif [ "$STATE" = "DEPLOYING" ] || [ "$STATE" = "UPDATING" ]; then
        echo -n "."
        sleep 10
    else
        echo -e "${RED}ERROR: Web deployment failed with state: ${STATE}${NC}"
        exit 1
    fi
done

if [ "$STATE" != "RUNNING" ]; then
    echo -e "${RED}ERROR: Web deployment timed out${NC}"
    echo "Check status: aws lightsail get-container-services --service-name ${WEB_SERVICE} --region ${REGION}"
    exit 1
fi

echo ""
echo ""

# Test Web health
echo -e "${YELLOW}Testing Web app...${NC}"
sleep 5  # Give it a moment to stabilize

WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://mychristiancounselor.online/ || echo "failed")
if [ "$WEB_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Web app health check passed (HTTP 200)${NC}"
else
    echo -e "${RED}WARNING: Web app health check failed (HTTP ${WEB_STATUS})${NC}"
    echo "  The Web app may need a few more moments to start"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Run deployment verification
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Running Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -f "scripts/verify-deployment.sh" ]; then
    bash scripts/verify-deployment.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
        echo -e "${RED}The deployment completed but verification checks failed.${NC}"
        echo -e "${RED}Please investigate the issues above.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}WARNING: Verification script not found${NC}"
    echo "  scripts/verify-deployment.sh does not exist"
    echo "  Skipping automated verification"
fi

echo ""
echo -e "${YELLOW}IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. ${RED}RUN DATABASE MIGRATION (CRITICAL):${NC}"
echo "   The account deletion feature requires new database columns."
echo "   Run this SQL on your RDS database:"
echo ""
echo "   ALTER TABLE \"User\""
echo "     ADD COLUMN \"deletionRequestedAt\" TIMESTAMP,"
echo "     ADD COLUMN \"deletionRequestedBy\" TEXT;"
echo ""
echo "2. ${YELLOW}Verify deployment:${NC}"
echo "   - API: https://api.mychristiancounselor.online/health/live"
echo "   - Web: https://mychristiancounselor.online/"
echo ""
echo "3. ${YELLOW}Test new features:${NC}"
echo "   - Landing page: https://mychristiancounselor.online/"
echo "   - Password reset: https://mychristiancounselor.online/forgot-password"
echo "   - Account deletion: https://mychristiancounselor.online/profile"
echo ""
echo "4. ${YELLOW}Run full testing checklist:${NC}"
echo "   See: docs/SOFT-LAUNCH-TESTING-CHECKLIST.md"
echo ""
echo "5. ${YELLOW}Set up monitoring:${NC}"
echo "   - UptimeRobot: https://uptimerobot.com"
echo "   - Sentry: https://sentry.io/"
echo ""
echo -e "${GREEN}Good luck with your soft launch! 🚀${NC}"

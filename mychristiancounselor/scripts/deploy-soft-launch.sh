#!/bin/bash

# Soft Launch Deployment Script
# Deploys API and Web services to AWS Lightsail
# Version: soft-launch.26 (API), soft-launch.25 (Web)

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
API_VERSION="soft-launch-30"
WEB_VERSION="soft-launch-31"

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

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ AWS CLI is installed${NC}"
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
echo -e "${BLUE}  Step 1: Build and Deploy API${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Build API Docker image (using prebuilt)
echo -e "${YELLOW}Building API Docker image from prebuilt artifacts...${NC}"
docker build -f Dockerfile.api-prebuilt -t api:${API_VERSION} .

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: API Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API Docker image built successfully${NC}"
echo ""

# Push API image to Lightsail (no pre-tagging needed)
echo -e "${YELLOW}Pushing API image to Lightsail (this may take a few minutes)...${NC}"
aws lightsail push-container-image \
  --service-name ${API_SERVICE} \
  --label ${API_VERSION} \
  --image api:${API_VERSION} \
  --region ${REGION}

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to push API image to Lightsail${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API image pushed to Lightsail${NC}"
echo ""

# Deploy API service
echo -e "${YELLOW}Deploying API service...${NC}"
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
echo -e "${BLUE}  Step 2: Build and Deploy Web${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Build Web Docker image (using prebuilt)
echo -e "${YELLOW}Building Web Docker image from prebuilt artifacts...${NC}"
docker build -f Dockerfile.web-prebuilt -t web:${WEB_VERSION} .

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Web Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Web Docker image built successfully${NC}"
echo ""

# Push Web image to Lightsail (no pre-tagging needed)
echo -e "${YELLOW}Pushing Web image to Lightsail (this may take a few minutes)...${NC}"
aws lightsail push-container-image \
  --service-name ${WEB_SERVICE} \
  --label ${WEB_VERSION} \
  --image web:${WEB_VERSION} \
  --region ${REGION}

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to push Web image to Lightsail${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Web image pushed to Lightsail${NC}"
echo ""

# Deploy Web service
echo -e "${YELLOW}Deploying Web service...${NC}"
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

#!/bin/bash

# Deploy CloudWatch Synthetics Canary
# This script packages the canary code and deploys it via CloudFormation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="MyChristianCounselor-API-Health-Canary"
REGION="us-east-2"
CANARY_SCRIPT="api-health-canary.js"
TEMPLATE_FILE="cloudformation-template.yaml"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CloudWatch Synthetics Canary Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI not installed${NC}"
    exit 1
fi

if ! command -v zip &> /dev/null; then
    echo -e "${RED}ERROR: zip command not found${NC}"
    exit 1
fi

if [ ! -f "$CANARY_SCRIPT" ]; then
    echo -e "${RED}ERROR: Canary script not found: $CANARY_SCRIPT${NC}"
    exit 1
fi

if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}ERROR: CloudFormation template not found: $TEMPLATE_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Get parameters
echo -e "${YELLOW}Configuration:${NC}"
read -p "Alert email address [support@mychristiancounselor.online]: " ALERT_EMAIL
ALERT_EMAIL=${ALERT_EMAIL:-support@mychristiancounselor.online}

read -p "Alert phone number for SMS (format: +1234567890, or leave empty): " ALERT_PHONE
ALERT_PHONE=${ALERT_PHONE:-}

read -p "Check interval (1, 5, 10, or 15 minutes) [5]: " INTERVAL
INTERVAL=${INTERVAL:-5}

read -p "Environment (production or staging) [production]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-production}

echo ""
echo -e "${BLUE}Deployment Configuration:${NC}"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $REGION"
echo "  Alert Email: $ALERT_EMAIL"
echo "  Alert Phone: ${ALERT_PHONE:-None}"
echo "  Check Interval: Every $INTERVAL minutes"
echo "  Environment: $ENVIRONMENT"
echo ""

read -p "Proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 1: Package Canary Code${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy canary script to temp directory
cp "$CANARY_SCRIPT" "$TEMP_DIR/index.js"

# Create package
cd "$TEMP_DIR"
zip -q canary.zip index.js
cd - > /dev/null

echo -e "${GREEN}✓ Canary code packaged${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 2: Upload to S3${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create S3 bucket for CloudFormation templates if it doesn't exist
BUCKET_NAME="mychristiancounselor-cloudformation-${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"

if ! aws s3 ls "s3://$BUCKET_NAME" --region $REGION 2>/dev/null; then
    echo -e "${YELLOW}Creating S3 bucket: $BUCKET_NAME${NC}"
    aws s3 mb "s3://$BUCKET_NAME" --region $REGION
    aws s3api put-bucket-encryption \
        --bucket $BUCKET_NAME \
        --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
fi

# Upload canary code
echo -e "${YELLOW}Uploading canary code to S3...${NC}"
aws s3 cp "$TEMP_DIR/canary.zip" "s3://$BUCKET_NAME/canary-code/canary.zip" --region $REGION

echo -e "${GREEN}✓ Code uploaded to S3${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 3: Deploy CloudFormation Stack${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Build parameters
PARAMETERS="ParameterKey=AlertEmail,ParameterValue=$ALERT_EMAIL"
PARAMETERS="$PARAMETERS ParameterKey=CanarySchedule,ParameterValue=rate($INTERVAL minutes)"
PARAMETERS="$PARAMETERS ParameterKey=Environment,ParameterValue=$ENVIRONMENT"

if [ -n "$ALERT_PHONE" ]; then
    PARAMETERS="$PARAMETERS ParameterKey=AlertPhoneNumber,ParameterValue=$ALERT_PHONE"
fi

# Check if stack exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION &>/dev/null; then
    echo -e "${YELLOW}Stack exists - updating...${NC}"
    OPERATION="update-stack"
else
    echo -e "${YELLOW}Creating new stack...${NC}"
    OPERATION="create-stack"
fi

# Deploy stack
aws cloudformation $OPERATION \
    --stack-name $STACK_NAME \
    --template-body file://$TEMPLATE_FILE \
    --parameters $PARAMETERS \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION \
    --tags Key=Project,Value=MyChristianCounselor Key=Environment,Value=$ENVIRONMENT

echo -e "${YELLOW}Waiting for stack operation to complete...${NC}"
aws cloudformation wait stack-${OPERATION//-stack/}-complete --stack-name $STACK_NAME --region $REGION

echo -e "${GREEN}✓ CloudFormation stack deployed${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 4: Update Canary with Actual Code${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get canary name from stack outputs
CANARY_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CanaryName`].OutputValue' \
    --output text)

echo -e "${YELLOW}Updating canary with actual code...${NC}"

# Update canary with the actual script
aws synthetics update-canary \
    --name "$CANARY_NAME" \
    --code "Handler=index.handler,ZipFile=fileb://$TEMP_DIR/canary.zip" \
    --runtime-version "syn-nodejs-puppeteer-9.0" \
    --region $REGION

echo -e "${GREEN}✓ Canary updated with actual code${NC}"
echo ""

# Get stack outputs
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
    --output text)

CANARY_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CanaryConsoleURL`].OutputValue' \
    --output text)

ARTIFACTS_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ArtifactsBucket`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Canary successfully deployed!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Check your email ($ALERT_EMAIL) and confirm SNS subscription"
if [ -n "$ALERT_PHONE" ]; then
    echo "2. Check your phone ($ALERT_PHONE) and confirm SMS subscription"
fi
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "  Dashboard: $DASHBOARD_URL"
echo "  Canary Console: $CANARY_URL"
echo "  Artifacts: s3://$ARTIFACTS_BUCKET/canary-artifacts/"
echo ""
echo -e "${YELLOW}Cost:${NC}"
echo "  Estimated: ~\$10.37/month for $INTERVAL-minute checks"
echo ""
echo -e "${GREEN}The canary will start running within $INTERVAL minutes and check your API every $INTERVAL minutes.${NC}"
echo ""

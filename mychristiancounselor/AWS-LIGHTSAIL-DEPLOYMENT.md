# AWS Lightsail Containers Deployment Guide

## Overview

Deploy MyChristianCounselor to AWS Lightsail Containers - the simplest and most cost-effective way to run Docker containers on AWS. Perfect for launching quickly and scaling as you grow.

**Domain:** mychristiancounselor.online  
**Estimated Monthly Cost:** $50-80 (vs $260+ for ECS)  
**Time to Deploy:** 1-2 days (vs 1-2 weeks for ECS)  
**Migration to ECS Later:** Easy (4-8 hours when needed)

---

## Why Lightsail Containers?

### ✅ Advantages

- **Simple:** No VPCs, subnets, load balancers, or task definitions
- **Fast:** Deploy in hours, not days
- **Cheap:** Fixed pricing, no surprise bills
- **Managed:** Automatic load balancing, SSL, and health checks
- **Integrated:** Built-in monitoring and logging
- **Scalable:** Auto-scale from 1 to 20 containers

### ⚠️ Limitations (When to Migrate to ECS)

- **Max container size:** Micro (512 MB RAM, 0.25 vCPU) to XL (4 GB RAM, 2 vCPU)
- **Max scale:** 20 containers per service
- **No VPC integration:** Can't access private resources (not an issue for us)
- **Limited regions:** Not available in all AWS regions

**For MyChristianCounselor:** Lightsail is perfect for 0-1000 users. Migrate to ECS when you exceed these limits.

---

## Architecture

```
[Users] 
   ↓
[Lightsail Load Balancer + SSL] (automatic)
   ↓
[API Container Service] (1-5 containers, auto-scale)
   ↓
[RDS PostgreSQL] (separate service)
   ↓
[External Services] (OpenAI, Postmark, Stripe)
```

**What Lightsail Handles Automatically:**
- Load balancing
- SSL certificates
- Health checks
- Auto-scaling
- Logging
- Metrics

---

## Cost Breakdown

### Monthly Costs

| Service | Configuration | Monthly Cost |
|---------|---------------|--------------|
| **Lightsail Container (API)** | Micro (512MB, 0.25vCPU) × 2 | $14 |
| **Lightsail Container (Web)** | Micro (512MB, 0.25vCPU) × 2 | $14 |
| **RDS PostgreSQL** | db.t4g.micro (1GB RAM) | $15 |
| **Route 53** | DNS hosting + queries | $2 |
| **Domain Registration** | mychristiancounselor.online | $1/month ($12/year) |
| **OpenAI API** | Usage-based | $20-100 |
| **Postmark Email** | 10k emails/month | $10 |
| **Stripe** | 2.9% + $0.30 per transaction | Variable |
| **TOTAL (Infrastructure)** | | **$45/month** |
| **TOTAL (with services)** | | **$75-155/month** |

### Scaling Costs

As you grow, upgrade container size:

| Size | RAM | vCPU | Price/Container | Max Scale | Monthly (5 containers) |
|------|-----|------|-----------------|-----------|------------------------|
| Nano | 256MB | 0.25 | $7 | 20 | $35 |
| **Micro** | **512MB** | **0.25** | **$7** | **20** | **$35** ← Start here |
| Small | 1GB | 0.5 | $10 | 20 | $50 |
| Medium | 2GB | 1.0 | $20 | 20 | $100 |
| Large | 4GB | 2.0 | $40 | 20 | $200 |
| XLarge | 8GB | 4.0 | $80 | 20 | $400 |

**Recommendation:** Start with Micro (2 containers), upgrade to Small when you hit 500+ active users.

---

## Prerequisites

### 1. AWS Account Setup

```bash
# Install AWS CLI
brew install awscli  # macOS
# or: apt-get install awscli  # Linux
# or: Download from https://aws.amazon.com/cli/

# Configure AWS credentials
aws configure
# AWS Access Key ID: [your access key]
# AWS Secret Access Key: [your secret key]
# Default region name: us-east-1
# Default output format: json
```

### 2. Install Lightsail Plugin

```bash
# Install Lightsail plugin for AWS CLI
aws lightsail help
```

### 3. Register Domain

**Option A: Register via Route 53 (Recommended)**
```bash
aws route53domains register-domain \
  --domain-name mychristiancounselor.online \
  --duration-in-years 1 \
  --admin-contact file://contact.json \
  --registrant-contact file://contact.json \
  --tech-contact file://contact.json
```

**Option B: Use existing domain registrar**
- Buy domain from Namecheap, GoDaddy, etc.
- Point nameservers to Route 53 later

---

## Deployment Steps

### Step 1: Create RDS Database (15 minutes)

#### 1.1 Create Database via Console

1. Go to: https://console.aws.amazon.com/rds/
2. Click **Create database**
3. Select:
   - **Engine:** PostgreSQL 15
   - **Template:** Free tier (or Production for Multi-AZ)
   - **DB instance identifier:** `mychristiancounselor-prod`
   - **Master username:** `postgres`
   - **Master password:** [generate strong password]
   - **DB instance class:** `db.t4g.micro` ($15/month)
   - **Storage:** 20 GB GP3 (auto-scaling to 100 GB)
   - **Public access:** Yes (temporarily, for setup)
   - **VPC security group:** Create new `mychristiancounselor-db-sg`
   - **Database name:** `mychristiancounselor_production`

4. Click **Create database** (takes ~10 minutes)

#### 1.2 Configure Security Group

```bash
# Get your IP address
MY_IP=$(curl -s ifconfig.me)

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=mychristiancounselor-db-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text)

# Allow your IP (for migrations)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr $MY_IP/32

# Allow Lightsail containers (add later after deployment)
# Note: Lightsail containers have dynamic IPs, so we'll keep this open or use RDS Proxy
```

#### 1.3 Get Database Endpoint

```bash
aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor-prod \
  --query "DBInstances[0].Endpoint.Address" \
  --output text

# Example output: mychristiancounselor-prod.abcdef.us-east-1.rds.amazonaws.com
```

#### 1.4 Run Migrations

```bash
# Set DATABASE_URL with RDS endpoint
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@mychristiancounselor-prod.abcdef.us-east-1.rds.amazonaws.com:5432/mychristiancounselor_production?sslmode=require&connection_limit=20"

# Navigate to API directory
cd packages/api

# Run migrations
npx prisma migrate deploy

# Run seed script (creates Tuckaho-tech organization)
npm run seed
```

---

### Step 2: Build and Push Docker Images (20 minutes)

#### 2.1 Verify Dockerfiles Exist

```bash
# Check API Dockerfile
ls packages/api/Dockerfile

# Check Web Dockerfile  
ls packages/web/Dockerfile
```

#### 2.2 Build Images Locally

```bash
# Build API image
docker build -t mychristiancounselor-api:latest -f packages/api/Dockerfile .

# Build Web image
docker build -t mychristiancounselor-web:latest -f packages/web/Dockerfile .

# Test API locally
docker run -p 3697:3697 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_SECRET="test-secret-min-32-chars-long-here" \
  -e JWT_REFRESH_SECRET="test-refresh-secret-min-32-chars-long" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e POSTMARK_API_TOKEN="test" \
  -e FROM_EMAIL="test@example.com" \
  -e WEB_APP_URL="http://localhost:3699" \
  mychristiancounselor-api:latest

# Ctrl+C to stop
```

#### 2.3 Push to AWS Lightsail

```bash
# Push API container
aws lightsail push-container-image \
  --service-name mychristiancounselor-api \
  --label api-latest \
  --image mychristiancounselor-api:latest \
  --region us-east-1

# Note the output image reference:
# :mychristiancounselor-api.api-latest.1

# Push Web container
aws lightsail push-container-image \
  --service-name mychristiancounselor-web \
  --label web-latest \
  --image mychristiancounselor-web:latest \
  --region us-east-1

# Note the output image reference:
# :mychristiancounselor-web.web-latest.1
```

---

### Step 3: Create Environment Variables File (10 minutes)

Create `lightsail-api-env.json`:

```json
{
  "DATABASE_URL": "postgresql://postgres:YOUR_PASSWORD@mychristiancounselor-prod.abcdef.us-east-1.rds.amazonaws.com:5432/mychristiancounselor_production?sslmode=require&connection_limit=20&pool_timeout=20",
  "JWT_SECRET": "GENERATE_WITH_openssl_rand_base64_48",
  "JWT_REFRESH_SECRET": "GENERATE_WITH_openssl_rand_base64_48",
  "JWT_ACCESS_EXPIRATION": "15m",
  "JWT_REFRESH_EXPIRATION": "7d",
  "OPENAI_API_KEY": "sk-proj-YOUR_OPENAI_KEY",
  "POSTMARK_API_TOKEN": "YOUR_POSTMARK_TOKEN",
  "FROM_EMAIL": "noreply@mychristiancounselor.online",
  "SUPPORT_EMAIL": "support@mychristiancounselor.online",
  "STRIPE_SECRET_KEY": "sk_live_YOUR_STRIPE_KEY",
  "STRIPE_WEBHOOK_SECRET": "whsec_YOUR_WEBHOOK_SECRET",
  "WEB_APP_URL": "https://mychristiancounselor.online",
  "CORS_ORIGIN": "https://mychristiancounselor.online",
  "NODE_ENV": "production",
  "PORT": "3697",
  "SENTRY_DSN": "https://YOUR_SENTRY_DSN@sentry.io/project"
}
```

**Generate secrets:**
```bash
# Generate JWT secrets
echo "JWT_SECRET=$(openssl rand -base64 48)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"
```

Create `lightsail-web-env.json`:

```json
{
  "NEXT_PUBLIC_API_URL": "https://api.mychristiancounselor.online",
  "NODE_ENV": "production",
  "NEXT_PUBLIC_SENTRY_DSN": "https://YOUR_SENTRY_DSN@sentry.io/project"
}
```

---

### Step 4: Deploy API Service (15 minutes)

#### 4.1 Create Container Service

```bash
aws lightsail create-container-service \
  --service-name mychristiancounselor-api \
  --power micro \
  --scale 2 \
  --region us-east-1
```

**Power options:**
- `nano`: 256MB, 0.25 vCPU ($7/month)
- `micro`: 512MB, 0.25 vCPU ($7/month) ← **Start here**
- `small`: 1GB, 0.5 vCPU ($10/month)
- `medium`: 2GB, 1 vCPU ($20/month)

**Scale:** Number of containers (1-20)

#### 4.2 Create Deployment Configuration

Create `lightsail-api-deployment.json`:

```json
{
  "serviceName": "mychristiancounselor-api",
  "containers": {
    "api": {
      "image": ":mychristiancounselor-api.api-latest.1",
      "command": [],
      "environment": {
        "NODE_ENV": "production",
        "PORT": "3697"
      },
      "ports": {
        "3697": "HTTP"
      }
    }
  },
  "publicEndpoint": {
    "containerName": "api",
    "containerPort": 3697,
    "healthCheck": {
      "path": "/health/live",
      "intervalSeconds": 30,
      "timeoutSeconds": 5,
      "healthyThreshold": 2,
      "unhealthyThreshold": 3,
      "successCodes": "200-299"
    }
  }
}
```

**Note:** Sensitive environment variables should be added via console (see Step 4.3).

#### 4.3 Deploy via AWS Console (Easier for Environment Variables)

1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/containers
2. Click your service: `mychristiancounselor-api`
3. Click **Create your first deployment**
4. **Container entry 1:**
   - Container name: `api`
   - Image: Select the pushed image (`:mychristiancounselor-api.api-latest.1`)
   - Click **Add environment variables**
   - Paste all variables from `lightsail-api-env.json` (one by one)
5. **Public endpoint:**
   - Container name: `api`
   - Container port: `3697`
   - Health check path: `/health/live`
6. Click **Save and deploy**

Wait 5-10 minutes for deployment to complete.

#### 4.4 Get Public URL

```bash
aws lightsail get-container-services \
  --service-name mychristiancounselor-api \
  --query "containerServices[0].url" \
  --output text

# Example: https://mychristiancounselor-api.abcdefghij.us-east-1.cs.amazonlightsail.com
```

Test it:
```bash
curl https://mychristiancounselor-api.abcdefghij.us-east-1.cs.amazonlightsail.com/health/live

# Expected: {"status":"ok"}
```

---

### Step 5: Deploy Web Service (15 minutes)

Repeat Step 4 for the web service:

```bash
# Create service
aws lightsail create-container-service \
  --service-name mychristiancounselor-web \
  --power micro \
  --scale 2 \
  --region us-east-1
```

Deploy via console:
1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/containers
2. Click: `mychristiancounselor-web`
3. **Container entry 1:**
   - Container name: `web`
   - Image: `:mychristiancounselor-web.web-latest.1`
   - Environment variables from `lightsail-web-env.json`
4. **Public endpoint:**
   - Container name: `web`
   - Container port: `3699` (or whatever Next.js uses)
   - Health check path: `/`
5. Click **Save and deploy**

---

### Step 6: Configure Custom Domain (30 minutes)

#### 6.1 Enable HTTPS on Lightsail

1. Go to container service: `mychristiancounselor-api`
2. Click **Custom domains** tab
3. Click **Enable custom domain**
4. Click **Create certificate**
5. Enter domain: `api.mychristiancounselor.online`
6. Click **Create certificate**
7. **Verify domain:** Add CNAME records to Route 53 (shown in console)
8. Wait 5-10 minutes for verification
9. **Attach certificate** to container service

Repeat for web service with domain: `mychristiancounselor.online`

#### 6.2 Configure Route 53 DNS

```bash
# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='mychristiancounselor.online.'].Id" \
  --output text | cut -d'/' -f3)

# Get Lightsail API URL
API_URL=$(aws lightsail get-container-services \
  --service-name mychristiancounselor-api \
  --query "containerServices[0].url" \
  --output text | sed 's/https:\/\///')

# Create Route 53 record for API
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.mychristiancounselor.online",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$API_URL'"}]
      }
    }]
  }'
```

Repeat for web service with `mychristiancounselor.online`.

#### 6.3 Verify SSL Works

```bash
# Test API with custom domain
curl https://api.mychristiancounselor.online/health/live

# Test Web
curl https://mychristiancounselor.online
```

---

### Step 7: Configure Auto-Scaling (5 minutes)

Lightsail doesn't have auto-scaling like ECS, but you can manually scale:

```bash
# Scale API to 3 containers during high traffic
aws lightsail update-container-service \
  --service-name mychristiancounselor-api \
  --scale 3

# Scale back to 2 during low traffic
aws lightsail update-container-service \
  --service-name mychristiancounselor-api \
  --scale 2
```

**Tip:** Set up CloudWatch alarms to notify you when CPU > 70% for 5 minutes, then scale manually.

---

### Step 8: Set Up Monitoring (10 minutes)

#### 8.1 Enable Lightsail Metrics

Lightsail automatically tracks:
- CPU utilization
- Memory utilization
- Network in/out
- Request count
- HTTP response codes

View in console: https://lightsail.aws.amazon.com/ls/webapp/home/containers

#### 8.2 Set Up CloudWatch Alarms

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name api-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/Lightsail \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:alerts

# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name api-high-errors \
  --metric-name 5XXError \
  --namespace AWS/Lightsail \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

#### 8.3 Configure Sentry

Already configured in code! Just add `SENTRY_DSN` to environment variables (already done in Step 3).

---

## Post-Deployment Checklist

- [ ] API health check returns 200: `curl https://api.mychristiancounselor.online/health/live`
- [ ] Web loads: `curl https://mychristiancounselor.online`
- [ ] Database migrations applied: `npx prisma migrate status`
- [ ] Seed data created (Tuckaho-tech organization exists)
- [ ] SSL certificates active on both domains
- [ ] Environment variables set (no missing required vars)
- [ ] Login works (test with latuck369@gmail.com, password: ChangeMe123!)
- [ ] Create test counseling session
- [ ] Verify emails send (check Postmark dashboard)
- [ ] Crisis detection works
- [ ] Stripe webhook configured: `https://api.mychristiancounselor.online/webhooks/stripe`
- [ ] CloudWatch alarms configured
- [ ] Sentry receiving errors (test by triggering an error)
- [ ] Backup RDS database manually once

---

## Maintenance & Updates

### Deploy New Version

```bash
# 1. Build new image
docker build -t mychristiancounselor-api:v2 -f packages/api/Dockerfile .

# 2. Push to Lightsail
aws lightsail push-container-image \
  --service-name mychristiancounselor-api \
  --label api-v2 \
  --image mychristiancounselor-api:v2

# 3. Update deployment via console (or create new deployment JSON with new image)
# Go to Lightsail console → Select service → Modify deployment → Change image
```

### Run Database Migration

```bash
# 1. Backup database first
aws rds create-db-snapshot \
  --db-instance-identifier mychristiancounselor-prod \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M%S)

# 2. Run migration locally (targeting production database)
export DATABASE_URL="postgresql://postgres:PASSWORD@rds-endpoint:5432/mychristiancounselor_production?sslmode=require"
npx prisma migrate deploy

# 3. Deploy new code (see above)
```

### Scale Up

```bash
# Increase container size (micro → small)
aws lightsail update-container-service \
  --service-name mychristiancounselor-api \
  --power small

# Increase container count (2 → 5)
aws lightsail update-container-service \
  --service-name mychristiancounselor-api \
  --scale 5
```

### View Logs

```bash
# Via AWS CLI
aws lightsail get-container-log \
  --service-name mychristiancounselor-api \
  --container-name api

# Or via console
# https://lightsail.aws.amazon.com/ls/webapp/home/containers
# Click service → Logs tab
```

---

## Migration to ECS (When You Need It)

### When to Migrate

Migrate to ECS Fargate when:
- [ ] You need more than 8GB RAM per container
- [ ] You need more than 20 containers
- [ ] You need VPC integration (private subnets)
- [ ] You need advanced networking (service mesh)
- [ ] You need blue-green deployments
- [ ] You need integration with AWS App Mesh, EFS, etc.

### Migration Process (4-8 hours)

1. ✅ Docker containers already work (no code changes!)
2. ✅ Environment variables already documented
3. Create ECS task definitions
4. Set up ALB (Application Load Balancer)
5. Configure ECS service
6. Move environment variables to AWS Secrets Manager
7. Update Route 53 to point to ALB
8. Test thoroughly
9. Cut over traffic
10. Delete Lightsail services

**All the production readiness work we did applies to ECS too!**

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
aws lightsail get-container-log \
  --service-name mychristiancounselor-api \
  --container-name api

# Common issues:
# - Missing environment variable (check error message)
# - Database connection failed (check DATABASE_URL)
# - Port mismatch (ensure container exposes correct port)
```

### Health Check Failing

```bash
# Test health endpoint locally
curl https://your-lightsail-url/health/live

# If 404: Check health check path in deployment config
# If 500: Check logs for application errors
# If timeout: Increase health check timeout in config
```

### SSL Certificate Not Verifying

1. Check CNAME records in Route 53 match Lightsail's requirements
2. Wait 10-15 minutes for DNS propagation
3. Check certificate status in Lightsail console
4. Ensure domain is not behind CloudFlare (proxy mode conflicts)

### High Costs

```bash
# Check container metrics
aws lightsail get-container-service-metric-data \
  --service-name mychristiancounselor-api \
  --metric-name CPUUtilization \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 3600 \
  --statistics Average

# If CPU is consistently low (<20%), downsize:
# - Reduce scale (5 → 2 containers)
# - Reduce power (small → micro)
```

---

## Cost Optimization Tips

1. **Start small:**
   - Begin with `micro` power and `scale=1`
   - Monitor CPU/memory usage
   - Only scale up when needed

2. **Use RDS reserved instances** (after 3 months):
   - 1-year reserved: Save 30%
   - 3-year reserved: Save 50%

3. **Optimize images:**
   - Use multi-stage Docker builds
   - Remove dev dependencies in production
   - Use Alpine Linux base images

4. **Monitor usage:**
   - Check Lightsail billing dashboard monthly
   - Set up billing alerts in AWS Budgets

5. **Consider Lightsail database** (cheaper than RDS):
   - $15/month for 1GB RAM (same as RDS t4g.micro)
   - $30/month for 2GB RAM
   - Simpler management, but less features

---

## Summary

**Time to Deploy:** 2-3 hours (vs 1-2 weeks for ECS)  
**Monthly Cost:** $45-80 (vs $260+ for ECS)  
**Complexity:** Low (vs High for ECS)  
**Scalability:** 0-1000 users (then migrate to ECS)  

**What You Get:**
- ✅ Production-ready application
- ✅ Automatic HTTPS and load balancing
- ✅ Built-in monitoring and logging
- ✅ Auto-scaling (manual trigger)
- ✅ Easy updates and rollbacks
- ✅ All production readiness features (env validation, SSL, pooling, migrations, etc.)

**Next Steps:**
1. Follow this guide step-by-step
2. Deploy to production
3. Monitor usage for 1-2 months
4. Scale up as needed
5. Migrate to ECS when you outgrow Lightsail

🚀 **You're ready to launch!**

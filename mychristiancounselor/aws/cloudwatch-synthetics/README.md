# CloudWatch Synthetics - API Health Monitoring

## Overview

This CloudWatch Synthetics canary provides **comprehensive API health monitoring** that goes far beyond simple ping checks. It validates that your API is not just "up" but actually functioning correctly.

## Why CloudWatch Synthetics > UptimeRobot

| Feature | UptimeRobot | CloudWatch Synthetics |
|---------|-------------|----------------------|
| HTTP status check | ✅ | ✅ |
| Response time monitoring | ✅ | ✅ |
| Test actual API functionality | ❌ | ✅ |
| Verify database connectivity | ❌ | ✅ |
| Verify Redis connectivity | ❌ | ✅ |
| Check environment variables | ❌ | ✅ |
| Test authentication flows | ❌ | ✅ |
| CORS validation | ❌ | ✅ |
| Store debugging artifacts | ❌ | ✅ (screenshots, HAR files) |
| Native AWS integration | ❌ | ✅ |
| **Cost** | **$7/month** | **~$10/month** |

**Bottom line:** For $3 more per month, you get **actual API testing** instead of just pinging an endpoint.

## What The Canary Tests

### Test 1: Health Ready Endpoint
Validates `/health/ready` endpoint returns `status: "ready"` and checks:
- ✅ Database health check passed
- ✅ Redis health check passed
- ✅ Environment variables check passed
- ✅ Response time < 5 seconds

**Why this matters:** The latest outage showed the API in partial startup state for 9+ hours. This test would have caught it immediately.

### Test 2: CORS Headers
Validates CORS headers are present and correctly configured for the web app origin.

**Why this matters:** Broken CORS = web app can't talk to API.

### Test 3: Performance Check
Alerts if response time exceeds acceptable thresholds:
- Warning: > 2 seconds
- Alert: > 3 seconds

**Why this matters:** Catches performance degradation before users complain.

### Test 4: Authentication (Optional)
Uncomment in `api-health-canary.js` to test:
- Login endpoint
- Token generation
- Authenticated requests

**Why this matters:** Validates core user flows actually work.

## Cost Breakdown

**CloudWatch Synthetics Pricing:**
- $0.0012 per canary run
- 5-minute checks = 288 runs/day = 8,640 runs/month
- **Total: ~$10.37/month**

**What you get:**
- Comprehensive API testing every 5 minutes
- CloudWatch metrics and dashboards
- S3 storage for artifacts (logs, screenshots, HAR files)
- SNS alerts (email + SMS)
- Integration with AWS ecosystem

**Compared to:**
- UptimeRobot: $7/month for basic HTTP ping
- PagerDuty: $19/month for basic monitoring
- Pingdom: $10/month for basic checks

## Quick Start

### Prerequisites
- AWS CLI installed and configured
- AWS account with appropriate permissions
- Email address for alerts
- (Optional) Phone number for SMS alerts

### Deployment

```bash
cd aws/cloudwatch-synthetics
bash deploy-canary.sh
```

The script will prompt for:
1. Alert email address (default: support@mychristiancounselor.online)
2. Alert phone number (optional, for SMS)
3. Check interval (1, 5, 10, or 15 minutes - default: 5)
4. Environment (production or staging - default: production)

### Confirm SNS Subscriptions

After deployment:
1. Check your email and click the confirmation link
2. If you provided a phone number, reply "YES" to the SMS

**The canary will NOT send alerts until you confirm the subscription.**

## What Happens After Deployment

### Immediate
- Canary starts running within 5 minutes
- First test results appear in CloudWatch
- CloudWatch dashboard created

### Within 30 minutes
- Metrics accumulate
- Baseline established
- Alarms become active

### Ongoing
- Canary runs every X minutes (your configured interval)
- Metrics stored in CloudWatch
- Artifacts (logs, screenshots) stored in S3 for 30 days
- Alerts sent via SNS when issues detected

## Viewing Results

### CloudWatch Dashboard
1. Go to AWS Console → CloudWatch → Dashboards
2. Open "MyChristianCounselor-API-Health-production"
3. View:
   - Success rate graph
   - Response time graph
   - Failed vs successful runs

### Canary Details
1. Go to AWS Console → CloudWatch → Application Monitoring → Synthetics Canaries
2. Click on "api-health-production"
3. View:
   - Recent runs
   - Success/failure history
   - Screenshots (if enabled)
   - Logs
   - Metrics

### S3 Artifacts
```bash
# List canary artifacts
aws s3 ls s3://mychristiancounselor-canary-artifacts-{ACCOUNT_ID}/canary-artifacts/ --recursive

# Download specific run logs
aws s3 cp s3://mychristiancounselor-canary-artifacts-{ACCOUNT_ID}/canary-artifacts/{run-id}/logs/ ./logs/ --recursive
```

## Understanding Alerts

### Alert: Canary Failure
**Trigger:** Success rate drops below 90% over 5 minutes

**What it means:**
- API is down or returning errors
- Health checks failing (database, Redis, or environment)
- CORS broken
- Response time exceeded 5 seconds

**Response:**
1. Check CloudWatch logs for specific failure
2. Check API logs: `aws lightsail get-container-log --service-name api --container-name api --region us-east-2`
3. Check `/health/ready` endpoint directly
4. Verify deployment didn't just complete (expect brief downtime)

### Alert: High Latency
**Trigger:** Average response time > 3 seconds for 2 consecutive 5-minute periods

**What it means:**
- Performance degradation
- Database slow
- Redis slow
- High load

**Response:**
1. Check database performance
2. Check Redis performance
3. Check container CPU/memory usage
4. Consider scaling

### Alert: Canary Not Running
**Trigger:** No metrics received for 15 minutes

**What it means:**
- Canary stopped executing (shouldn't happen)
- AWS Synthetics service issue (rare)

**Response:**
1. Check canary status in AWS Console
2. Manually start canary if stopped
3. Contact AWS support if service issue

## Customizing The Canary

### Change Check Interval

```bash
# Update CloudFormation stack
aws cloudformation update-stack \
  --stack-name MyChristianCounselor-API-Health-Canary \
  --use-previous-template \
  --parameters ParameterKey=CanarySchedule,ParameterValue="rate(1 minute)" \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-2
```

### Enable Authentication Testing

Edit `api-health-canary.js`:

```javascript
// Uncomment the authentication test function at the bottom
await testAuthentication();
```

Set environment variables in CloudFormation:
- `TEST_USER_EMAIL` - Email for test account
- `TEST_USER_PASSWORD` - Password for test account

**Important:** Create a dedicated test account, don't use a real user.

### Add Custom Tests

Edit `api-health-canary.js` and add new test functions:

```javascript
const testCustomEndpoint = async () => {
  log.info('Testing custom endpoint...');
  const response = await makeRequest('GET', '/your-endpoint');
  // Add your validations
  log.info('✅ Custom test passed');
};

// Add to main handler
await testCustomEndpoint();
```

Redeploy:
```bash
bash deploy-canary.sh
```

## Troubleshooting

### Canary Always Failing
1. Check if API is actually down: `curl https://api.mychristiancounselor.online/health/ready`
2. Review canary logs in CloudWatch
3. Check if health endpoint changed
4. Verify canary has network access (shouldn't be an issue with AWS)

### Not Receiving Alerts
1. Confirm SNS subscription (check email/SMS)
2. Check spam folder
3. Verify alarm is enabled in CloudWatch
4. Check SNS topic has correct subscriptions

### High Costs
1. Review canary run frequency (reduce interval if needed)
2. Check S3 bucket size (artifacts automatically deleted after 30 days)
3. Disable canary temporarily:
   ```bash
   aws synthetics stop-canary --name api-health-production --region us-east-2
   ```

## Maintenance

### Update Canary Code
```bash
cd aws/cloudwatch-synthetics
# Edit api-health-canary.js
bash deploy-canary.sh  # Redeploy
```

### Delete Canary
```bash
aws cloudformation delete-stack \
  --stack-name MyChristianCounselor-API-Health-Canary \
  --region us-east-2
```

**Note:** This also deletes all artifacts and alarms.

### View Costs
```bash
# View CloudWatch Synthetics costs
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://filter.json

# filter.json:
{
  "Dimensions": {
    "Key": "SERVICE",
    "Values": ["Amazon CloudWatch"]
  }
}
```

## Integration with Existing Monitoring

### Sentry
CloudWatch Synthetics complements Sentry:
- **Sentry:** Captures errors from within the application
- **Synthetics:** Tests the application from outside

Together they provide complete coverage.

### AWS Lightsail Health Checks
- **Lightsail:** Internal health checks, tells AWS if container is healthy
- **Synthetics:** External checks, tells YOU if API is actually working

Both are needed.

## Files

- `api-health-canary.js` - Canary script (Node.js)
- `cloudformation-template.yaml` - Infrastructure as code
- `deploy-canary.sh` - Deployment script
- `README.md` - This file

## Support

For issues with:
- **This implementation:** Check GitHub issues or documentation
- **AWS Synthetics service:** AWS Support
- **CloudFormation deployment:** Check CloudFormation events in AWS Console

## References

- [AWS Synthetics Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html)
- [Synthetics Pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [Synthetics Runtimes](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library.html)

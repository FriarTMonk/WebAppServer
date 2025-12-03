# AWS Secrets Manager Integration

## Overview

AWS Secrets Manager provides secure storage for sensitive configuration like database credentials, API keys, and JWT secrets. This document explains how to integrate MyChristianCounselor with AWS Secrets Manager for production deployments.

---

## Why Use Secrets Manager?

### Benefits

✅ **Security:**
- Encrypted at rest with AWS KMS
- Encrypted in transit with TLS
- No secrets in code or .env files

✅ **Compliance:**
- Audit trail via CloudTrail
- Automatic rotation support
- Fine-grained IAM access control

✅ **Operational:**
- Centralized secret management
- Easy updates without redeployment
- Version history and rollback

### Cost

- **$0.40 per secret per month**
- **$0.05 per 10,000 API calls**
- Estimated: ~$5-10/month for production

---

## Setup Instructions

### Step 1: Create Secrets in AWS Console

#### 1.1 Navigate to Secrets Manager

```bash
# Via AWS Console
https://console.aws.amazon.com/secretsmanager/

# Or via AWS CLI
aws secretsmanager create-secret --name prod/mychristiancounselor/database \
  --secret-string '{"DATABASE_URL":"postgresql://user:pass@endpoint:5432/db?sslmode=require&connection_limit=20"}' \
  --region us-east-1
```

#### 1.2 Create Secrets

Create these secrets (one secret per category for easy rotation):

**Database Secret** (`prod/mychristiancounselor/database`):
```json
{
  "DATABASE_URL": "postgresql://user:password@rds-endpoint.rds.amazonaws.com:5432/mychristiancounselor_production?schema=public&sslmode=require&connection_limit=20&pool_timeout=20"
}
```

**JWT Secrets** (`prod/mychristiancounselor/jwt`):
```json
{
  "JWT_SECRET": "generated-48-character-base64-string-here",
  "JWT_REFRESH_SECRET": "another-generated-48-character-base64-string"
}
```

**OpenAI Secret** (`prod/mychristiancounselor/openai`):
```json
{
  "OPENAI_API_KEY": "sk-proj-your-openai-api-key-here"
}
```

**Postmark Secret** (`prod/mychristiancounselor/postmark`):
```json
{
  "POSTMARK_API_TOKEN": "your-postmark-api-token",
  "FROM_EMAIL": "noreply@mychristiancounselor.online"
}
```

**Stripe Secret** (`prod/mychristiancounselor/stripe`):
```json
{
  "STRIPE_SECRET_KEY": "sk_live_your-stripe-secret-key",
  "STRIPE_WEBHOOK_SECRET": "whsec_your-webhook-secret"
}
```

**Application Config** (`prod/mychristiancounselor/app`):
```json
{
  "WEB_APP_URL": "https://mychristiancounselor.online",
  "NODE_ENV": "production",
  "PORT": "3697"
}
```

**Sentry (Optional)** (`prod/mychristiancounselor/sentry`):
```json
{
  "SENTRY_DSN": "https://your-sentry-dsn@sentry.io/project"
}
```

#### 1.3 Generate Secure Secrets

```bash
# Generate JWT secrets (48 characters base64)
openssl rand -base64 48

# Example output:
# vK8H3mL9nP2qR4sT6uV8wX0yZ1aB3cD5eF7gH9iJ1kL3mN5oP7qR9sT1uV3wX5yZ
```

---

### Step 2: Configure ECS Task IAM Role

#### 2.1 Create IAM Policy

Create `SecretsManagerReadPolicy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:*:secret:prod/mychristiancounselor/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:*:key/*"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

#### 2.2 Attach Policy to ECS Task Role

```bash
# Create policy
aws iam create-policy \
  --policy-name MyChristianCounselor-SecretsAccess \
  --policy-document file://SecretsManagerReadPolicy.json

# Attach to ECS task role
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/MyChristianCounselor-SecretsAccess
```

---

### Step 3: Update Application Code

#### 3.1 Install AWS SDK

```bash
cd packages/api
npm install @aws-sdk/client-secrets-manager
```

#### 3.2 Create Secrets Service

Create `packages/api/src/common/secrets/secrets.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly client: SecretsManagerClient;
  private secretsCache: Map<string, any> = new Map();

  constructor() {
    // Initialize AWS Secrets Manager client
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Fetch secret from AWS Secrets Manager
   * Caches result to reduce API calls
   */
  async getSecret(secretName: string): Promise<any> {
    // Return cached value if available
    if (this.secretsCache.has(secretName)) {
      return this.secretsCache.get(secretName);
    }

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no string value`);
      }

      // Parse JSON secret
      const secret = JSON.parse(response.SecretString);

      // Cache for 5 minutes
      this.secretsCache.set(secretName, secret);
      setTimeout(() => this.secretsCache.delete(secretName), 5 * 60 * 1000);

      this.logger.log(`Successfully loaded secret: ${secretName}`);
      return secret;
    } catch (error) {
      this.logger.error(`Failed to load secret ${secretName}:`, error);
      throw error;
    }
  }

  /**
   * Load all application secrets at startup
   */
  async loadAllSecrets(): Promise<Record<string, any>> {
    const secretPrefix = process.env.SECRET_PREFIX || 'prod/mychristiancounselor';

    try {
      const secrets = await Promise.all([
        this.getSecret(`${secretPrefix}/database`),
        this.getSecret(`${secretPrefix}/jwt`),
        this.getSecret(`${secretPrefix}/openai`),
        this.getSecret(`${secretPrefix}/postmark`),
        this.getSecret(`${secretPrefix}/stripe`),
        this.getSecret(`${secretPrefix}/app`),
      ]);

      // Merge all secrets into single object
      const merged = Object.assign({}, ...secrets);

      this.logger.log('✅ All secrets loaded successfully');
      return merged;
    } catch (error) {
      this.logger.error('❌ Failed to load secrets:', error);
      throw error;
    }
  }

  /**
   * Clear secrets cache (useful for testing)
   */
  clearCache(): void {
    this.secretsCache.clear();
  }
}
```

#### 3.3 Create Secrets Module

Create `packages/api/src/common/secrets/secrets.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  providers: [SecretsService],
  exports: [SecretsService],
})
export class SecretsModule {}
```

#### 3.4 Update main.ts to Load Secrets

Modify `packages/api/src/main.ts`:

```typescript
import { SecretsService } from './common/secrets/secrets.service';

async function loadSecretsIfProduction(): Promise<void> {
  // Only load from Secrets Manager in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️  Development mode: using .env file');
    return;
  }

  console.log('🔐 Loading secrets from AWS Secrets Manager...');

  const secretsService = new SecretsService();
  const secrets = await secretsService.loadAllSecrets();

  // Inject secrets into process.env
  Object.keys(secrets).forEach((key) => {
    process.env[key] = secrets[key];
  });

  console.log('✅ Secrets loaded successfully');
}

async function bootstrap() {
  // Load secrets before creating NestJS app
  await loadSecretsIfProduction();

  // Validate environment variables
  validateEnvironment();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // ... rest of bootstrap code
}

bootstrap();
```

---

### Step 4: Update ECS Task Definition

#### 4.1 Option A: Environment Variables (Simple)

ECS task definition with minimal environment variables:

```json
{
  "family": "mychristiancounselor-api",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:latest",
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        },
        {
          "name": "SECRET_PREFIX",
          "value": "prod/mychristiancounselor"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mychristiancounselor-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 4.2 Option B: Secrets Reference (AWS Native)

ECS can inject secrets directly:

```json
{
  "containerDefinitions": [
    {
      "name": "api",
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:prod/mychristiancounselor/database:DATABASE_URL::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:prod/mychristiancounselor/jwt:JWT_SECRET::"
        }
      ]
    }
  ]
}
```

**Recommendation:** Use Option A (load in code) for better error handling and caching.

---

### Step 5: Deployment

#### 5.1 Update Dockerfile

Ensure AWS SDK is installed:

```dockerfile
# packages/api/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/

# Install dependencies (includes AWS SDK)
RUN npm ci --only=production

# Copy application code
COPY packages/api ./packages/api

# Expose port
EXPOSE 3697

# Start application
CMD ["node", "packages/api/dist/main.js"]
```

#### 5.2 Deploy to ECS

```bash
# Build and push Docker image
docker build -t mychristiancounselor-api:latest .
docker tag mychristiancounselor-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/mychristiancounselor-api:latest

# Update ECS service
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --force-new-deployment
```

#### 5.3 Verify Deployment

```bash
# Check ECS task logs
aws logs tail /ecs/mychristiancounselor-api --follow

# Expected output:
# 🔐 Loading secrets from AWS Secrets Manager...
# ✅ Secrets loaded successfully
# ✅ Environment validation passed
# 🚀 API server running on http://localhost:3697
```

---

## Local Development

For local development, continue using `.env` files:

```bash
# .env file (not committed to git)
DATABASE_URL="postgresql://localhost:5432/mydb"
JWT_SECRET="local-dev-secret-key-32-chars-minimum"
# ... other dev values
```

Application automatically uses `.env` when `NODE_ENV !== 'production'`.

---

## Secret Rotation

### Manual Rotation

```bash
# Update secret value
aws secretsmanager update-secret \
  --secret-id prod/mychristiancounselor/jwt \
  --secret-string '{"JWT_SECRET":"new-secret-value"}'

# Restart ECS tasks to pick up new value
aws ecs update-service \
  --cluster mychristiancounselor-prod \
  --service api \
  --force-new-deployment
```

### Automatic Rotation (Advanced)

Set up Lambda function for automatic rotation:

```bash
aws secretsmanager rotate-secret \
  --secret-id prod/mychristiancounselor/database \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:ACCOUNT_ID:function:RotateRDSCredentials \
  --rotation-rules AutomaticallyAfterDays=30
```

---

## Security Best Practices

### ✅ DO

1. **Use IAM roles, not access keys:**
   - ECS task roles automatically provide credentials
   - No hardcoded AWS credentials needed

2. **Limit secret access:**
   - Use specific ARN patterns in IAM policies
   - Don't grant `secretsmanager:*` permissions

3. **Enable CloudTrail logging:**
   ```bash
   aws cloudtrail create-trail \
     --name mychristiancounselor-audit \
     --s3-bucket-name audit-logs-bucket
   ```

4. **Tag secrets for organization:**
   ```bash
   aws secretsmanager tag-resource \
     --secret-id prod/mychristiancounselor/database \
     --tags Key=Environment,Value=production Key=Application,Value=MyChristianCounselor
   ```

5. **Use VPC endpoints for Secrets Manager:**
   - Keeps traffic within AWS network
   - Reduces data transfer costs

### ❌ DON'T

1. **Don't log secret values:**
   ```typescript
   // ❌ BAD
   logger.log(`Database URL: ${process.env.DATABASE_URL}`);

   // ✅ GOOD
   logger.log('Database connection established');
   ```

2. **Don't commit secrets to git:**
   - Always use `.env` files (in `.gitignore`)
   - Never hardcode secrets in code

3. **Don't share secrets across environments:**
   - Use `dev/`, `staging/`, `prod/` prefixes
   - Separate AWS accounts for production

4. **Don't grant overly broad IAM permissions:**
   - Use least privilege principle
   - Scope to specific secret ARNs

---

## Troubleshooting

### Error: "AccessDeniedException"

**Cause:** ECS task role doesn't have permission to read secrets.

**Solution:**
```bash
# Verify IAM policy is attached
aws iam list-attached-role-policies --role-name ecsTaskRole

# Attach policy if missing
aws iam attach-role-policy \
  --role-name ecsTaskRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/MyChristianCounselor-SecretsAccess
```

### Error: "SecretNotFoundException"

**Cause:** Secret name or ARN is incorrect.

**Solution:**
```bash
# List all secrets
aws secretsmanager list-secrets

# Verify secret exists
aws secretsmanager describe-secret \
  --secret-id prod/mychristiancounselor/database
```

### Error: "RequestTimeoutException"

**Cause:** Network connectivity issues to Secrets Manager.

**Solution:**
1. Check VPC security groups allow outbound HTTPS
2. Verify NAT Gateway is configured (for private subnets)
3. Consider adding VPC endpoint for Secrets Manager

---

## Cost Optimization

### Reduce API Calls

**Use caching** (already implemented in SecretsService):
- Cache secrets for 5 minutes
- Reduces API calls from 1000s/hour to ~12/hour per secret

### Consolidate Secrets

**Group related secrets:**
```json
// Instead of 7 separate secrets ($2.80/month)
// Use 3 grouped secrets ($1.20/month)

{
  "database": {...},
  "external-services": { "openai": "...", "postmark": "...", "stripe": "..." },
  "app-config": {...}
}
```

### Monitor Costs

```bash
# Check Secrets Manager usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/SecretsManager \
  --metric-name SecretCount \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-31T23:59:59Z \
  --period 86400 \
  --statistics Average
```

---

## Checklist

Before going to production:

- [ ] All secrets created in AWS Secrets Manager
- [ ] Secrets organized with `prod/mychristiancounselor/` prefix
- [ ] IAM policy created and attached to ECS task role
- [ ] SecretsService implemented and tested
- [ ] Application loads secrets at startup in production mode
- [ ] CloudTrail enabled for audit logging
- [ ] No secrets committed to git repository
- [ ] `.env` files in `.gitignore`
- [ ] Secrets rotation plan documented
- [ ] Team trained on secret management procedures
- [ ] Monitoring set up for failed secret retrievals

---

## Resources

- [AWS Secrets Manager Pricing](https://aws.amazon.com/secrets-manager/pricing/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-secrets-manager/)
- [ECS Task IAM Roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- [Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)

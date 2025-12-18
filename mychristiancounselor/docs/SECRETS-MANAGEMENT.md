# Secrets Management Guide

## ⚠️ CRITICAL SECURITY NOTICE

Production secrets were accidentally committed to git history and should be considered **COMPROMISED**.

The file `lightsail-api-env.json` was tracked in git and contained:
- Database password
- JWT secrets
- OpenAI API key
- Anthropic API key
- Stripe secret keys
- Postmark API key

**Status:** These files have been removed from git tracking but remain in git history.

## Required Actions

### 1. Rotate All Secrets Immediately

| Secret | Action Required | Priority |
|--------|----------------|----------|
| Database Password | Change RDS password and update Lightsail env vars | 🔴 CRITICAL |
| JWT_SECRET | Generate new secret: `openssl rand -base64 64` | 🔴 CRITICAL |
| JWT_REFRESH_SECRET | Generate new secret: `openssl rand -base64 64` | 🔴 CRITICAL |
| OPENAI_API_KEY | Revoke old key, generate new key in OpenAI dashboard | 🔴 CRITICAL |
| ANTHROPIC_API_KEY | Revoke old key, generate new key in Anthropic console | 🔴 CRITICAL |
| STRIPE_SECRET_KEY | Rotate in Stripe dashboard (keep publishable key) | 🔴 CRITICAL |
| STRIPE_WEBHOOK_SECRET | Regenerate webhook endpoint in Stripe | 🟡 HIGH |
| POSTMARK_API_KEY | Rotate in Postmark dashboard | 🟡 HIGH |

### 2. Update Deployment Configuration

After rotating secrets, update them in:
1. `lightsail-api-env.json` (local file, NOT in git)
2. `lightsail-api-deployment.json` (local file, NOT in git)
3. AWS Lightsail container service environment variables

## Proper Secrets Management

### Files That Should NEVER Be In Git

These files contain secrets and are in `.gitignore`:

```
lightsail-*.json          # ALL Lightsail deployment configs
*-env.json                # Environment variable files
*-deployment.json         # Deployment configuration files
.env                      # Local environment files
.env.local
.env.*.local
*.env
```

### Secret Files Location (Local Only)

```
/mychristiancounselor/
├── lightsail-api-env.json          # API secrets (NOT in git)
├── lightsail-api-deployment.json    # API deployment with secrets (NOT in git)
├── lightsail-web-deployment.json    # Web deployment config (NOT in git)
└── packages/
    ├── api/
    │   └── .env                      # Local API env (NOT in git)
    └── web/
        └── .env.production           # Public Next.js vars (NOT in git)
```

### Example Files That CAN Be In Git

These files contain NO secrets and serve as templates:

```
/mychristiancounselor/
├── .env.example                      # Template showing required variables
├── packages/
    ├── api/
    │   ├── .env.example              # API variables template
    │   └── .env.production.example    # Production template
    └── web/
        └── .env.example               # Web variables template
```

## Setting Up Secrets for New Developers

1. **Copy Example Files:**
   ```bash
   cp .env.example .env
   cp packages/api/.env.example packages/api/.env
   cp packages/web/.env.example packages/web/.env.production
   ```

2. **Request Secrets:**
   - Contact the team lead for production secrets
   - Development secrets can use dummy values or development keys

3. **Never Commit:**
   - Double-check with `git status` before committing
   - The `.gitignore` should prevent accidental commits

## Lightsail Deployment Secrets

Secrets are managed in two places:

### 1. Local Files (NOT in git)

- `lightsail-api-env.json` - Contains all API environment variables including secrets
- `lightsail-api-deployment.json` - Full deployment config with embedded secrets
- `lightsail-web-deployment.json` - Web deployment config

### 2. AWS Lightsail Console

Environment variables are also stored in the Lightsail container service configuration.
Update them via:
- AWS Lightsail Console → Container services → Edit environment variables
- OR via deployment JSON files using AWS CLI

## How to Deploy Safely

The deployment script (`scripts/deploy-soft-launch.sh`) uses the local JSON files:

```bash
# Build and deploy
bash scripts/deploy-soft-launch.sh
```

This script reads from:
- `lightsail-api-deployment.json` (local, contains secrets)
- `lightsail-web-deployment.json` (local, mostly public config)

**These files must exist locally but should NEVER be committed to git.**

## Removing Secrets from Git History

If you need to completely remove secrets from git history (recommended for public repos):

```bash
# DANGER: This rewrites git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch lightsail-api-env.json' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (only if coordinated with team)
git push origin --force --all
```

**Note:** This only works if:
- Repository is private or internal
- All team members coordinate to re-clone
- No one else has pulled the commits with secrets

## Best Practices

1. ✅ **DO:**
   - Keep secrets in local files that are in `.gitignore`
   - Use example files to show what variables are needed
   - Rotate secrets regularly
   - Use different secrets for dev/staging/production
   - Store production secrets in a password manager

2. ❌ **DON'T:**
   - Never commit files containing secrets
   - Don't share secrets via email/Slack
   - Don't hardcode secrets in source code
   - Don't commit .env files even if they "only have public values"

## Emergency Response

If secrets are accidentally committed:

1. **Immediately:**
   - Remove file from git: `git rm --cached <file>`
   - Commit the removal
   - Rotate ALL secrets in that file

2. **Within 24 hours:**
   - Update all deployed environments with new secrets
   - Check logs for unauthorized access
   - Consider removing from git history

3. **Document:**
   - Log the incident
   - Document which secrets were exposed and when
   - Record rotation dates

## Questions?

Contact the DevOps lead or security team if you:
- Need access to production secrets
- Accidentally commit a secret
- Notice suspicious activity
- Have questions about secret management

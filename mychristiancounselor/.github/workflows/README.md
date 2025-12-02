# GitHub Actions Workflows

This directory contains CI/CD workflows for MyChristianCounselor.

## Available Workflows

### 1. CI Pipeline (`ci.yml`)
**Trigger:** Push to main/master/develop, Pull Requests

**Jobs:**
- **Lint and Test:** Runs linting and unit tests with PostgreSQL service
- **Build:** Builds API and Web applications
- **Docker Build:** Builds Docker images (push events only)

**Required Secrets:** None (uses default GitHub token)

### 2. Security Scanning (`security.yml`)
**Trigger:** Push to main/master, Pull Requests, Weekly schedule

**Jobs:**
- **Dependency Scan:** Runs npm audit for known vulnerabilities
- **CodeQL Analysis:** Static code analysis for security issues
- **Secret Scanning:** Scans for accidentally committed secrets

**Required Secrets:** None

### 3. Deployment (`deploy.yml.example`)
**Status:** Template file - needs configuration

**Setup Instructions:**
1. Copy `deploy.yml.example` to `deploy.yml`
2. Choose your deployment option (Docker/AWS/Kubernetes)
3. Comment out unused deployment options
4. Add required secrets to GitHub repository settings

**Required Secrets (for Docker option):**
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password/token
- `DEPLOY_HOST` - Production server hostname
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key for deployment
- `PRODUCTION_URL` - Production URL for smoke tests
- `SLACK_WEBHOOK` (optional) - Slack notifications

## Setup Instructions

### For Private Repositories
All workflows are ready to use. Push to your repository to trigger them.

### For Public Repositories
Enable the following in repository settings:
1. Go to Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Enable "Read and write permissions" for GITHUB_TOKEN

### Adding Secrets
1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add required secrets based on your deployment method

## Local Testing

### Test CI Workflow Locally (using act)
```bash
# Install act: https://github.com/nektos/act
npm install -g act

# Run CI workflow
act pull_request

# Run specific job
act -j lint-and-test
```

### Test Docker Builds Locally
```bash
# Build API
docker build -t mcc-api:test -f packages/api/Dockerfile .

# Build Web
docker build -t mcc-web:test -f packages/web/Dockerfile .

# Test with docker-compose
docker-compose up
```

## Monitoring Workflow Runs

View workflow runs:
- Go to repository → Actions tab
- Click on a workflow to see details
- View logs, artifacts, and test results

## Troubleshooting

### Build Failures
- Check Node.js version (should be 20+)
- Ensure all dependencies are in package.json
- Verify Prisma schema is valid

### Test Failures
- Check PostgreSQL service is running
- Verify DATABASE_URL is correct
- Ensure JWT_SECRET is set

### Deployment Failures
- Verify all required secrets are set
- Check SSH key has correct permissions
- Ensure deployment server is accessible

## Best Practices

1. **Always run CI before merging PRs**
2. **Review security scan results weekly**
3. **Test deployments in staging first**
4. **Keep secrets rotated regularly**
5. **Monitor workflow run times**
6. **Use branch protection rules**

## Branch Protection Rules (Recommended)

Go to Settings → Branches → Add rule:
- Branch name pattern: `main` or `master`
- ✅ Require status checks to pass before merging
  - Select: `Lint and Test` and `Build`
- ✅ Require pull request reviews before merging
- ✅ Require linear history
- ✅ Include administrators

## Cost Optimization

GitHub Actions is free for public repositories and includes:
- **Private repos:** 2,000 minutes/month (free tier)
- **Public repos:** Unlimited minutes

Tips to reduce usage:
- Use caching for dependencies
- Run tests in parallel
- Skip unnecessary jobs with `if` conditions
- Use self-hosted runners for heavy workloads

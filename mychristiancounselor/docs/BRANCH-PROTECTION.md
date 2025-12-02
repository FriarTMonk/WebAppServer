# Branch Protection Configuration

This document explains how to set up branch protection rules for the master branch to ensure all tests pass before merging.

## GitHub Branch Protection Setup

Follow these steps to configure branch protection on GitHub:

### 1. Navigate to Repository Settings

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Click **Branches** in the left sidebar

### 2. Add Branch Protection Rule

1. Click **Add rule** or **Add branch protection rule**
2. In **Branch name pattern**, enter: `master`

### 3. Configure Protection Rules

Enable the following options:

#### Required Status Checks
- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - Search and select the following required checks:
    - `Run Tests`
    - `Lint Code`
    - `All Checks Passed`

#### Additional Recommended Settings
- ✅ **Require a pull request before merging**
  - Required approvals: 1 (adjust based on team size)
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  
- ✅ **Require conversation resolution before merging**
  
- ✅ **Do not allow bypassing the above settings** (unless you need admin override)

### 4. Save Changes

Click **Create** or **Save changes** at the bottom of the page.

## What This Protects Against

With these settings enabled:

1. ❌ **Cannot merge** if any test fails
2. ❌ **Cannot merge** if TypeScript compilation fails
3. ❌ **Cannot merge** if code coverage drops below 70%
4. ❌ **Cannot merge** if branch is not up-to-date with master
5. ✅ **Can only merge** after all checks pass

## CI Workflow Details

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on:
- Every push to master
- Every pull request targeting master

### Jobs Included:

1. **Test Job**
   - Runs full test suite with coverage
   - Fails if any test fails
   - Fails if coverage < 70%
   - Uploads coverage report to Codecov (optional)

2. **Lint Job**
   - Runs TypeScript compiler check
   - Catches type errors and compilation issues

3. **All Checks Job**
   - Aggregates results from all jobs
   - Provides single status for branch protection

## Testing Locally Before Push

To ensure your changes will pass CI:

```bash
# Clear Jest cache
npx jest --clearCache

# Run tests from api directory
cd packages/api
npx jest --coverage

# Check TypeScript compilation
npx tsc --noEmit
```

## Troubleshooting

### Tests Pass Locally But Fail in CI

1. Clear local Jest cache: `npx jest --clearCache`
2. Run tests with same Node version as CI (18.x)
3. Check environment variables are properly mocked

### Coverage Threshold Failure

If coverage drops below 70%:
1. Add tests for new code
2. Review untested code paths
3. Run `npx jest --coverage` to see detailed report

### TypeScript Compilation Errors

Run `npx tsc --noEmit` locally to catch issues before pushing.

## Bypassing Protection (Emergency Only)

If you have admin access and need to bypass protection:
1. Go to Settings → Branches
2. Temporarily disable "Do not allow bypassing"
3. Merge the PR
4. **Immediately re-enable protection**

⚠️ This should only be used for emergencies (e.g., fixing production outage).

## Status Badge

Add this badge to your README.md to show CI status:

```markdown
![CI Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/ci.yml/badge.svg)
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual GitHub details.

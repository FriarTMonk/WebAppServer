# Update Staging Environment with Live Stripe Keys

## Quick Guide: Add Live Stripe Keys to Lightsail Staging

### Step 1: Access Lightsail Console

1. Go to: https://lightsail.aws.amazon.com/ls/webapp/home/containers
2. Find and click your staging service: `mychristiancounselor-api` (or similar staging name)

### Step 2: Update Environment Variables

1. Click the **Deployments** tab
2. Click **Modify your deployment**
3. Scroll to **Environment variables** section
4. Update these variables:

   **Update:**
   ```
   STRIPE_SECRET_KEY = sk_live_YOUR_LIVE_KEY_HERE
   STRIPE_WEBHOOK_SECRET = whsec_YOUR_LIVE_WEBHOOK_SECRET
   ```

   **Add (if using different price IDs for live mode):**
   ```
   STRIPE_MONTHLY_PRICE_ID = price_YOUR_LIVE_MONTHLY_ID
   STRIPE_ANNUAL_PRICE_ID = price_YOUR_LIVE_ANNUAL_ID
   STRIPE_ORG_GRADUATED_PRICE_ID = price_YOUR_LIVE_ORG_ID
   ```

5. Click **Save and deploy**
6. Wait 5-10 minutes for deployment to complete

### Step 3: Configure Live Webhook in Stripe

1. Go to: https://dashboard.stripe.com/webhooks
2. Switch to **Live mode** (toggle in top right)
3. Click **Add endpoint**
4. **Endpoint URL:** `https://api.mychristiancounselor.online/subscriptions/webhook`
   - Or your staging API URL: `https://staging-api.mychristiancounselor.online/subscriptions/webhook`
5. **Events to listen for:**
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **Add endpoint**
7. **Copy the webhook signing secret** (starts with `whsec_...`)
8. Go back to Lightsail and update `STRIPE_WEBHOOK_SECRET` with this value

### Step 4: Verify Connection

Test the connection by running our validation script:

```bash
# SSH into staging container (or run locally pointing to staging)
curl https://api.mychristiancounselor.online/health/live

# Should return: {"status":"ok"}
```

Or create a test script to verify Stripe connection works in staging.

---

## Option 2: Via AWS CLI (Alternative)

### Get Current Deployment Config

```bash
# Get service name
aws lightsail get-container-services \
  --query "containerServices[?contains(serviceName, 'mychristiancounselor')].[serviceName]" \
  --output table

# Export current deployment
aws lightsail get-container-services \
  --service-name YOUR_SERVICE_NAME \
  --query "containerServices[0].currentDeployment" > current-deployment.json
```

### Update Environment Variables

Edit `current-deployment.json` and update the environment variables in the containers section:

```json
{
  "containers": {
    "api": {
      "environment": {
        "STRIPE_SECRET_KEY": "sk_live_YOUR_LIVE_KEY",
        "STRIPE_WEBHOOK_SECRET": "whsec_YOUR_LIVE_WEBHOOK_SECRET",
        "STRIPE_MONTHLY_PRICE_ID": "price_YOUR_LIVE_MONTHLY_ID",
        "STRIPE_ANNUAL_PRICE_ID": "price_YOUR_LIVE_ANNUAL_ID"
      }
    }
  }
}
```

### Create New Deployment

```bash
aws lightsail create-container-service-deployment \
  --service-name YOUR_SERVICE_NAME \
  --cli-input-json file://current-deployment.json
```

---

## Security Checklist

Before adding live keys, ensure:

- [ ] Staging environment is password-protected or access-restricted
- [ ] You're comfortable testing with real payment processing
- [ ] You have a way to refund test payments if needed
- [ ] Stripe webhook points to the correct staging URL
- [ ] You're monitoring Stripe dashboard for any issues

---

## Post-Update Verification

After updating, verify everything works:

### 1. Check Container Logs
```bash
aws lightsail get-container-log \
  --service-name YOUR_SERVICE_NAME \
  --container-name api
```

Look for:
- ✅ No Stripe initialization errors
- ✅ "Stripe API Key found" message
- ❌ No "Stripe not configured" warnings

### 2. Test Subscription Flow
1. Go to: https://staging.mychristiancounselor.online/subscribe
2. Click "Subscribe Monthly"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Verify checkout works
5. Check webhook delivery in Stripe dashboard

### 3. Check Database
```bash
# Verify subscription was created
psql $DATABASE_URL -c "SELECT id, email, subscriptionStatus FROM \"User\" WHERE subscriptionStatus = 'active';"
```

---

## Rollback Plan

If something goes wrong:

1. Go back to Lightsail console
2. Click **Deployments** tab
3. Find previous deployment
4. Click **Modify and redeploy**
5. Revert `STRIPE_SECRET_KEY` to test key (`sk_test_...`)
6. Click **Save and deploy**

---

## Troubleshooting

### Error: "No such customer"
- Live mode doesn't have test customers
- Create new subscription in live mode

### Error: "No such price"
- You're using test price IDs with live secret key
- Create live prices or update environment variables

### Webhook not receiving events
- Check webhook URL is correct
- Verify webhook secret matches Stripe dashboard
- Check Stripe dashboard → Webhooks → Attempts

### Container won't start
- Check logs for environment variable errors
- Verify all required env vars are set
- Ensure DATABASE_URL is accessible from container

---

## Important Notes

⚠️ **Using Live Keys in Staging:**
- You'll process real payments (can be refunded)
- Use Stripe test cards to avoid real charges
- Monitor Stripe dashboard carefully
- Consider using Stripe test mode even in staging until production launch

💡 **Alternative: Keep Test Keys in Staging**
- Only use live keys in production
- Keep staging with test keys
- This prevents accidental real charges during testing

---

## Next Steps

Once live keys are added and verified:

1. Test complete subscription flow
2. Verify webhook events are received
3. Test payment failure scenarios
4. Test subscription cancellation
5. Monitor Stripe dashboard for any issues
6. When ready, deploy to production with same configuration

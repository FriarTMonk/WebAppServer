# Stripe Live Webhook Setup Guide

## Step-by-Step Instructions

### 1. Go to Stripe Dashboard
Open: https://dashboard.stripe.com/webhooks

### 2. Switch to Live Mode
Look in the top right corner - toggle from "Test mode" to "Live mode"

### 3. Add Endpoint
1. Click **"Add endpoint"** button
2. **Endpoint URL**: `https://api.mychristiancounselor.online/subscriptions/webhook`
3. **Description**: "Production subscription events"

### 4. Select Events to Listen For
Click **"Select events"** and choose these:

**Customer events:**
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

**Invoice events:**
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### 5. Add Endpoint
Click **"Add endpoint"** button at the bottom

### 6. Get Signing Secret
1. Click on the newly created endpoint
2. In the "Signing secret" section, click **"Reveal"**
3. Copy the secret (starts with `whsec_...`)
4. **Paste it back here**

---

## What the Webhook Does

When users subscribe, cancel, or payments succeed/fail:
1. Stripe sends event to your API
2. API verifies signature using webhook secret
3. API updates database and sends emails
4. User's subscription status is kept in sync

---

## After Setup

Once you provide the webhook secret, I'll:
1. Update your Lightsail deployment
2. Test the webhook connection
3. Verify events are being received

# Stripe Integration Setup Guide

## What Was Added

Three Netlify serverless functions handle all Stripe operations securely:

| Function | What it does |
|----------|-------------|
| `create-checkout.js` | Creates Stripe Checkout sessions for paid tiers |
| `customer-portal.js` | Opens Stripe Customer Portal for managing subscriptions |
| `webhook.js` | Receives Stripe events (payment success, cancellation) |

The frontend Pricing page now redirects to Stripe Checkout for paid tiers.

---

## Step 1: Create Your Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete registration (takes 2 minutes)
3. You start in **Test Mode** — perfect for testing

---

## Step 2: Create Products & Prices

In your Stripe Dashboard:

### Pro Plan (£19.99/month)
1. Products → Add Product
2. Name: **Anglotec AI Pro**
3. Price: **19.99 GBP**
4. Billing: **Recurring** → Monthly
5. Click **Save**
6. Copy the **Price ID** (looks like `price_1ABC...`) — this is `STRIPE_PRICE_PRO`

### Family Plan (£39.99/month)
1. Products → Add Product
2. Name: **Anglotec AI Family**
3. Price: **39.99 GBP**
4. Billing: **Recurring** → Monthly
5. Copy the **Price ID** — this is `STRIPE_PRICE_FAMILY`

### Classroom Plan (£200/month)
1. Products → Add Product
2. Name: **Anglotec AI Classroom**
3. Price: **200.00 GBP**
4. Billing: **Recurring** → Monthly
5. Copy the **Price ID** — this is `STRIPE_PRICE_CLASSROOM`

---

## Step 3: Get Your API Keys

1. In Stripe Dashboard, click **Developers** (top right)
2. Go to **API Keys**
3. Copy **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for live)
4. This is your `STRIPE_SECRET_KEY`

---

## Step 4: Add Environment Variables to Netlify

1. Go to https://app.netlify.com/sites
2. Click your **masterclass** site
3. **Site configuration** → **Environment variables**
4. Add these variables:

| Key | Value | Example |
|-----|-------|---------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_PRICE_PRO` | Price ID for Pro | `price_1ABC...` |
| `STRIPE_PRICE_FAMILY` | Price ID for Family | `price_1DEF...` |
| `STRIPE_PRICE_CLASSROOM` | Price ID for Classroom | `price_1GHI...` |
| `SUPABASE_URL` | Your Supabase URL | `https://....supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | `eyJ...` |

5. Click **Save**

---

## Step 5: Configure Webhook (for automatic subscription updates)

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://masterclass.anglotec-ai.com/.netlify/functions/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Netlify environment variables as `STRIPE_WEBHOOK_SECRET`

---

## Step 6: Test the Flow

1. Open your site: https://masterclass.anglotec-ai.com
2. Log in
3. Go to **Pricing**
4. Click **Start Free Trial** on Pro
5. You should be redirected to Stripe Checkout (test mode)
6. Use Stripe test card: `4242 4242 4242 4242`
7. Any future date, any CVC, any ZIP
8. Click **Subscribe**
9. After success, you'll return to Settings with a success message

---

## Switching to Live Mode

When ready for production:

1. In Stripe Dashboard, toggle **Test mode** OFF (top right)
2. Repeat Step 2 to create live products & prices
3. Copy the **live** Price IDs
4. Update Netlify env vars with live `sk_live_...` keys
5. Update the webhook endpoint to use the live webhook secret
6. Redeploy (or the env vars update automatically)

---

## What Users See

| Action | What happens |
|--------|-------------|
| Click "Start Trial" | Redirected to Stripe Checkout with 14-day free trial |
| Payment success | Returns to Settings, subscription activated |
| Payment cancelled | Returns to Pricing, can try again |
| "Manage Subscription" | Opens Stripe Customer Portal (update card, cancel, etc.) |
| Webhook received | Auto-upgrades user tier in Supabase database |

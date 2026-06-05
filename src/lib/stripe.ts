/**
 * Stripe Frontend Integration
 * Calls Netlify Functions to create checkout sessions and manage subscriptions
 *
 * Environment variables needed in Netlify:
 * - STRIPE_SECRET_KEY (server-side only, in Netlify Functions)
 *
 * No Stripe keys needed in the frontend — everything goes through Netlify Functions
 */

const API_BASE = "/.netlify/functions";

interface CheckoutOptions {
  tier: "pro" | "family" | "classroom";
  customerEmail: string;
  billingCycle?: "monthly" | "yearly";
}

interface CheckoutResult {
  sessionId: string;
  url: string;
  tier: string;
  price: string;
}

/**
 * Create a Stripe Checkout session and return the URL for redirect
 */
export async function createCheckoutSession(options: CheckoutOptions): Promise<CheckoutResult> {
  const res = await fetch(`${API_BASE}/create-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tier: options.tier,
      customerEmail: options.customerEmail,
      billingCycle: options.billingCycle || "monthly",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create checkout session");
  }
  return data;
}

/**
 * Redirect to Stripe Checkout for a subscription
 */
export async function redirectToStripePayment(
  tier: "pro" | "family" | "classroom",
  customerEmail: string,
  billingCycle: "monthly" | "yearly" = "monthly"
): Promise<void> {
  const result = await createCheckoutSession({ tier, customerEmail, billingCycle });
  if (result.url) {
    window.location.href = result.url;
  } else {
    throw new Error("No checkout URL received");
  }
}

/**
 * Open Stripe Customer Portal for managing/cancelling subscriptions
 */
export async function openCustomerPortal(customerEmail: string, returnUrl?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/customer-portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerEmail,
      returnUrl: returnUrl || `${window.location.origin}/#/settings`,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to open customer portal");
  }
  return data.url;
}

/**
 * Check subscription status from Stripe
 */
export async function checkSubscription(email: string): Promise<{
  tier: SubscriptionTier;
  status: string;
  trialEndsAt?: number;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/check-subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return res.json();
}

export type SubscriptionTier = "free" | "pro" | "family" | "classroom";

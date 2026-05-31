/**
 * Stripe integration placeholder.
 * 
 * For real payments: Create Stripe Payment Links at dashboard.stripe.com
 * and paste URLs below. Until then, plans activate locally for full access.
 */

const STRIPE_PAYMENT_LINKS = {
  pro_monthly:    "",
  pro_yearly:     "",
  family_monthly: "",
  family_yearly:  "",
};

const isConfigured = !!STRIPE_PAYMENT_LINKS.pro_monthly;

export function getStripePaymentUrl(tier: "pro" | "family" | "classroom", billingCycle: "monthly" | "yearly" = "monthly"): string {
  const key = `${tier}_${billingCycle}` as keyof typeof STRIPE_PAYMENT_LINKS;
  return STRIPE_PAYMENT_LINKS[key] || "";
}

export function redirectToStripePayment(tier: "pro" | "family" | "classroom", billingCycle: "monthly" | "yearly" = "monthly") {
  const url = getStripePaymentUrl(tier, billingCycle);
  if (!url) {
    throw new Error("Stripe not configured");
  }
  window.location.href = url;
}

export function redirectToCustomerPortal(url: string) {
  window.location.href = url;
}

export { isConfigured };

/**
 * Netlify Function: Create Stripe Checkout Session
 * Reuses existing products/prices — no duplicate products in Stripe dashboard
 * ONE env var required: STRIPE_SECRET_KEY
 */

const STRIPE_API = "https://api.stripe.com/v1";

// Monthly pricing in pence (GBP)
const PLANS = {
  pro:          { amount: 1999,  name: "Pro — AI Masterclass" },
  family:       { amount: 3999,  name: "Family — AI Masterclass" },
  classroom:    { amount: 20000, name: "Classroom — AI Masterclass" },
  organization: { amount: 49900, name: "Organization — AI Masterclass" },
};

const YEARLY_DISCOUNT = 0.25;

function getYearlyAmount(monthly) {
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));
}

async function stripeRequest(path, params, secretKey, method = "POST") {
  const url = method === "GET" && params
    ? `${STRIPE_API}${path}?${new URLSearchParams(params)}`
    : `${STRIPE_API}${path}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method !== "GET" ? (params?.toString?.() || params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `${path} failed`);
  return data;
}

// Find existing product by name, or return null
async function findExistingProduct(name, secretKey) {
  try {
    const data = await stripeRequest("/products", { limit: "100" }, secretKey, "GET");
    return data.data?.find(p => p.name === name && p.active) || null;
  } catch {
    return null;
  }
}

// Find existing price for product + amount + interval, or return null
async function findExistingPrice(productId, unitAmount, interval, secretKey) {
  try {
    const data = await stripeRequest("/prices", { product: productId, limit: "100" }, secretKey, "GET");
    return data.data?.find(p =>
      p.product === productId &&
      p.unit_amount === unitAmount &&
      p.recurring?.interval === interval &&
      p.active
    ) || null;
  } catch {
    return null;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: "Stripe not configured. Add STRIPE_SECRET_KEY to Netlify environment variables." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { tier, customerEmail, billingCycle = "monthly" } = body;

    const plan = PLANS[tier];
    if (!plan) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: `Invalid tier: ${tier}` }) };
    }

    const isYearly = billingCycle === "yearly";
    const unitAmount = isYearly ? getYearlyAmount(plan.amount) : plan.amount;
    const interval = isYearly ? "year" : "month";
    const displayPrice = "£" + (unitAmount / 100).toFixed(isYearly ? 0 : 2) + "/" + interval;

    const origin = event.headers.origin || "https://masterclass.anglotec-ai.com";

    // STEP 1: Find or create Product (reuse — no duplicates)
    const productName = plan.name + (isYearly ? " (Yearly)" : " (Monthly)");
    let product = await findExistingProduct(productName, secretKey);
    if (!product) {
      const productParams = new URLSearchParams();
      productParams.append("name", productName);
      productParams.append("description", `Anglotec AI Masterclass — ${displayPrice}. 14-day free trial. Cancel anytime.`);
      productParams.append("metadata[tier]", tier);
      product = await stripeRequest("/products", productParams, secretKey);
    }

    // STEP 2: Find or create Price (reuse — no duplicates)
    let price = await findExistingPrice(product.id, unitAmount, interval, secretKey);
    if (!price) {
      const priceParams = new URLSearchParams();
      priceParams.append("unit_amount", unitAmount.toString());
      priceParams.append("currency", "gbp");
      priceParams.append("product", product.id);
      priceParams.append("recurring[interval]", interval);
      price = await stripeRequest("/prices", priceParams, secretKey);
    }

    // STEP 3: Create Checkout Session
    const sessionParams = new URLSearchParams();
    sessionParams.append("mode", "subscription");
    sessionParams.append("payment_method_types[0]", "card");
    sessionParams.append("line_items[0][price]", price.id);
    sessionParams.append("line_items[0][quantity]", "1");
    sessionParams.append("success_url", `${origin}/#/settings?checkout=success&tier=${tier}`);
    sessionParams.append("cancel_url", `${origin}/#/pricing?checkout=cancelled`);
    sessionParams.append("client_reference_id", customerEmail || "unknown");
    sessionParams.append("allow_promotion_codes", "true");
    sessionParams.append("subscription_data[trial_period_days]", "14");
    sessionParams.append("subscription_data[metadata][tier]", tier);
    if (customerEmail) sessionParams.append("customer_email", customerEmail);
    sessionParams.append("metadata[tier]", tier);

    const session = await stripeRequest("/checkout/sessions", sessionParams, secretKey);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sessionId: session.id, url: session.url, tier, price: displayPrice }),
    };
  } catch (err) {
    console.error("Checkout error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Checkout failed" }) };
  }
};

/**
 * Netlify Function: Create Stripe Checkout Session
 * Creates products/prices dynamically — no pre-configuration needed
 * ONE env var required: STRIPE_SECRET_KEY
 */

const STRIPE_API = "https://api.stripe.com/v1";

// Monthly pricing in pence (GBP)
const PLANS = {
  pro:          { amount: 1999,  name: "Pro — AI Masterclass" },          // £19.99
  family:       { amount: 3999,  name: "Family — AI Masterclass" },       // £39.99
  classroom:    { amount: 20000, name: "Classroom — AI Masterclass" },      // £200
  organization: { amount: 49900, name: "Organization — AI Masterclass" }, // £499
};

const YEARLY_DISCOUNT = 0.25;

function getYearlyAmount(monthly) {
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT));
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

    // STEP 1: Create Product
    const productParams = new URLSearchParams();
    productParams.append("name", plan.name + (isYearly ? " (Yearly)" : " (Monthly)"));
    productParams.append("description", `Anglotec AI Masterclass — ${displayPrice}. 14-day free trial. Cancel anytime.`);
    productParams.append("metadata[tier]", tier);

    const productRes = await fetch(`${STRIPE_API}/products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: productParams.toString(),
    });
    const product = await productRes.json();
    if (!productRes.ok) throw new Error(product.error?.message || "Product creation failed");

    // STEP 2: Create Price
    const priceParams = new URLSearchParams();
    priceParams.append("unit_amount", unitAmount.toString());
    priceParams.append("currency", "gbp");
    priceParams.append("product", product.id);
    priceParams.append("recurring[interval]", interval);

    const priceRes = await fetch(`${STRIPE_API}/prices`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: priceParams.toString(),
    });
    const price = await priceRes.json();
    if (!priceRes.ok) throw new Error(price.error?.message || "Price creation failed");

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
    if (customerEmail) sessionParams.append("customer_email", customerEmail);
    sessionParams.append("metadata[tier]", tier);

    const sessionRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: sessionParams.toString(),
    });
    const session = await sessionRes.json();
    if (!sessionRes.ok) throw new Error(session.error?.message || "Checkout creation failed");

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

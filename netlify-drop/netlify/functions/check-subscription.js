/**
 * Netlify Function: Check Stripe Subscription Status
 * Returns the user's active subscription tier from Stripe
 * No Supabase needed — queries Stripe directly
 * ONE env var required: STRIPE_SECRET_KEY
 */

const STRIPE_API = "https://api.stripe.com/v1";

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ tier: "free", error: "Stripe not configured" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const email = body.email;

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ tier: "free", error: "Email required" }) };
    }

    // Find customer by email
    const searchRes = await fetch(
      `${STRIPE_API}/customers/search?query=email:"${encodeURIComponent(email)}"`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const searchData = await searchRes.json();

    if (!searchData.data || searchData.data.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ tier: "free", status: "none" }) };
    }

    const customerId = searchData.data[0].id;

    // Get active subscriptions
    const subsRes = await fetch(
      `${STRIPE_API}/subscriptions?customer=${customerId}&status=active`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const subsData = await subsRes.json();

    if (!subsData.data || subsData.data.length === 0) {
      // Check trialing subscriptions too
      const trialRes = await fetch(
        `${STRIPE_API}/subscriptions?customer=${customerId}&status=trialing`,
        { headers: { Authorization: `Bearer ${secretKey}` } }
      );
      const trialData = await trialRes.json();

      if (trialData.data && trialData.data.length > 0) {
        const sub = trialData.data[0];
        const tier = sub.metadata?.tier || "pro";
        return { statusCode: 200, headers, body: JSON.stringify({ tier, status: "trialing", trialEndsAt: sub.trial_end }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ tier: "free", status: "none" }) };
    }

    // Active subscription found
    const sub = subsData.data[0];
    const tier = sub.metadata?.tier || "pro";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tier,
        status: "active",
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      }),
    };
  } catch (err) {
    console.error("Status check error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ tier: "free", error: err.message }) };
  }
};

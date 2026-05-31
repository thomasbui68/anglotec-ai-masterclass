/**
 * Netlify Function: Stripe Customer Portal
 * Lets users manage/cancel their subscription
 * ONE env var required: STRIPE_SECRET_KEY
 */

const STRIPE_API = "https://api.stripe.com/v1";

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
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Stripe not configured" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { customerEmail, returnUrl } = body;

    if (!customerEmail) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };
    }

    // Find customer by email
    const searchRes = await fetch(
      `${STRIPE_API}/customers/search?query=email:"${encodeURIComponent(customerEmail)}"`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const searchData = await searchRes.json();

    if (!searchData.data || searchData.data.length === 0) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: "No subscription found for this email" }) };
    }

    const customerId = searchData.data[0].id;

    // Create portal session
    const portalParams = new URLSearchParams();
    portalParams.append("customer", customerId);
    portalParams.append("return_url", returnUrl || `${event.headers.origin || "https://masterclass.anglotec-ai.com"}/#/settings`);

    const portalRes = await fetch(`${STRIPE_API}/billing_portal/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: portalParams.toString(),
    });
    const portal = await portalRes.json();

    if (!portalRes.ok) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: portal.error?.message || "Portal creation failed" }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ url: portal.url }) };
  } catch (err) {
    console.error("Portal error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Portal failed" }) };
  }
};

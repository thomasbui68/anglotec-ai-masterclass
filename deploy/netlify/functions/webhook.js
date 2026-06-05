/**
 * Netlify Function: Handle Stripe Webhooks
 * Validates webhook signatures to prevent spoofing attacks
 */

const STRIPE_API = "https://api.stripe.com/v1";

// Simple HMAC verification for Stripe webhooks
async function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  try {
    const crypto = require("crypto");
    const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let match = 0;
    for (let i = 0; i < expected.length; i++) {
      match |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return match === 0;
  } catch {
    return false;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 503, headers, body: JSON.stringify({ error: "Stripe not configured" }) };
  }

  // Optional: verify webhook signature if STRIPE_WEBHOOK_SECRET is set
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = event.headers["stripe-signature"] || "";
  if (webhookSecret) {
    const isValid = await verifySignature(event.body, signature, webhookSecret);
    if (!isValid) {
      console.error("[Webhook] Invalid signature");
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid signature" }) };
    }
  } else {
    // In development mode without webhook secret, log a warning
    console.log("[Webhook] No STRIPE_WEBHOOK_SECRET set — skipping signature validation (dev mode)");
  }

  try {
    const stripeEvent = JSON.parse(event.body);
    const eventType = stripeEvent.type;

    console.log(`[Stripe Webhook] ${eventType}`);

    switch (eventType) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const tier = session.metadata?.tier || "pro";
        const customerEmail = session.customer_email || session.customer_details?.email;
        const subscriptionId = session.subscription;

        console.log(`[Checkout] ${customerEmail} subscribed to ${tier}`);
        await updateSupabase(customerEmail, tier, subscriptionId, "active", secretKey);
        break;
      }

      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        let tier = sub.metadata?.tier;
        if (!tier && sub.items?.data?.[0]?.price?.id) {
          try {
            const priceRes = await fetch(`${STRIPE_API}/prices/${sub.items.data[0].price.id}`, {
              headers: { Authorization: `Bearer ${secretKey}` },
            });
            const priceData = await priceRes.json();
            tier = priceData.metadata?.tier || "pro";
          } catch { tier = "pro"; }
        }
        tier = tier || "pro";

        const customerRes = await fetch(`${STRIPE_API}/customers/${sub.customer}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const customer = await customerRes.json();

        if (customer.email) {
          await updateSupabase(customer.email, tier, sub.id, sub.status, secretKey);
          console.log(`[Sub Update] ${customer.email} → ${sub.status} (${tier})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        const customerRes = await fetch(`${STRIPE_API}/customers/${sub.customer}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const customer = await customerRes.json();

        if (customer.email) {
          await updateSupabase(customer.email, "free", sub.id, "cancelled", secretKey);
          console.log(`[Sub Cancelled] ${customer.email}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object;
        console.log(`[Payment Failed] invoice: ${invoice.id}`);
        // Could send email notification here
        break;
      }

      default:
        console.log(`[Unhandled] ${eventType}`);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("[Webhook Error]", err);
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Webhook error" }) };
  }
};

async function updateSupabase(email, tier, subscriptionId, status, secretKey) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log("[Supabase] Not configured, skipping DB update");
    return;
  }

  try {
    // First find the user by email
    const searchRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    const users = await searchRes.json();
    const userId = users.users?.[0]?.id;

    if (!userId) {
      console.log(`[Supabase] User not found: ${email}`);
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        subscription_tier: tier,
        stripe_subscription_id: subscriptionId,
        subscription_status: status,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      console.error("[Supabase] Update failed:", await res.text());
    } else {
      console.log(`[Supabase] Updated ${email}: ${tier} (${status})`);
    }
  } catch (err) {
    console.error("[Supabase] Error:", err);
  }
}

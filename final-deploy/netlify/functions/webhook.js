/**
 * Netlify Function: Handle Stripe Webhooks
 * Processes subscription events with dynamic pricing
 */

const STRIPE_API = "https://api.stripe.com/v1";

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

  try {
    const stripeEvent = JSON.parse(event.body);
    const eventType = stripeEvent.type;

    console.log(`[Stripe Webhook] ${eventType}`);

    switch (eventType) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        // Get tier from metadata (dynamic pricing means we can't rely on Price ID lookup)
        const tier = session.metadata?.tier || "pro";
        const customerEmail = session.customer_email || session.customer_details?.email;
        const subscriptionId = session.subscription;

        console.log(`[Checkout] ${customerEmail} subscribed to ${tier}`);

        // Update Supabase if configured
        await updateSupabase(customerEmail, tier, subscriptionId, "active", secretKey);
        break;
      }

      case "customer.subscription.updated": {
        const sub = stripeEvent.data.object;
        const status = sub.status;

        // For dynamic pricing, get tier from subscription metadata
        // Fall back to looking up the price's product metadata
        let tier = sub.metadata?.tier;
        if (!tier && sub.items?.data?.[0]?.price?.id) {
          const priceRes = await fetch(`${STRIPE_API}/prices/${sub.items.data[0].price.id}`, {
            headers: { Authorization: `Bearer ${secretKey}` },
          });
          const priceData = await priceRes.json();
          tier = priceData.metadata?.tier || "pro";
        }
        tier = tier || "pro";

        // Get customer email
        const customerRes = await fetch(`${STRIPE_API}/customers/${sub.customer}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        const customer = await customerRes.json();

        if (customer.email) {
          await updateSupabase(customer.email, tier, sub.id, status, secretKey);
          console.log(`[Sub Update] ${customer.email} → ${status} (${tier})`);
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
        console.log(`[Payment Failed] invoice: ${stripeEvent.data.object.id}`);
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
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

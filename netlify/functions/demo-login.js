/**
 * Netlify Function: Demo Login
 *
 * Generates a temporary Supabase session for demo accounts.
 * Used by the "Try Demo" / "Guest Login" feature.
 *
 * NEVER returns a redirect. ALWAYS returns JSON with tokens
 * so the client can do its own fetch + invalidate + navigate.
 *
 * ENV required: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rluiarorxttctkeozmpv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

// Demo account configurations
const DEMO_ACCOUNTS = {
  free: {
    email: "demo.free@anglotec-ai.com",
    password: "DemoFree2026!",
    metadata: { display_name: "Demo Free User", tier: "free" },
  },
  pro: {
    email: "demo.pro@anglotec-ai.com",
    password: "DemoPro2026!",
    metadata: { display_name: "Demo Pro User", tier: "pro" },
  },
  admin: {
    email: "demo.admin@anglotec-ai.com",
    password: "DemoAdmin2026!",
    metadata: { display_name: "Demo Admin", tier: "pro", is_admin: true },
  },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "POST only" }) };
  }

  // Parse request
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const tier = body.tier || "free";
  const demoConfig = DEMO_ACCOUNTS[tier];

  if (!demoConfig) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Unknown tier: ${tier}` }) };
  }

  // If Supabase Admin API is available, use it for proper sessions
  if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      // Step 1: Ensure the demo user exists (idempotent)
      const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email: demoConfig.email,
          password: demoConfig.password,
          email_confirm: true,
          user_metadata: demoConfig.metadata,
        }),
      });

      // If user already exists (409), that's fine — continue
      const createData = await createRes.json();
      const userId = createData.id;

      if (!createRes.ok && createRes.status !== 409) {
        // 409 = user already exists, which is expected
        console.log("[demo-login] create user error:", createData);
      }

      // Step 2: If user already existed (409), fetch their ID
      let resolvedUserId = userId;
      if (createRes.status === 409) {
        // Fetch the existing user
        const listRes = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(demoConfig.email)}`,
          {
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const listData = await listRes.json();
        resolvedUserId = listData.users?.[0]?.id;
      }

      if (!resolvedUserId) {
        throw new Error("Could not resolve demo user ID");
      }

      // Step 3: Create a session via admin API (createSignInToken or signInUser)
      // Use signInUser approach (supabase auth admin signInWithPassword equivalent)
      const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email: demoConfig.email,
          password: demoConfig.password,
        }),
      });

      const sessionData = await signInRes.json();

      if (!signInRes.ok || !sessionData.access_token) {
        console.error("[demo-login] sign-in error:", sessionData);
        throw new Error(sessionData.error_description || "Sign-in failed");
      }

      // Step 4: Upsert profile row
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${resolvedUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          id: resolvedUserId,
          email: demoConfig.email,
          display_name: demoConfig.metadata.display_name,
          subscription_tier: demoConfig.metadata.tier,
          updated_at: new Date().toISOString(),
        }),
      });

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: true,
          tier,
          session: {
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token,
            expires_at: sessionData.expires_at,
            user: sessionData.user,
          },
          note: "Demo account — data resets on logout",
        }),
      };
    } catch (err) {
      console.error("[demo-login] Supabase error:", err.message);

      // Fallback: return a mock session for testing without Supabase admin
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          success: true,
          tier,
          session: {
            access_token: "demo_token_" + Date.now(),
            refresh_token: "demo_refresh_" + Date.now(),
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: {
              id: "demo-" + tier + "-" + Date.now(),
              email: demoConfig.email,
              user_metadata: demoConfig.metadata,
            },
          },
          warning: "Running in fallback mode — some features may be limited",
        }),
      };
    }
  }

  // No Supabase service key — return fallback mock
  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      success: true,
      tier,
      session: {
        access_token: "demo_fallback_" + Date.now(),
        refresh_token: "demo_fallback_refresh_" + Date.now(),
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: "demo-" + tier + "-" + Date.now(),
          email: demoConfig.email,
          user_metadata: demoConfig.metadata,
        },
      },
      warning: "Supabase service key not configured — running in limited demo mode",
    }),
  };
};

/**
 * Netlify Function: Post to X (Twitter)
 *
 * Posts tweets via X API v2 using OAuth 2.0 authentication.
 *
 * REQUIRED environment variables in Netlify:
 *   X_API_KEY          - Your X API Key
 *   X_API_SECRET       - Your X API Secret
 *   X_ACCESS_TOKEN     - Your X Access Token
 *   X_ACCESS_SECRET    - Your X Access Token Secret
 *
 * Get these from: https://developer.x.com/en/portal/dashboard
 *   → Projects & Apps → Your App → Keys and Tokens
 */

const crypto = require("crypto");

// X API v2 endpoint
const X_API_BASE = "https://api.x.com/2";

// CORS headers
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

/**
 * OAuth 1.0a signature for X API
 */
function oauth1Sign(method, url, params, apiKey, apiSecret, accessToken, accessSecret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
    ...params,
  };

  // Sort and encode parameters
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join("&");

  const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;

  const signature = crypto.createHmac("sha1", signingKey).update(signatureBase).digest("base64");

  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authHeader = "OAuth " + Object.keys(oauthParams)
    .filter((k) => k.startsWith("oauth_"))
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");

  return authHeader;
}

/**
 * Post a tweet via X API v2
 */
async function postTweet(text, credentials) {
  const url = `${X_API_BASE}/tweets`;

  const authHeader = oauth1Sign(
    "POST",
    url,
    {},
    credentials.apiKey,
    credentials.apiSecret,
    credentials.accessToken,
    credentials.accessSecret
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.errors?.[0]?.message || `HTTP ${res.status}`);
  }

  return data;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "POST only" }) };
  }

  // Read credentials from environment variables
  const credentials = {
    apiKey: process.env.X_API_KEY || "",
    apiSecret: process.env.X_API_SECRET || "",
    accessToken: process.env.X_ACCESS_TOKEN || "",
    accessSecret: process.env.X_ACCESS_SECRET || "",
  };

  if (!credentials.apiKey || !credentials.apiSecret || !credentials.accessToken || !credentials.accessSecret) {
    return {
      statusCode: 503,
      headers: cors,
      body: JSON.stringify({
        error: "X API credentials not configured",
        setup: "Go to https://developer.x.com/en/portal/dashboard → Projects & Apps → Keys and Tokens → Add these 4 env vars to Netlify:",
        required: ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"],
      }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { text, thread } = body;

    if (!text) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "text required" }) };
    }

    // Post single tweet
    const result = await postTweet(text, credentials);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        tweetId: result.data?.id,
        text: result.data?.text,
        url: `https://x.com/anglotecai/status/${result.data?.id}`,
      }),
    };

  } catch (err) {
    console.error("[X Post Error]", err.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};

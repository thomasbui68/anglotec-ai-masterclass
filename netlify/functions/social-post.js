/**
 * Netlify Function: Social Media Posting
 * Supports Reddit API posting (others can be added)
 * ENV: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REFRESH_TOKEN
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Post to Reddit via API
async function postToReddit(title, text, subreddit, credentials) {
  // Get access token from refresh token
  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AnglotecAI/1.0",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`Reddit auth failed: ${tokenData.error}`);

  // Submit post
  const postRes = await fetch("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "AnglotecAI/1.0",
    },
    body: new URLSearchParams({
      sr: subreddit,
      title: title,
      text: text,
      kind: "self",
      api_type: "json",
    }),
  });
  const postData = await postRes.json();
  if (!postRes.ok || postData.json?.errors?.length > 0) {
    throw new Error(`Reddit post failed: ${JSON.stringify(postData.json?.errors)}`);
  }
  return { platform: "reddit", url: `https://reddit.com${postData.json.data.url}` };
}

// Post to webhook (for Zapier/Make.com integration to Twitter, Facebook, LinkedIn, etc.)
async function postToWebhook(text, webhookUrl) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, timestamp: new Date().toISOString(), source: "anglotec-marketing" }),
  });
  if (!res.ok) throw new Error("Webhook failed");
  return { platform: "webhook", status: "sent" };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { platform, title, text, subreddit, webhookUrl } = body;

    if (!platform || !text) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Platform and text required" }) };
    }

    let result;

    switch (platform) {
      case "reddit":
        const clientId = process.env.REDDIT_CLIENT_ID;
        const clientSecret = process.env.REDDIT_CLIENT_SECRET;
        const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
        if (!clientId || !clientSecret || !refreshToken) {
          return { statusCode: 503, headers: cors, body: JSON.stringify({ error: "Reddit credentials not configured" }) };
        }
        result = await postToReddit(title, text, subreddit || "artificial", { clientId, clientSecret, refreshToken });
        break;

      case "webhook":
        if (!webhookUrl) {
          return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "webhookUrl required" }) };
        }
        result = await postToWebhook(text, webhookUrl);
        break;

      case "twitter":
      case "linkedin":
      case "facebook":
        // These require webhook integration via Zapier/Make.com
        // The frontend can send to a Make.com webhook which then posts to these platforms
        return { 
          statusCode: 200, 
          headers: cors, 
          body: JSON.stringify({ 
            success: true, 
            message: `${platform} posting requires Zapier/Make.com webhook integration. Set up a webhook URL and use platform="webhook".`,
            setupGuide: "1. Create Make.com account → 2. Add Twitter/LinkedIn module → 3. Create webhook trigger → 4. Use webhookUrl in your request"
          }) 
        };

      default:
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: `Unsupported platform: ${platform}` }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true, ...result }) };

  } catch (err) {
    console.error("[Social Post Error]", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};

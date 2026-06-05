/**
 * Netlify Function: Send Email via Resend
 * Supports single emails and bulk campaigns
 * ENV: RESEND_API_KEY
 */

const RESEND_API = "https://api.resend.com";

// CORS headers
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Simple auth check
function isAuthorized(event) {
  const auth = event.headers.authorization || "";
  // In production, check against a stored admin token
  // For now, accept any request with a bearer token (the app sends the user's token)
  return auth.startsWith("Bearer ");
}

exports.handler = async (event, context) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  // Get Resend API key from env or secure fallback
  const resendKey = process.env.RESEND_API_KEY || "re_ebMhCLoT_2Eo5c6XqeJV63hiuERzvoL1L";
  if (!resendKey || resendKey === "your-resend-api-key") {
    return {
      statusCode: 503,
      headers: cors,
      body: JSON.stringify({ error: "Resend not configured. Add RESEND_API_KEY to Netlify environment variables." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { 
      to,           // single email or array
      subject, 
      html, 
      text,         // optional plain text fallback
      from = "Anglotec AI <noreply@anglotec-ai.com>",
      replyTo = "support@anglotec-ai.com",
      campaignId,   // optional: for tracking
      tags          // optional: [{ name: "campaign", value: "welcome" }]
    } = body;

    if (!to || !subject || (!html && !text)) {
      return { 
        statusCode: 400, 
        headers: cors, 
        body: JSON.stringify({ error: "Missing required fields: to, subject, html/text" }) 
      };
    }

    // Build Resend payload
    const payload = {
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      reply_to: replyTo,
    };

    if (html) payload.html = html;
    if (text) payload.text = text;
    if (tags) payload.tags = tags;

    // Send via Resend API
    const res = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[Resend Error]", data);
      return { 
        statusCode: res.status, 
        headers: cors, 
        body: JSON.stringify({ error: data.message || "Email send failed" }) 
      };
    }

    // Log to console for tracking (could store in Supabase)
    console.log(`[Email Sent] ID: ${data.id} | To: ${Array.isArray(to) ? to.length : 1} recipient(s) | Subject: ${subject} | Campaign: ${campaignId || "none"}`);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ 
        success: true, 
        messageId: data.id,
        recipients: Array.isArray(to) ? to.length : 1,
        campaignId: campaignId || null
      }),
    };

  } catch (err) {
    console.error("[Send Email Error]", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};

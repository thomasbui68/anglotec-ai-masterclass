/**
 * Netlify Function: Send Bulk Campaign via Resend
 * Sends to multiple recipients with rate limiting and batching
 * ENV: RESEND_API_KEY
 */

const RESEND_API = "https://api.resend.com";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Sleep utility for rate limiting
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
      recipients,    // array of { email, name?, variables? }
      subject, 
      html, 
      text,
      from = "Anglotec AI <noreply@anglotec-ai.com>",
      replyTo = "support@anglotec-ai.com",
      campaignName = "Untitled Campaign",
      batchSize = 50,    // Resend supports up to 50 per request
      delayMs = 1000,    // 1 second between batches
      personalization = true  // Replace {{name}}, {{email}} etc
    } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Recipients array required" }) };
    }
    if (!subject || !html) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Subject and HTML required" }) };
    }

    const total = recipients.length;
    const results = { sent: 0, failed: 0, errors: [], messageIds: [] };
    
    // Process in batches
    for (let i = 0; i < total; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const toEmails = batch.map(r => r.email);

      // Personalize HTML for this batch (if single recipient per email needed, use /send-email instead)
      // For bulk, we send same content to batch. For true 1:1 personalization, call /send-email per recipient.
      const emailHtml = personalization && batch.length === 1 && batch[0].name
        ? html.replace(/\{\{name\}\}/g, batch[0].name).replace(/\{\{email\}\}/g, batch[0].email)
        : html;

      const res = await fetch(`${RESEND_API}/emails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: toEmails,
          subject,
          html: emailHtml,
          ...(text ? { text } : {}),
          reply_to: replyTo,
          tags: [{ name: "campaign", value: campaignName }, { name: "batch", value: `${Math.floor(i/batchSize) + 1}` }],
        }),
      });

      const data = await res.json();

      if (res.ok) {
        results.sent += toEmails.length;
        results.messageIds.push(data.id);
      } else {
        results.failed += toEmails.length;
        results.errors.push({ batch: Math.floor(i/batchSize) + 1, error: data.message });
      }

      // Rate limit delay between batches
      if (i + batchSize < total) {
        await sleep(delayMs);
      }
    }

    console.log(`[Campaign] "${campaignName}" | Sent: ${results.sent}/${total} | Failed: ${results.failed}`);

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        success: true,
        campaign: campaignName,
        total,
        sent: results.sent,
        failed: results.failed,
        messageIds: results.messageIds,
        errors: results.errors,
      }),
    };

  } catch (err) {
    console.error("[Campaign Error]", err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};

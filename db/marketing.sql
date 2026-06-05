-- Marketing Module Tables for Anglotec AI Masterclass
-- Run this in your Supabase SQL Editor

-- =============================
-- 1. EMAIL CONTACTS
-- =============================
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  source TEXT DEFAULT 'website', -- website, import, referral, etc
  tags TEXT[] DEFAULT '{}', -- ['prospect', 'newsletter', 'student']
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb -- extra custom fields
);

CREATE INDEX idx_marketing_contacts_email ON marketing_contacts(email);
CREATE INDEX idx_marketing_contacts_tags ON marketing_contacts USING GIN(tags);
CREATE INDEX idx_marketing_contacts_subscribed ON marketing_contacts(subscribed);

-- =============================
-- 2. EMAIL CAMPAIGNS
-- =============================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  from_email TEXT DEFAULT 'noreply@anglotec-ai.com',
  reply_to TEXT DEFAULT 'support@anglotec-ai.com',
  status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, paused
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by TEXT, -- user email
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================
-- 3. EMAIL TEMPLATES
-- =============================
CREATE TABLE IF NOT EXISTS marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- welcome, onboarding, promotional, newsletter, retention
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  preview_data JSONB DEFAULT '{}'::jsonb, -- sample data for preview
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default templates
INSERT INTO marketing_templates (name, category, subject, html_content, text_content, is_default) VALUES
('Welcome Email', 'welcome', 'Welcome to Anglotec AI Masterclass!', 
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:linear-gradient(135deg,#0f172a,#1a365d);padding:40px;text-align:center;color:white;border-radius:12px 12px 0 0;">
    <h1>Welcome to Anglotec AI Masterclass!</h1>
    <p>Your journey to AI mastery starts now</p>
  </div>
  <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <p>Hi {{name}},</p>
    <p>Thank you for joining the Anglotec AI Masterclass! You now have access to <strong>3,000 AI prompting phrases</strong> across 12 expert categories.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:20px 0;">
      <p style="margin:0;color:#166534;"><strong>Your Quick Start:</strong></p>
      <ol style="color:#166534;">
        <li>Log in to your dashboard</li>
        <li>Pick a category (Code Generation is great to start!)</li>
        <li>Practice with flashcards daily</li>
        <li>Track your XP and level up!</li>
      </ol>
    </div>
    <a href="https://masterclass.anglotec-ai.com" style="display:inline-block;background:linear-gradient(135deg,#f97316,#eab308);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Start Learning Now</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Questions? Reply to this email or contact support@anglotec-ai.com</p>
  </div>
</body></html>',
'Welcome to Anglotec AI Masterclass! Your journey to AI mastery starts now. Log in to access 3,000 AI prompts across 12 categories. Start with Code Generation and practice daily!',
true),

('Free Trial Reminder', 'retention', 'Your Free Trial Ends Soon — Don''t Miss Out!',
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:linear-gradient(135deg,#0f172a,#1a365d);padding:40px;text-align:center;color:white;border-radius:12px 12px 0 0;">
    <h1>Your Trial Ends in 3 Days</h1>
    <p>Keep your AI momentum going!</p>
  </div>
  <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <p>Hi {{name}},</p>
    <p>You''ve been making great progress with the Anglotec AI Masterclass! Your free trial ends in <strong>3 days</strong>.</p>
    <p>So far you''ve practiced {{practice_count}} prompts. Keep the streak alive!</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;padding:16px;border-radius:8px;margin:20px 0;">
      <p style="margin:0;color:#9a3412;"><strong>Why go Pro?</strong></p>
      <ul style="color:#9a3412;">
        <li>Unlimited prompts (3,000+)</li>
        <li>All 12 categories unlocked</li>
        <li>AI voice pronunciation</li>
        <li>Cloud sync across devices</li>
        <li>Weekly new content</li>
      </ul>
    </div>
    <a href="https://masterclass.anglotec-ai.com/pricing" style="display:inline-block;background:linear-gradient(135deg,#f97316,#eab308);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Upgrade to Pro — £19.99/mo</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">7-day money-back guarantee. Cancel anytime.</p>
  </div>
</body></html>',
'Your free trial ends in 3 days. You''ve practiced {{practice_count}} prompts so far! Upgrade to Pro for unlimited access to all 3,000 prompts across 12 categories. £19.99/mo with 7-day money-back guarantee.',
true),

('Monthly Newsletter', 'newsletter', 'This Month in AI: 50 New Prompts + Tips',
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:linear-gradient(135deg,#0f172a,#1a365d);padding:40px;text-align:center;color:white;border-radius:12px 12px 0 0;">
    <h1>Anglotec AI Newsletter</h1>
    <p>{{month}} {{year}}</p>
  </div>
  <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <p>Hi {{name}},</p>
    <p>Here''s what''s new this month in AI and at Anglotec:</p>
    <h2 style="color:#1a365d;margin-top:24px;">&#55357;&#56491; New This Month</h2>
    <p>We''ve added 50 new prompts to our library! This month''s focus: <strong>Advanced Chain-of-Thought Prompting</strong>.</p>
    <h2 style="color:#1a365d;margin-top:24px;">&#55357;&#56498; AI Tip of the Month</h2>
    <div style="background:#f0f9ff;border:1px solid #bae6fd;padding:16px;border-radius:8px;margin:16px 0;">
      <p style="margin:0;color:#0c4a6e;"><em>"Always ask the AI to explain its reasoning step-by-step. You''ll get better, more reliable answers."</em></p>
    </div>
    <h2 style="color:#1a365d;margin-top:24px;">&#55357;&#56513; Community Spotlight</h2>
    <p>Our users have collectively mastered over 500,000 prompts this month! Keep up the amazing work.</p>
    <a href="https://masterclass.anglotec-ai.com" style="display:inline-block;background:linear-gradient(135deg,#f97316,#eab308);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Continue Learning</a>
  </div>
</body></html>',
'This month: 50 new prompts added, focus on Advanced Chain-of-Thought Prompting. AI Tip: Always ask the AI to explain its reasoning step-by-step. Our community mastered 500,000+ prompts this month!',
true),

('Win-Back', 'retention', 'We Miss You! Here''s 50% Off Your Next Month',
'<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">
  <div style="background:linear-gradient(135deg,#0f172a,#1a365d);padding:40px;text-align:center;color:white;border-radius:12px 12px 0 0;">
    <h1>We Miss You!</h1>
    <p>Your AI learning journey is waiting</p>
  </div>
  <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <p>Hi {{name}},</p>
    <p>It''s been a while since you practiced with the Anglotec AI Masterclass. We''d love to have you back!</p>
    <div style="background:#fef3c7;border:1px solid #fde68a;padding:24px;border-radius:8px;margin:20px 0;text-align:center;">
      <p style="font-size:24px;font-weight:bold;color:#92400e;margin:0;">50% OFF</p>
      <p style="color:#92400e;margin:8px 0;">Your next month of Pro — just £9.99</p>
      <p style="color:#a16207;font-size:14px;">Use code: COMEBACK50</p>
    </div>
    <p>New prompts added since you left:</p>
    <ul>
      <li>50+ Advanced Prompting Techniques</li>
      <li>New "Emerging Tech" category</li>
      <li>Improved voice pronunciation</li>
    </ul>
    <a href="https://masterclass.anglotec-ai.com" style="display:inline-block;background:linear-gradient(135deg,#f97316,#eab308);color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Come Back & Save 50%</a>
  </div>
</body></html>',
'We miss you! Come back to Anglotec AI Masterclass with 50% off your next month. Use code COMEBACK50 for just £9.99. 50+ new prompts added, including a new Emerging Tech category.',
true);

-- =============================
-- 4. EMAIL EVENTS LOG
-- =============================
CREATE TABLE IF NOT EXISTS marketing_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  recipient_email TEXT,
  event_type TEXT NOT NULL, -- delivered, opened, clicked, bounced, complained, unsubscribed
  event_data JSONB DEFAULT '{}'::jsonb, -- link clicked, user agent, etc
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_events_campaign ON marketing_email_events(campaign_id);
CREATE INDEX idx_email_events_type ON marketing_email_events(event_type);
CREATE INDEX idx_email_events_created ON marketing_email_events(created_at);

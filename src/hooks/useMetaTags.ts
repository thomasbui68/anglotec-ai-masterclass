import { useEffect } from "react";

interface MetaTags {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
}

const DEFAULT_META: MetaTags = {
  title: "Anglotec AI Masterclass | 9,000 AI Prompts — Learn Prompt Engineering",
  description: "Master 9,000 AI prompting phrases across 12 expert categories. The complete AI prompt engineering course for beginners to power users. 14-day free trial.",
  keywords: "AI prompts, prompt engineering course, AI prompt engineering, learn AI prompting, ChatGPT prompts, AI training",
};

const ROUTE_META: Record<string, MetaTags> = {
  "/": {
    title: "Anglotec AI Masterclass | 9,000 AI Prompts — Learn Prompt Engineering",
    description: "Master 9,000 AI prompting phrases across 12 expert categories. From beginner to AI power-user. Start free.",
    keywords: "AI prompts, prompt engineering course, AI prompt engineering, learn AI prompting, ChatGPT prompts, AI training course, AI skills",
  },
  "/login": {
    title: "Sign In — Anglotec AI Masterclass",
    description: "Sign in to your AI Masterclass account. Access 9,000 AI prompts, track your progress, and continue your AI learning journey.",
    keywords: "AI masterclass login, AI prompts login, prompt engineering sign in",
  },
  "/register": {
    title: "Get Started Free — Anglotec AI Masterclass",
    description: "Create your free account and start mastering 9,000 AI prompting phrases. No credit card required. Beginner-friendly.",
    keywords: "AI prompts free course, prompt engineering free, learn AI free, AI training free",
  },
  "/flashcards": {
    title: "Practice AI Prompts — Interactive Flashcards | Anglotec AI",
    description: "Practice 9,000 AI prompting phrases with interactive flashcards. Voice pronunciation, progress tracking, and gamified learning.",
    keywords: "AI prompts flashcards, prompt engineering practice, AI prompt examples, learn AI prompts",
  },
  "/pricing": {
    title: "Pricing — AI Prompt Engineering Course | Anglotec AI Masterclass",
    description: "Start free with 20 prompts/day. Upgrade to Pro for £19.99/mo — unlimited 9,000+ prompts, all 12 categories, AI voice. 14-day free trial.",
    keywords: "AI course pricing, prompt engineering course cost, AI training price, AI masterclass subscription",
  },
  "/settings": {
    title: "Account Settings — Anglotec AI Masterclass",
    description: "Manage your Anglotec AI Masterclass account. Update subscription, manage billing, and configure preferences.",
  },
  "/help": {
    title: "Help & FAQ — Anglotec AI Masterclass",
    description: "Frequently asked questions about the Anglotec AI Masterclass. Learn about pricing, features, and how to get the most from your AI training.",
    keywords: "AI masterclass FAQ, prompt engineering help, AI training support",
  },
  "/progress": {
    title: "My Progress — AI Learning Dashboard | Anglotec AI",
    description: "Track your AI learning progress. See mastered prompts, learning streak, XP earned, and mastery level.",
    keywords: "AI learning progress, prompt engineering tracker, AI skills progress",
  },
  "/forgot-password": {
    title: "Reset Password — Anglotec AI Masterclass",
    description: "Reset your Anglotec AI Masterclass password. Secure account recovery.",
  },
  "/marketing-hub": {
    title: "Marketing Hub — Anglotec AI",
    description: "Marketing automation hub for Anglotec AI Masterclass. Email campaigns, contact management, and social media posting.",
  },
};

/**
 * Updates document meta tags based on current route.
 * Call this in each page component for route-specific SEO.
 */
export function useMetaTags(route?: string) {
  useEffect(() => {
    const meta = route && ROUTE_META[route] ? ROUTE_META[route] : DEFAULT_META;

    // Title
    document.title = meta.title;

    // Meta description
    let descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descEl) {
      descEl = document.createElement("meta");
      descEl.name = "description";
      document.head.appendChild(descEl);
    }
    descEl.content = meta.description;

    // Keywords
    if (meta.keywords) {
      let kwEl = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!kwEl) {
        kwEl = document.createElement("meta");
        kwEl.name = "keywords";
        document.head.appendChild(kwEl);
      }
      kwEl.content = meta.keywords;
    }

    // Open Graph
    let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitle) ogTitle.content = meta.ogTitle || meta.title;

    let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDesc) ogDesc.content = meta.ogDescription || meta.description;

    // Twitter
    let twTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null;
    if (twTitle) twTitle.content = meta.ogTitle || meta.title;

    let twDesc = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null;
    if (twDesc) twDesc.content = meta.ogDescription || meta.description;

    // Canonical
    if (meta.canonical) {
      let canEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canEl) {
        canEl = document.createElement("link");
        canEl.rel = "canonical";
        document.head.appendChild(canEl);
      }
      canEl.href = meta.canonical;
    }

    // Announce to screen readers
    const announcer = document.getElementById("route-announcer");
    if (announcer) announcer.textContent = `Navigated to ${meta.title}`;
  }, [route]);
}

export { DEFAULT_META, ROUTE_META };

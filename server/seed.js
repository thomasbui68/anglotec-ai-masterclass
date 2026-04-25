import { initDb, getDb } from "./db.js";

const CATEGORIES = [
  "Code Generation",
  "UI/UX Design",
  "API & Backend",
  "Data Analysis",
  "Content Creation",
  "Business Strategy",
  "Database & SQL",
  "DevOps & Cloud",
  "Mobile Development",
  "AI Model Tuning",
  "Cybersecurity",
  "Project Management",
];

const PHRASE_TEMPLATES = [
  // Code Generation
  "Generate a {language} function to {action}",
  "Write a {language} class that implements {feature}",
  "Create a {language} script to automate {task}",
  "Refactor this {language} code to use {pattern}",
  "Debug this {language} error: {error}",
  "Optimize this {language} function for {goal}",
  "Write unit tests for this {language} module",
  "Generate TypeScript interfaces for this API response",
  "Create a React component with {feature}",
  "Build a {language} middleware for {purpose}",
  // UI/UX Design
  "Design a responsive {component} with mobile-first approach",
  "Create a CSS animation for {effect}",
  "Generate a color palette for {theme} theme",
  "Design a navigation menu with {feature}",
  "Create a modal dialog with {functionality}",
  "Build a dashboard layout with {components}",
  "Design a form with validation for {fields}",
  "Create a loading skeleton for {content}",
  "Generate SVG icons for {purpose}",
  "Design a dark mode toggle component",
  // API & Backend
  "Design a REST API endpoint for {resource}",
  "Create a GraphQL schema for {data}",
  "Implement JWT authentication in {framework}",
  "Build a WebSocket server for {feature}",
  "Create API rate limiting middleware",
  "Design a webhook handler for {service}",
  "Implement OAuth 2.0 login flow",
  "Create API documentation with OpenAPI",
  "Build a microservice for {purpose}",
  "Design a caching strategy for {data}",
  // Data Analysis
  "Parse this CSV and calculate {metric}",
  "Generate descriptive statistics for {dataset}",
  "Create a data visualization for {chart}",
  "Build a pandas query to filter {condition}",
  "Generate a SQL query for {analysis}",
  "Create a machine learning pipeline for {task}",
  "Implement data cleaning for {dataset}",
  "Build a sentiment analysis model",
  "Generate a forecast for {metric}",
  "Create a data pipeline with {tools}",
  // Content Creation
  "Write a blog post about {topic}",
  "Generate social media captions for {product}",
  "Create an email newsletter template",
  "Write product descriptions for {items}",
  "Generate SEO-optimized meta tags",
  "Create a video script for {topic}",
  "Write ad copy for {platform}",
  "Generate FAQ answers for {product}",
  "Create a content calendar for {duration}",
  "Write case studies for {industry}",
  // Business Strategy
  "Draft a business plan for {industry}",
  "Create a go-to-market strategy",
  "Generate a competitive analysis for {competitor}",
  "Design a pricing model for {product}",
  "Build a financial projection for {years}",
  "Create a pitch deck outline",
  "Generate SWOT analysis for {company}",
  "Design a customer journey map",
  "Create OKRs for {department}",
  "Build a revenue model spreadsheet",
  // Database & SQL
  "Write a SQL query to join {tables}",
  "Optimize this database query for speed",
  "Design a database schema for {app}",
  "Create an index for {table}.{column}",
  "Write a migration script for {change}",
  "Generate a backup strategy",
  "Design a sharding scheme for {data}",
  "Create a stored procedure for {task}",
  "Build a full-text search query",
  "Implement database replication",
  // DevOps & Cloud
  "Create a Docker container for {app}",
  "Write a Kubernetes deployment YAML",
  "Set up CI/CD pipeline for {platform}",
  "Configure Nginx reverse proxy",
  "Create Terraform modules for {cloud}",
  "Design a monitoring dashboard",
  "Implement blue-green deployment",
  "Set up log aggregation with {tool}",
  "Configure auto-scaling rules",
  "Create infrastructure as code templates",
  // Mobile Development
  "Build a React Native screen for {feature}",
  "Create a Flutter widget for {component}",
  "Implement push notifications",
  "Design an offline-first data strategy",
  "Create a mobile navigation pattern",
  "Build a biometric auth flow",
  "Optimize app startup time",
  "Implement deep linking",
  "Create a responsive image gallery",
  "Build a mobile payment integration",
  // AI Model Tuning
  "Fine-tune a model for {task}",
  "Create prompt engineering templates",
  "Design a RAG pipeline for {data}",
  "Implement few-shot learning examples",
  "Build a chain-of-thought prompt",
  "Create embeddings for {content}",
  "Design a model evaluation framework",
  "Implement RLHF for {behavior}",
  "Create a prompt injection defense",
  "Build a model comparison benchmark",
  // Cybersecurity
  "Implement input sanitization for {field}",
  "Create a CSP header configuration",
  "Design a threat model for {system}",
  "Build an intrusion detection rule",
  "Implement zero-trust architecture",
  "Create a vulnerability scan schedule",
  "Design a secrets management strategy",
  "Build a SIEM alert configuration",
  "Implement end-to-end encryption",
  "Create an incident response playbook",
  // Project Management
  "Create a sprint planning template",
  "Design a kanban board workflow",
  "Build a risk assessment matrix",
  "Generate user stories for {feature}",
  "Create a retrospective agenda",
  "Design a stakeholder communication plan",
  "Build a resource allocation chart",
  "Create a project milestone timeline",
  "Generate a bug triage process",
  "Design an agile ceremony schedule",
];

const FILLERS = {
  language: ["Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C++", "Ruby", "PHP", "Swift"],
  action: ["sort an array", "validate email", "parse JSON", "fetch data", "handle errors", "cache results", "authenticate users", "process images", "send notifications", "log events"],
  feature: ["user authentication", "data pagination", "real-time updates", "file uploads", "search functionality", "role-based access", "payment processing", "email templates", "activity feeds", "recommendations"],
  task: ["data backup", "report generation", "user onboarding", "data migration", "system monitoring", "batch processing", "notification delivery", "cleanup jobs", "index rebuilding", "cache warming"],
  pattern: ["async/await", "dependency injection", "factory pattern", "observer pattern", "singleton", "strategy pattern", "command pattern", "repository pattern"],
  error: ["null pointer exception", "memory leak", "race condition", "infinite loop", "type mismatch", "undefined variable", "connection timeout", "permission denied"],
  goal: ["performance", "readability", "memory efficiency", "scalability", "maintainability", "test coverage"],
  component: ["navbar", "hero section", "footer", "sidebar", "card grid", "data table", "form wizard", "timeline"],
  effect: ["fade in", "slide transition", "pulse animation", "loading spinner", "parallax scroll", "hover zoom"],
  theme: ["corporate", "minimal", "vibrant", "dark", "nature", "tech", "elegant"],
  functionality: ["drag and drop", "multi-select", "auto-complete", "image crop", "rich text editor"],
  components: ["charts", "metrics cards", "activity lists", "notification panel"],
  fields: ["email and password", "credit card", "shipping address", "profile details"],
  content: ["product list", "article feed", "user gallery", "search results"],
  purpose: ["navigation", "status indicators", "action buttons", "filter controls"],
  resource: ["user profiles", "orders", "inventory", "comments", "media files"],
  data: ["e-commerce products", "social posts", "analytics events", "user preferences"],
  framework: ["Express.js", "FastAPI", "Django", "Spring Boot", "Laravel"],
  feature_ws: ["real-time chat", "live notifications", "collaborative editing"],
  service: ["Stripe payments", "Slack notifications", "GitHub webhooks"],
  dataset: ["sales data", "user behavior", "sensor readings", "survey responses"],
  chart: ["revenue trends", "user growth", "conversion funnel", "geographic distribution"],
  condition: ["date range", "status flags", "numeric thresholds", "text matches"],
  analysis: ["monthly aggregation", "cohort retention", "A/B test results"],
  tools: ["Apache Airflow", "AWS Glue", "dbt", "Prefect"],
  topic: ["AI in healthcare", "remote work trends", "sustainable technology"],
  product: ["SaaS platform", "mobile app", "e-commerce store", "online course"],
  items: ["electronics", "fashion items", "home goods", "digital products"],
  platform: ["Instagram", "LinkedIn", "Google Ads", "TikTok"],
  duration: ["Q1 2026", "6 months", "annual calendar"],
  industry: ["fintech", "healthcare", "education", "e-commerce"],
  competitor: ["industry leaders", "emerging startups", "indirect alternatives"],
  years: ["3 years", "5 years", "10 years"],
  company: ["our startup", "enterprise client", "competitor analysis"],
  department: ["engineering", "marketing", "sales", "product"],
  app: ["social network", "marketplace", "CRM system", "booking platform"],
  tables: ["users and orders", "products and categories", "posts and comments"],
  table: ["users", "orders", "products", "sessions"],
  column: ["email", "created_at", "status", "category"],
  change: ["adding columns", "renaming tables", "migrating data"],
  cloud: ["AWS", "Azure", "GCP", "multi-cloud"],
  tool: ["ELK stack", "Prometheus", "Datadog", "New Relic"],
};

function fillTemplate(template) {
  let result = template;
  for (const [key, values] of Object.entries(FILLERS)) {
    const placeholder = `{${key}}`;
    while (result.includes(placeholder)) {
      const value = values[Math.floor(Math.random() * values.length)];
      result = result.replace(placeholder, value);
    }
  }
  return result;
}

function getCategoryForTemplate(template) {
  const idx = PHRASE_TEMPLATES.indexOf(template);
  const catIdx = Math.floor(idx / 10);
  return CATEGORIES[Math.min(catIdx, CATEGORIES.length - 1)];
}

export function seedDatabase() {
  initDb();
  const db = getDb();

  const count = db.prepare("SELECT COUNT(*) as count FROM phrases").get();
  if (count.count > 0) {
    console.log("Database already seeded.");
    return;
  }

  const phrases = [];
  const usedPhrases = new Set();

  for (let i = 0; i < 3000; i++) {
    const template = PHRASE_TEMPLATES[i % PHRASE_TEMPLATES.length];
    const category = getCategoryForTemplate(template);
    let phrase = fillTemplate(template);

    while (usedPhrases.has(phrase)) {
      phrase = `${phrase} (${i})`;
    }
    usedPhrases.add(phrase);

    const difficulty = Math.floor(Math.random() * 5) + 1;
    phrases.push({
      english: phrase,
      category,
      difficulty,
      tags: category,
    });
  }

  const insertStmt = db.prepare(
    "INSERT INTO phrases (english, category, difficulty, tags) VALUES (?, ?, ?, ?)"
  );

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insertStmt.run(item.english, item.category, item.difficulty, item.tags);
    }
  });

  insertMany(phrases);
  console.log(`Seeded ${phrases.length} phrases.`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedDatabase();
}

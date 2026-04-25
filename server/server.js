import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { initDb, getDb } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SERVER_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "anglotec-ai-master-class-secret-key-2026";

// Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Too many authentication attempts." },
});

app.use(generalLimiter);

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Euclidean distance for face comparison
function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ========== AUTH ROUTES ==========

// Register
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password, faceDescriptor } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = await getDb();
    const existing = await db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
    if (existing) {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let faceDescStr = null;
    if (faceDescriptor && Array.isArray(faceDescriptor) && faceDescriptor.length === 128) {
      faceDescStr = JSON.stringify(faceDescriptor);
    }

    const result = await db.run(
      "INSERT INTO users (username, email, password_hash, face_descriptor) VALUES (?, ?, ?, ?)",
      [username, email, passwordHash, faceDescStr]
    );

    const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET, { expiresIn: "24h" });

    res.status(201).json({
      token,
      user: { id: result.lastID, username, email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Password login
app.post("/api/auth/login/password", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Face login
app.post("/api/auth/login/face", authLimiter, async (req, res) => {
  try {
    const { username, faceDescriptor } = req.body;
    if (!username || !faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ error: "Username and face descriptor required" });
    }

    if (faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Face descriptor must be 128 dimensions" });
    }

    const db = await getDb();
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user || !user.face_descriptor) {
      return res.status(401).json({ error: "Face not enrolled for this user" });
    }

    const storedDescriptor = JSON.parse(user.face_descriptor);
    if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
      return res.status(500).json({ error: "Stored descriptor corrupted" });
    }

    const distance = euclideanDistance(faceDescriptor, storedDescriptor);
    if (distance > 0.6) {
      return res.status(401).json({ error: "Face not recognized" });
    }

    await db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Face login error:", err);
    res.status(500).json({ error: "Face login failed" });
  }
});

// Enroll face
app.post("/api/user/face-enroll", authenticateToken, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Valid 128-dim face descriptor required" });
    }

    const db = await getDb();
    await db.run(
      "UPDATE users SET face_descriptor = ? WHERE id = ?",
      [JSON.stringify(faceDescriptor), req.user.id]
    );
    res.json({ success: true, message: "Face enrolled successfully" });
  } catch (err) {
    console.error("Face enroll error:", err);
    res.status(500).json({ error: "Face enrollment failed" });
  }
});

// Remove face
app.delete("/api/user/face-remove", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    await db.run("UPDATE users SET face_descriptor = NULL WHERE id = ?", [req.user.id]);
    res.json({ success: true, message: "Face authentication removed" });
  } catch (err) {
    console.error("Face remove error:", err);
    res.status(500).json({ error: "Failed to remove face authentication" });
  }
});

// Get profile
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.get(
      "SELECT id, username, email, role, status, created_at, last_login FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ========== PHRASE ROUTES ==========

app.get("/api/phrases", authenticateToken, async (req, res) => {
  try {
    const { category, page = "1", limit = "50", search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const db = await getDb();
    let query = "SELECT id, english, category, difficulty, audio_generated FROM phrases";
    let countQuery = "SELECT COUNT(*) as total FROM phrases";
    const params = [];
    const conditions = [];

    if (category && category !== "all") {
      conditions.push("category = ?");
      params.push(category);
    }
    if (search) {
      conditions.push("english LIKE ?");
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }

    query += " ORDER BY id LIMIT ? OFFSET ?";
    const phrases = await db.all(query, [...params, parseInt(limit), offset]);
    const countResult = await db.get(countQuery, params);

    res.json({ phrases, total: countResult.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("Phrases error:", err);
    res.status(500).json({ error: "Failed to fetch phrases" });
  }
});

app.get("/api/phrases/categories", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const categories = await db.all("SELECT DISTINCT category FROM phrases ORDER BY category");
    res.json(categories.map((c) => c.category));
  } catch (err) {
    console.error("Categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/phrases/:id", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const phrase = await db.get("SELECT * FROM phrases WHERE id = ?", [req.params.id]);
    if (!phrase) {
      return res.status(404).json({ error: "Phrase not found" });
    }
    res.json(phrase);
  } catch (err) {
    console.error("Phrase detail error:", err);
    res.status(500).json({ error: "Failed to fetch phrase" });
  }
});

// ========== AUDIO ROUTES ==========

const audioDir = path.join(__dirname, "audio_cache");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

app.get("/api/audio/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const phrase = await db.get("SELECT * FROM phrases WHERE id = ?", [id]);
    if (!phrase) {
      return res.status(404).json({ error: "Phrase not found" });
    }

    const filePath = path.join(audioDir, `${id}.wav`);

    // Return cached audio
    if (fs.existsSync(filePath)) {
      res.set("Content-Type", "audio/wav");
      res.set("Cache-Control", "public, max-age=31536000");
      return res.sendFile(filePath);
    }

    // Generate with Piper TTS if available
    const modelPath = path.join(__dirname, "voices", "en_US-lessac-medium.onnx");
    if (!fs.existsSync(modelPath)) {
      // Fallback: return error with flag so frontend can use Web Speech API
      return res.status(503).json({ error: "Piper voice model not found. Please install a voice model.", fallback: true });
    }

    const piper = spawn("piper", ["--model", modelPath, "--output_file", filePath]);
    piper.stdin.write(phrase.english);
    piper.stdin.end();

    piper.on("close", async (code) => {
      if (code !== 0) {
        console.error(`Piper exited with code ${code}`);
        return res.status(500).json({ error: "Audio generation failed", fallback: true });
      }
      await db.run("UPDATE phrases SET audio_generated = 1 WHERE id = ?", [id]);
      res.set("Content-Type", "audio/wav");
      res.set("Cache-Control", "public, max-age=31536000");
      res.sendFile(filePath);
    });

    piper.on("error", (err) => {
      console.error("Piper error:", err);
      return res.status(500).json({ error: "Audio generation error", fallback: true });
    });
  } catch (err) {
    console.error("Audio error:", err);
    res.status(500).json({ error: "Audio endpoint error", fallback: true });
  }
});

// ========== PROGRESS ROUTES ==========

app.get("/api/progress", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const progress = await db.all(
      `SELECT p.id, p.english, p.category, up.status, up.practice_count, up.last_practiced, up.mastery_score
       FROM phrases p
       LEFT JOIN user_progress up ON p.id = up.phrase_id AND up.user_id = ?
       WHERE up.user_id = ? OR up.user_id IS NULL
       ORDER BY p.id
       LIMIT 50`,
      [req.user.id, req.user.id]
    );
    res.json(progress);
  } catch (err) {
    console.error("Progress error:", err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

app.get("/api/progress/stats", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const stats = await db.get(
      `SELECT
        COUNT(*) as total_phrases,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning,
        SUM(CASE WHEN status = 'new' OR status IS NULL THEN 1 ELSE 0 END) as new_count,
        AVG(mastery_score) as avg_mastery,
        SUM(practice_count) as total_practices
       FROM user_progress
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Get streak (consecutive days with practice)
    const streakData = await db.get(
      `SELECT COUNT(DISTINCT date(last_practiced)) as active_days,
              MAX(date(last_practiced)) as last_active
       FROM user_progress
       WHERE user_id = ? AND last_practiced IS NOT NULL`,
      [req.user.id]
    );

    res.json({ ...stats, ...streakData });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.post("/api/progress/:phraseId", authenticateToken, async (req, res) => {
  try {
    const { phraseId } = req.params;
    const { status, practiceCount = 1 } = req.body;
    const db = await getDb();

    const existing = await db.get(
      "SELECT * FROM user_progress WHERE user_id = ? AND phrase_id = ?",
      [req.user.id, phraseId]
    );

    const now = new Date().toISOString();
    const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let masteryScore = 0;
    if (status === "mastered") masteryScore = 100;
    else if (status === "learning") masteryScore = 50;

    if (existing) {
      await db.run(
        `UPDATE user_progress
         SET status = ?, practice_count = practice_count + ?, last_practiced = ?, next_review = ?, mastery_score = ?
         WHERE user_id = ? AND phrase_id = ?`,
        [status, practiceCount, now, nextReview, masteryScore, req.user.id, phraseId]
      );
    } else {
      await db.run(
        `INSERT INTO user_progress (user_id, phrase_id, status, practice_count, last_practiced, next_review, mastery_score)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, phraseId, status, practiceCount, now, nextReview, masteryScore]
      );
    }

    // Check and award achievements
    await checkAchievements(db, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error("Progress update error:", err);
    res.status(500).json({ error: "Failed to update progress" });
  }
});

app.get("/api/progress/review", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const reviewItems = await db.all(
      `SELECT p.id, p.english, p.category, p.difficulty, up.status, up.practice_count, up.mastery_score
       FROM phrases p
       LEFT JOIN user_progress up ON p.id = up.phrase_id AND up.user_id = ?
       WHERE up.next_review <= datetime('now') OR up.next_review IS NULL
       ORDER BY RANDOM()
       LIMIT 20`,
      [req.user.id]
    );
    res.json(reviewItems);
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ error: "Failed to fetch review items" });
  }
});

// ========== ACHIEVEMENTS ==========

async function checkAchievements(db, userId) {
  const stats = await db.get(
    `SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND status = 'mastered'`,
    [userId]
  );

  const achievements = [];
  const mastered = stats.count;

  if (mastered >= 10) achievements.push({ type: "milestone", name: "First Steps" });
  if (mastered >= 50) achievements.push({ type: "milestone", name: "Getting Warm" });
  if (mastered >= 100) achievements.push({ type: "milestone", name: "Century Club" });
  if (mastered >= 500) achievements.push({ type: "milestone", name: "Halfway Hero" });
  if (mastered >= 1000) achievements.push({ type: "milestone", name: "Thousand Master" });
  if (mastered >= 3000) achievements.push({ type: "milestone", name: "AI Master" });

  for (const ach of achievements) {
    const exists = await db.get(
      "SELECT id FROM achievements WHERE user_id = ? AND badge_name = ?",
      [userId, ach.name]
    );
    if (!exists) {
      await db.run(
        "INSERT INTO achievements (user_id, badge_type, badge_name) VALUES (?, ?, ?)",
        [userId, ach.type, ach.name]
      );
    }
  }
}

app.get("/api/achievements", authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const achievements = await db.all(
      "SELECT * FROM achievements WHERE user_id = ? ORDER BY earned_at DESC",
      [req.user.id]
    );
    res.json(achievements);
  } catch (err) {
    console.error("Achievements error:", err);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// ========== ERROR HANDLING ==========

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
async function startServer() {
  await initDb();
  
  // Serve static files in production
  const distPath = path.join(__dirname, "..", "dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA fallback - serve index.html for all non-API routes
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  
  app.listen(PORT, () => {
    console.log(`Anglotec AI Master Class server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

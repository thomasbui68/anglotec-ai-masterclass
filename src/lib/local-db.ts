import { seedPhrases } from "./seed-phrases";

const DB_KEY = "anglotec_db";

// === LOCALSTORAGE HEALTH CHECK ===
let _storageWorks: boolean | null = null;
let _storageError: string | null = null;

function testStorage(): { works: boolean; error: string | null } {
  if (_storageWorks !== null) return { works: _storageWorks, error: _storageError };
  try {
    const testKey = "__anglotec_storage_test__";
    const testValue = "hello-" + Date.now();
    localStorage.setItem(testKey, testValue);
    const read = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    if (read !== testValue) {
      _storageWorks = false;
      _storageError = "localStorage read/write mismatch. Data may not persist.";
      return { works: false, error: _storageError };
    }
    _storageWorks = true;
    _storageError = null;
    return { works: true, error: null };
  } catch (e: any) {
    _storageWorks = false;
    _storageError = e.name === "QuotaExceededError"
      ? "Storage is full. Please clear browser data for other sites."
      : e.name === "SecurityError"
      ? "Storage blocked by browser security settings or private mode."
      : "Storage unavailable: " + (e.message || "unknown error");
    return { works: false, error: _storageError };
  }
}

export function getStorageStatus(): { works: boolean; error: string | null } {
  return testStorage();
}

function safeGet(): any {
  const { works } = testStorage();
  if (!works) return null;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("DB read failed, creating fresh:", e);
    safeSet(createFreshDb());
    return createFreshDb();
  }
}

function safeSet(value: any) {
  const { works } = testStorage();
  if (!works) {
    console.error("Cannot save: localStorage is not working.");
    return;
  }
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(value));
  } catch (e: any) {
    console.error("DB write failed:", e);
    if (e.name === "QuotaExceededError") {
      _storageWorks = false;
      _storageError = "Storage quota exceeded. Try clearing other site data.";
    }
  }
}

function createFreshDb() {
  return { users: [], progress: [], achievements: [], phrases: seedPhrases(), currentUser: null };
}

function getDb(): any {
  let db = safeGet();
  if (!db || !Array.isArray(db.users) || !Array.isArray(db.phrases)) {
    db = createFreshDb();
    safeSet(db);
  }
  return db;
}

function saveDb(db: any) {
  safeSet(db);
}

function generateId(items: any[]) {
  return items.length > 0 ? Math.max(...items.map((i) => i.id || 0)) + 1 : 1;
}

// === AUTH ===
export const localAuth = {
  register(email: string, password: string, credentialId?: string, extras?: { backup_email?: string; phone_number?: string; security_question?: string; security_answer?: string }) {
    if (!email || !password) throw new Error("Please enter both your email and password");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    if (!email.includes("@")) throw new Error("Please enter a valid email address");

    const db = getDb();
    const existing = db.users.find((u: any) => u.email === email);
    if (existing) throw new Error("This email is already registered. Please sign in instead.");

    const passwordHash = btoa(password + "anglotec_salt");
    const secAnswerHash = extras?.security_answer ? btoa(extras.security_answer.toLowerCase().trim() + "_anglotec_salt") : null;
    const user = {
      id: generateId(db.users),
      email,
      password_hash: passwordHash,
      credential_id: credentialId || null,
      face_descriptor: null,
      backup_email: extras?.backup_email || null,
      phone_number: extras?.phone_number || null,
      email_verified: false,
      phone_verified: false,
      security_question: extras?.security_question || null,
      security_answer_hash: secAnswerHash,
      role: "learner",
      status: "active",
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    saveDb(db);
    return { id: user.id, email };
  },

  getUser(userId: number) {
    const db = getDb();
    const u = db.users.find((u: any) => u.id === userId);
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      backup_email: u.backup_email,
      phone_number: u.phone_number,
      email_verified: u.email_verified,
      phone_verified: u.phone_verified,
      security_question: u.security_question,
      credential_id: u.credential_id,
      has_biometric: !!u.credential_id,
    };
  },

  findByEmail(email: string) {
    const db = getDb();
    const u = db.users.find((u: any) => u.email === email);
    if (!u) return null;
    return { ...u, has_biometric: !!u.credential_id, has_face_id: !!u.credential_id };
  },

  checkSecurityAnswer(email: string, answer: string) {
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user || !user.security_answer_hash) return false;
    const answerHash = btoa(answer.toLowerCase().trim() + "_anglotec_salt");
    return user.security_answer_hash === answerHash;
  },

  resetPassword(email: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters");
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user) throw new Error("Account not found.");
    user.password_hash = btoa(newPassword + "anglotec_salt");
    saveDb(db);
    return true;
  },

  verifyEmail(userId: number) {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (user) { user.email_verified = true; saveDb(db); }
  },

  verifyPhone(userId: number) {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (user) { user.phone_verified = true; saveDb(db); }
  },

  loginPassword(email: string, password: string) {
    if (!email || !password) throw new Error("Please enter both your email and password");
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user) throw new Error("We couldn't find an account with that email. Please check and try again.");

    const passwordHash = btoa(password + "anglotec_salt");
    if (user.password_hash !== passwordHash) throw new Error("The password you entered is incorrect. Please try again.");

    user.last_login = new Date().toISOString();
    saveDb(db);
    return { id: user.id, email: user.email };
  },

  loginBiometric(email: string): { id: number; email: string; credentialId: string | null } {
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user || !user.credential_id) throw new Error("Face ID is not set up for this account. Please log in with your password first.");
    user.last_login = new Date().toISOString();
    saveDb(db);
    return { id: user.id, email: user.email, credentialId: user.credential_id };
  },

  login(email: string, password: string) {
    if (!email || !password) throw new Error("Please enter both your email and password");
    const db = getDb();
    const user = db.users.find((u: any) => u.email === email);
    if (!user) return null;
    const passwordHash = btoa(password + "anglotec_salt");
    if (user.password_hash !== passwordHash) return null;
    user.last_login = new Date().toISOString();
    saveDb(db);
    // Store current user
    try { localStorage.setItem("anglotec_user", JSON.stringify({ id: user.id, email: user.email })); } catch { /* ignore */ }
    return { id: user.id, email: user.email, backupEmail: user.backup_email, phoneNumber: user.phone_number, emailVerified: user.email_verified === 1, securityQuestion: user.security_question, hasBiometric: !!user.credential_id };
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem("anglotec_user");
      if (userStr) return JSON.parse(userStr);
      const db = getDb();
      if (db.users.length > 0) return { id: db.users[0].id, email: db.users[0].email };
    } catch { /* ignore */ }
    return null;
  },

  registerUser(data: {
    email: string;
    password: string;
    password_hash: string;
    backup_email?: string;
    phone_number?: string;
    security_question?: string;
    security_answer_hash?: string | null;
  }) {
    const db = getDb();
    if (db.users.find((u: any) => u.email === data.email)) return null;
    const newId = db.users.length > 0 ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1;
    const now = new Date().toISOString();
    const newUser = {
      id: newId,
      email: data.email,
      password_hash: data.password_hash,
      backup_email: data.backup_email || null,
      phone_number: data.phone_number || null,
      security_question: data.security_question || null,
      security_answer_hash: data.security_answer_hash || null,
      credential_id: null,
      biometric_enabled: false,
      email_verified: false,
      phone_verified: false,
      created_at: now,
      last_login: now,
    };
    db.users.push(newUser);
    saveDb(db);
    // Store current user
    try { localStorage.setItem("anglotec_user", JSON.stringify({ id: newUser.id, email: newUser.email })); } catch { /* ignore */ }
    return { id: newUser.id, email: newUser.email, backupEmail: newUser.backup_email, phoneNumber: newUser.phone_number, emailVerified: false, securityQuestion: newUser.security_question, hasBiometric: false };
  },

  registerCredential(userId: number, credentialId: string) {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (!user) throw new Error("User not found");
    user.credential_id = credentialId;
    saveDb(db);
  },

  removeCredential(userId: number) {
    const db = getDb();
    const user = db.users.find((u: any) => u.id === userId);
    if (user) {
      user.credential_id = null;
      saveDb(db);
    }
  },
};

// === PHRASES ===
export const localPhrases = {
  getAll(category?: string, search?: string, page = 1, limit = 50) {
    const db = getDb();
    let phrases = [...db.phrases];
    if (category && category !== "all") {
      phrases = phrases.filter((p: any) => p.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      phrases = phrases.filter((p: any) => p.english.toLowerCase().includes(s));
    }
    const total = phrases.length;
    const offset = (page - 1) * limit;
    return { phrases: phrases.slice(offset, offset + limit), total, page, limit };
  },
  getCategories() {
    const db = getDb();
    return [...new Set(db.phrases.map((p: any) => p.category))] as string[];
  },
  getById(id: number) {
    const db = getDb();
    return db.phrases.find((p: any) => p.id === id);
  },
};

// === PROGRESS ===
export const localProgress = {
  getAll(userId: number) {
    const db = getDb();
    return db.phrases.map((p: any) => {
      const prog = db.progress.find((pr: any) => pr.user_id === userId && pr.phrase_id === p.id);
      return { ...p, status: prog?.status || "new", practice_count: prog?.practice_count || 0, mastery_score: prog?.mastery_score || 0 };
    });
  },
  getStats(userId: number) {
    const db = getDb();
    const progress = db.progress.filter((pr: any) => pr.user_id === userId);
    const total_phrases = db.phrases.length;
    const mastered = progress.filter((pr: any) => pr.status === "mastered").length;
    const learning = progress.filter((pr: any) => pr.status === "learning").length;
    const new_count = total_phrases - mastered - learning;
    const total_practices = progress.reduce((sum: number, pr: any) => sum + (pr.practice_count || 0), 0);
    const active_days = new Set(progress.map((pr: any) => pr.last_practiced?.split("T")[0]).filter(Boolean)).size;
    return { total_phrases, mastered, learning, new_count, avg_mastery: 0, total_practices, active_days, last_active: null };
  },
  update(userId: number, phraseId: number, status: string) {
    const db = getDb();
    let prog = db.progress.find((pr: any) => pr.user_id === userId && pr.phrase_id === phraseId);
    const now = new Date().toISOString();
    const nextReview = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const masteryScore = status === "mastered" ? 100 : status === "learning" ? 50 : 0;

    if (prog) {
      prog.status = status;
      prog.practice_count = (prog.practice_count || 0) + 1;
      prog.last_practiced = now;
      prog.next_review = nextReview;
      prog.mastery_score = masteryScore;
    } else {
      db.progress.push({ user_id: userId, phrase_id: phraseId, status, practice_count: 1, last_practiced: now, next_review: nextReview, mastery_score: masteryScore });
    }
    saveDb(db);
    checkAchievements(userId);
  },
};

// === ACHIEVEMENTS ===
export const localAchievements = {
  getAll(userId: number) {
    const db = getDb();
    return db.achievements.filter((a: any) => a.user_id === userId);
  },
};

function checkAchievements(userId: number) {
  const db = getDb();
  const progress = db.progress.filter((pr: any) => pr.user_id === userId && pr.status === "mastered");
  const mastered = progress.length;
  const badges = [
    { count: 10, name: "First Steps" },
    { count: 50, name: "Getting Warm" },
    { count: 100, name: "Century Club" },
    { count: 500, name: "Halfway Hero" },
    { count: 1000, name: "Thousand Master" },
    { count: 3000, name: "AI Master" },
  ];

  for (const badge of badges) {
    if (mastered >= badge.count) {
      const exists = db.achievements.find((a: any) => a.user_id === userId && a.badge_name === badge.name);
      if (!exists) {
        db.achievements.push({ id: generateId(db.achievements), user_id: userId, badge_type: "milestone", badge_name: badge.name, earned_at: new Date().toISOString() });
      }
    }
  }
  saveDb(db);
}

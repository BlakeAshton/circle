import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";
const TRUST_PROXY =
  process.env.TRUST_PROXY == null ? true : process.env.TRUST_PROXY === "1";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "1";
const GNEWS_KEY = process.env.GNEWS_KEY || "";
const DEFAULT_STUN_URLS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

let newsCache = { at: 0, items: [] };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, "..", "dist");
const dbPath = process.env.DB_PATH || path.join(__dirname, "circle.db");
const db = new Database(dbPath);

const now = () => new Date().toISOString();

function parseEnvList(value) {
  return `${value ?? ""}`
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCallRtcConfiguration() {
  const stunUrls = parseEnvList(process.env.CALL_STUN_URLS || process.env.STUN_URLS || "").length
    ? parseEnvList(process.env.CALL_STUN_URLS || process.env.STUN_URLS || "")
    : DEFAULT_STUN_URLS;
  const turnUrls = parseEnvList(
    process.env.CALL_TURN_URLS || process.env.TURN_URLS || process.env.TURN_URL || ""
  );
  const turnUsername = `${process.env.CALL_TURN_USERNAME || process.env.TURN_USERNAME || ""}`.trim();
  const turnCredential = `${process.env.CALL_TURN_CREDENTIAL || process.env.TURN_CREDENTIAL || ""}`.trim();
  const iceServers = [];

  if (stunUrls.length > 0) {
    iceServers.push({ urls: stunUrls });
  }

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceTransportPolicy: "all",
  };
}

const CALL_RTC_CONFIGURATION = buildCallRtcConfiguration();

// Core tables

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    bio TEXT DEFAULT '',
    location TEXT DEFAULT '',
    link TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    banner TEXT DEFAULT '',
    avatar_scale REAL DEFAULT 1,
    banner_scale REAL DEFAULT 1,
    banner_position_x REAL DEFAULT 50,
    banner_position_y REAL DEFAULT 50,
    verified INTEGER DEFAULT 0,
    is_owner INTEGER DEFAULT 0,
    owner_tag TEXT DEFAULT '',
    joined TEXT DEFAULT '',
    is_private INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    ban_reason TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    image TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT DEFAULT '',
    reply_to INTEGER DEFAULT NULL,
    quote_of INTEGER DEFAULT NULL,
    visibility TEXT DEFAULT 'home',
    target_user_id INTEGER DEFAULT NULL,
    reply_audience TEXT DEFAULT 'everyone',
    poll_json TEXT DEFAULT '',
    likes_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(follower_id, following_id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS reposts (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS views (
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS profile_media_likes (
    user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    media_kind TEXT NOT NULL,
    media_src TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, target_user_id, media_kind, media_src)
  );

  CREATE TABLE IF NOT EXISTS profile_media_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    media_kind TEXT NOT NULL,
    media_src TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    actor_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    post_id INTEGER DEFAULT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER DEFAULT 0,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL DEFAULT 0,
    text TEXT DEFAULT '',
    attachments_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    delivered_at TEXT DEFAULT '',
    read INTEGER DEFAULT 0,
    read_at TEXT DEFAULT '',
    unsent INTEGER DEFAULT 0,
    unsent_at TEXT DEFAULT '',
    pinned INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS message_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT DEFAULT '',
    pair_key TEXT DEFAULT '',
    is_group INTEGER DEFAULT 0,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_message_at TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS message_thread_members (
    thread_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at TEXT NOT NULL,
    last_read_at TEXT DEFAULT '',
    archived INTEGER DEFAULT 0,
    muted INTEGER DEFAULT 0,
    pinned INTEGER DEFAULT 0,
    folder TEXT DEFAULT 'inbox',
    accepted INTEGER DEFAULT 1,
    PRIMARY KEY (thread_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS message_hidden (
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    hidden_at TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS message_typing (
    thread_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (thread_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS message_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    initiator_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    mode TEXT NOT NULL DEFAULT 'audio',
    status TEXT NOT NULL DEFAULT 'ringing',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    answered_at TEXT DEFAULT '',
    ended_at TEXT DEFAULT '',
    ended_by INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS message_call_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id INTEGER NOT NULL,
    thread_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload_json TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  );
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_scale REAL DEFAULT 1");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE users ADD COLUMN banner_scale REAL DEFAULT 1");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE users ADD COLUMN banner_position_x REAL DEFAULT 50");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE users ADD COLUMN banner_position_y REAL DEFAULT 50");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE users ADD COLUMN ban_reason TEXT DEFAULT ''");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'home'");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE posts ADD COLUMN target_user_id INTEGER DEFAULT NULL");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE posts ADD COLUMN reply_audience TEXT DEFAULT 'everyone'");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN thread_id INTEGER DEFAULT 0");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN attachments_json TEXT DEFAULT '[]'");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN delivered_at TEXT DEFAULT ''");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN read_at TEXT DEFAULT ''");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN unsent INTEGER DEFAULT 0");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN unsent_at TEXT DEFAULT ''");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE messages ADD COLUMN pinned INTEGER DEFAULT 0");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE message_calls ADD COLUMN answered_at TEXT DEFAULT ''");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE message_calls ADD COLUMN ended_at TEXT DEFAULT ''");
} catch {
  // Column already exists.
}
try {
  db.exec("ALTER TABLE message_calls ADD COLUMN ended_by INTEGER DEFAULT 0");
} catch {
  // Column already exists.
}
try {
  db.exec("UPDATE posts SET visibility = 'home' WHERE visibility IS NULL OR visibility = ''");
} catch {
  // Ignore migration errors.
}
try {
  db.exec(
    "UPDATE posts SET reply_audience = 'everyone' WHERE reply_audience IS NULL OR reply_audience = ''"
  );
} catch {
  // Ignore migration errors.
}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_handle_lower ON users(lower(handle))");
} catch {
  // Existing duplicate handles can block the index; request-time checks still prevent new ones.
}
try {
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_pair_key ON message_threads(pair_key) WHERE pair_key != ''"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_message_members_user ON message_thread_members(user_id, thread_id)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_message_calls_users ON message_calls(initiator_id, recipient_id, status, updated_at)"
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_message_call_events_recipient ON message_call_events(recipient_id, id)"
  );
} catch {
  // Ignore index creation errors.
}

// Clear legacy placeholder media so existing accounts fall back to neutral blank states.
db.prepare(
  `UPDATE users
   SET avatar = '',
       avatar_scale = 1
   WHERE avatar = ?`
).run("/assets/rogue.jpg");

db.prepare(
  `UPDATE users
   SET banner = '',
       banner_scale = 1,
       banner_position_x = 50,
       banner_position_y = 50
   WHERE banner = ?`
).run("/assets/banner.jpg");

app.use(express.json({ limit: "10mb" }));
// Trust proxy headers (needed for Cloudflare + rate limiting).
app.set("trust proxy", TRUST_PROXY ? 1 : 0);
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Serve frontend build in production/local hosting (if built).
const hasClientBuild = fs.existsSync(path.join(clientDist, "index.html"));
if (hasClientBuild) {
  app.use(express.static(clientDist));
}

app.use(
  session({
    name: "circle.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

function sanitizeUser(row, options = {}) {
  if (!row) return null;
  const { includeEmail = false, includeModeration = false } = options;
  const user = {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio,
    location: row.location,
    link: row.link,
    avatar: row.avatar,
    banner: row.banner,
    avatarScale: Number(row.avatar_scale ?? 1) || 1,
    bannerScale: Number(row.banner_scale ?? 1) || 1,
    bannerPositionX: Number.isFinite(Number(row.banner_position_x))
      ? Number(row.banner_position_x)
      : 50,
    bannerPositionY: Number.isFinite(Number(row.banner_position_y))
      ? Number(row.banner_position_y)
      : 50,
    verified: Boolean(row.verified),
    isOwner: Boolean(row.is_owner),
    ownerTag: row.owner_tag,
    joined: row.joined,
    isPrivate: Boolean(row.is_private),
    followers: row.followers ?? 0,
    following: row.following ?? 0,
    posts: row.posts ?? 0,
  };
  if (includeEmail) {
    user.email = row.email;
  }
  if (includeModeration) {
    user.isBanned = Boolean(row.is_banned);
    user.banReason = row.ban_reason || "";
  }
  return user;
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  const banned = db
    .prepare("SELECT is_banned FROM users WHERE id = ?")
    .get(req.session.userId);
  if (banned?.is_banned) return res.status(403).json({ error: "Account banned" });
  return next();
}

function requireOwner(req, res, next) {
  const user = db.prepare("SELECT is_owner FROM users WHERE id = ?").get(req.session.userId);
  if (!user || !user.is_owner) return res.status(403).json({ error: "Forbidden" });
  return next();
}

function normalizeHandle(handle) {
  const trimmed = `${handle ?? ""}`.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function normalizeScaleValue(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.min(2.5, Math.max(1, parsed));
  return Number(clamped.toFixed(2));
}

function normalizePositionValue(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.min(100, Math.max(0, parsed));
  return Number(clamped.toFixed(2));
}

function normalizeReplyAudience(value) {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  if (["everyone", "following", "verified", "mentioned"].includes(normalized)) {
    return normalized;
  }
  return "everyone";
}

function getMentionHandlesFromText(text) {
  const matches = `${text ?? ""}`.match(/@[A-Za-z0-9_]+/g) ?? [];
  return new Set(matches.map((match) => match.toLowerCase()));
}

function findHandleConflict(handle, excludeUserId = null) {
  if (!handle) return null;
  if (excludeUserId == null) {
    return db.prepare("SELECT id FROM users WHERE lower(handle) = ?").get(handle.toLowerCase());
  }
  return db
    .prepare("SELECT id FROM users WHERE lower(handle) = ? AND id != ?")
    .get(handle.toLowerCase(), excludeUserId);
}

function canViewUserActivity(viewerId, profileUserId) {
  const normalizedUserId = Number(profileUserId);
  if (!normalizedUserId) return false;
  if (viewerId === normalizedUserId) return true;
  const user = db.prepare("SELECT is_private FROM users WHERE id = ?").get(normalizedUserId);
  if (!user) return false;
  if (!user.is_private) return true;
  const follow = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(viewerId, normalizedUserId);
  return Boolean(follow);
}

function canViewPost(viewerId, post) {
  if (!post) return false;
  if (post.visibility === "profile") {
    if (post.user_id === viewerId) return true;
    return canViewUserActivity(viewerId, post.target_user_id);
  }
  return canViewUserActivity(viewerId, post.user_id);
}

function canReplyToPost(viewerId, post) {
  if (!post) return false;
  if (post.user_id === viewerId) return true;
  const audience = normalizeReplyAudience(post.reply_audience);
  if (audience === "everyone") return true;
  if (audience === "following") {
    const follow = db
      .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
      .get(post.user_id, viewerId);
    return Boolean(follow);
  }
  if (audience === "verified") {
    const viewer = db.prepare("SELECT verified FROM users WHERE id = ?").get(viewerId);
    return Boolean(viewer?.verified);
  }
  if (audience === "mentioned") {
    const viewer = db.prepare("SELECT handle FROM users WHERE id = ?").get(viewerId);
    if (!viewer?.handle) return false;
    const mentionedHandles = getMentionHandlesFromText(post.text);
    return mentionedHandles.has(viewer.handle.toLowerCase());
  }
  return true;
}

function getPostAccessRow(postId) {
  return db
    .prepare(
      "SELECT id, user_id, text, visibility, target_user_id, reply_audience FROM posts WHERE id = ?"
    )
    .get(postId);
}

function getVisiblePost(postId, viewerId) {
  const post = getPostAccessRow(postId);
  if (!post) return { status: 404, error: "Not found" };
  if (!canViewPost(viewerId, post)) return { status: 403, error: "Forbidden" };
  return { post };
}

function createNotification({ userId, actorId, type, postId, text }) {
  if (!userId || !actorId || userId === actorId) return;
  db.prepare(
    `INSERT INTO notifications (user_id, actor_id, type, post_id, text, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, actorId, type, postId ?? null, text, now());
}

function safeJsonParse(value, fallback = []) {
  try {
    return JSON.parse(value ?? "");
  } catch {
    return fallback;
  }
}

function directPairKey(userId, partnerId) {
  const a = Math.min(Number(userId) || 0, Number(partnerId) || 0);
  const b = Math.max(Number(userId) || 0, Number(partnerId) || 0);
  return a > 0 && b > 0 ? `${a}:${b}` : "";
}

function normalizeMessageFolder(value) {
  const normalized = `${value ?? ""}`.trim().toLowerCase();
  if (["inbox", "priority", "work", "friends"].includes(normalized)) {
    return normalized;
  }
  return "inbox";
}

function normalizeMessageAttachments(rawAttachments) {
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments
    .slice(0, 4)
    .map((attachment) => {
      const type = `${attachment?.type ?? ""}`.trim().toLowerCase();
      const url = `${attachment?.url ?? attachment?.src ?? ""}`.trim();
      const name = `${attachment?.name ?? attachment?.label ?? ""}`.trim();
      const emoji = `${attachment?.emoji ?? ""}`.trim();
      const allowedType = ["image", "video", "audio", "file", "gif", "sticker"].includes(type)
        ? type
        : "file";
      if (!url && allowedType !== "sticker") return null;
      return {
        type: allowedType,
        url,
        name,
        emoji,
        voiceNote: Boolean(attachment?.voiceNote),
        size: Number.isFinite(Number(attachment?.size)) ? Number(attachment.size) : null,
      };
    })
    .filter(Boolean);
}

function getMessageAttachmentLabel(attachments) {
  if (!attachments?.length) return "";
  const first = attachments[0];
  if (first.type === "image") return "Photo";
  if (first.type === "video") return "Video";
  if (first.type === "audio") return first.voiceNote ? "Voice note" : "Audio";
  if (first.type === "gif") return "GIF";
  if (first.type === "sticker") return first.name || "Sticker";
  return first.name || "File";
}

function buildMessagePreview(row) {
  if (!row) return "";
  if (row.unsent) return "Message unsent";
  const text = `${row.text ?? ""}`.trim();
  if (text) return text;
  const attachments = normalizeMessageAttachments(safeJsonParse(row.attachments_json, []));
  return getMessageAttachmentLabel(attachments) || "New message";
}

function isFollowingUser(followerId, followingId) {
  if (!followerId || !followingId) return false;
  return Boolean(
    db
      .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
      .get(followerId, followingId)
  );
}

function getThreadRow(threadId) {
  return db.prepare("SELECT * FROM message_threads WHERE id = ?").get(threadId);
}

function getThreadMember(threadId, userId) {
  return db
    .prepare("SELECT * FROM message_thread_members WHERE thread_id = ? AND user_id = ?")
    .get(threadId, userId);
}

function getThreadParticipantRows(threadId) {
  return db
    .prepare(
      `SELECT users.id,
              users.name,
              users.handle,
              users.avatar,
              users.verified,
              users.is_owner,
              message_thread_members.role,
              message_thread_members.last_read_at,
              message_thread_members.archived,
              message_thread_members.muted,
              message_thread_members.pinned,
              message_thread_members.folder,
              message_thread_members.accepted
       FROM message_thread_members
       JOIN users ON users.id = message_thread_members.user_id
       WHERE message_thread_members.thread_id = ?
       ORDER BY users.name COLLATE NOCASE ASC`
    )
    .all(threadId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      handle: row.handle,
      avatar: row.avatar || "",
      verified: Boolean(row.verified),
      isOwner: Boolean(row.is_owner),
      role: row.role,
      lastReadAt: row.last_read_at || "",
      archived: Boolean(row.archived),
      muted: Boolean(row.muted),
      pinned: Boolean(row.pinned),
      folder: row.folder || "inbox",
      accepted: Boolean(row.accepted),
    }));
}

function ensureThreadMember(threadId, userId, options = {}) {
  const accepted = options.accepted == null ? 1 : options.accepted ? 1 : 0;
  const joinedAt = options.joinedAt || now();
  db.prepare(
    `INSERT OR IGNORE INTO message_thread_members
     (thread_id, user_id, role, joined_at, last_read_at, archived, muted, pinned, folder, accepted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    threadId,
    userId,
    options.role || "member",
    joinedAt,
    options.lastReadAt || "",
    options.archived ? 1 : 0,
    options.muted ? 1 : 0,
    options.pinned ? 1 : 0,
    normalizeMessageFolder(options.folder),
    accepted
  );

  const current = getThreadMember(threadId, userId);
  if (!current) return;

  db.prepare(
    `UPDATE message_thread_members
     SET accepted = ?,
         role = COALESCE(?, role),
         folder = COALESCE(?, folder),
         archived = COALESCE(?, archived),
         muted = COALESCE(?, muted),
         pinned = COALESCE(?, pinned)
     WHERE thread_id = ? AND user_id = ?`
  ).run(
    options.accepted == null ? current.accepted : accepted,
    options.role ?? null,
    options.folder ? normalizeMessageFolder(options.folder) : null,
    typeof options.archived === "boolean" ? (options.archived ? 1 : 0) : null,
    typeof options.muted === "boolean" ? (options.muted ? 1 : 0) : null,
    typeof options.pinned === "boolean" ? (options.pinned ? 1 : 0) : null,
    threadId,
    userId
  );
}

function touchMessageThread(threadId, timestamp = now()) {
  db.prepare(
    `UPDATE message_threads
     SET updated_at = ?,
         last_message_at = ?
     WHERE id = ?`
  ).run(timestamp, timestamp, threadId);
}

function ensureDirectMessageThread(userId, partnerId, options = {}) {
  const pairKey = directPairKey(userId, partnerId);
  if (!pairKey) return null;
  const existing = db.prepare("SELECT * FROM message_threads WHERE pair_key = ?").get(pairKey);
  const createdAt = options.createdAt || now();
  let threadId = existing?.id ?? null;

  if (!threadId) {
    const info = db
      .prepare(
        `INSERT INTO message_threads
         (title, pair_key, is_group, created_by, created_at, updated_at, last_message_at)
         VALUES (?, ?, 0, ?, ?, ?, ?)`
      )
      .run("", pairKey, userId, createdAt, createdAt, createdAt);
    threadId = Number(info.lastInsertRowid);
  }

  ensureThreadMember(threadId, userId, {
    accepted: true,
    joinedAt: createdAt,
    lastReadAt: createdAt,
  });
  ensureThreadMember(threadId, partnerId, {
    accepted: options.acceptedForPartner ?? true,
    joinedAt: createdAt,
  });
  return threadId;
}

function getTypingUsers(threadId, viewerId) {
  const cutoff = new Date(Date.now() - 8000).toISOString();
  return db
    .prepare(
      `SELECT users.id, users.name, users.handle
       FROM message_typing
       JOIN users ON users.id = message_typing.user_id
       WHERE message_typing.thread_id = ?
         AND message_typing.user_id != ?
         AND message_typing.updated_at >= ?
       ORDER BY message_typing.updated_at DESC`
    )
    .all(threadId, viewerId, cutoff)
    .map((row) => ({
      id: row.id,
      name: row.name,
      handle: row.handle,
    }));
}

function buildThreadSummary(threadId, viewerId) {
  const thread = getThreadRow(threadId);
  if (!thread) return null;
  const member = getThreadMember(threadId, viewerId);
  if (!member) return null;

  const participants = getThreadParticipantRows(threadId);
  const otherParticipants = participants.filter((participant) => participant.id !== viewerId);
  const latestMessage = db
    .prepare(
      `SELECT messages.*
       FROM messages
       LEFT JOIN message_hidden
         ON message_hidden.message_id = messages.id
        AND message_hidden.user_id = ?
       WHERE messages.thread_id = ?
         AND message_hidden.message_id IS NULL
       ORDER BY messages.created_at DESC
       LIMIT 1`
    )
    .get(viewerId, threadId);

  const unreadCount =
    db
      .prepare(
        `SELECT COUNT(*) as count
         FROM messages
         LEFT JOIN message_hidden
           ON message_hidden.message_id = messages.id
          AND message_hidden.user_id = ?
         WHERE messages.thread_id = ?
           AND messages.sender_id != ?
           AND message_hidden.message_id IS NULL
           AND messages.unsent = 0
           AND messages.created_at > COALESCE(NULLIF(?, ''), '')`
      )
      .get(viewerId, threadId, viewerId, member.last_read_at || "")?.count ?? 0;

  const displayName = thread.is_group
    ? thread.title || otherParticipants.map((participant) => participant.name).slice(0, 3).join(", ") || "Group chat"
    : otherParticipants[0]?.name || "Unknown";
  const displayHandle = thread.is_group
    ? `${participants.length} members`
    : otherParticipants[0]?.handle || "@unknown";
  const avatar = thread.is_group ? "" : otherParticipants[0]?.avatar || "";

  return {
    id: thread.id,
    title: displayName,
    name: displayName,
    handle: displayHandle,
    avatar,
    avatars: otherParticipants.slice(0, 3).map((participant) => participant.avatar).filter(Boolean),
    isGroup: Boolean(thread.is_group),
    participants,
    memberCount: participants.length,
    preview: buildMessagePreview(latestMessage),
    time: latestMessage?.created_at || thread.updated_at || thread.created_at,
    unreadCount,
    muted: Boolean(member.muted),
    archived: Boolean(member.archived),
    pinned: Boolean(member.pinned),
    folder: member.folder || "inbox",
    isRequest: !member.accepted,
    typingUsers: getTypingUsers(threadId, viewerId),
    lastMessageStatus: latestMessage
      ? latestMessage.unsent
        ? "unsent"
        : latestMessage.read_at
          ? "read"
          : latestMessage.delivered_at
            ? "delivered"
            : "sent"
      : "idle",
  };
}

function listThreadsForUser(userId) {
  const memberships = db
    .prepare("SELECT thread_id FROM message_thread_members WHERE user_id = ?")
    .all(userId);
  return memberships
    .map((row) => buildThreadSummary(row.thread_id, userId))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.archived !== b.archived) return a.archived ? 1 : -1;
      if (a.isRequest !== b.isRequest) return a.isRequest ? -1 : 1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
}

function getThreadDetail(threadId, viewerId) {
  const membership = getThreadMember(threadId, viewerId);
  if (!membership) return null;
  const readAt = now();
  db.prepare(
    `UPDATE message_thread_members
     SET last_read_at = ?
     WHERE thread_id = ? AND user_id = ?`
  ).run(readAt, threadId, viewerId);
  db.prepare(
    `UPDATE messages
     SET read = 1,
         read_at = CASE WHEN read_at = '' THEN ? ELSE read_at END
     WHERE thread_id = ?
       AND sender_id != ?
       AND unsent = 0`
  ).run(readAt, threadId, viewerId);

  const participants = getThreadParticipantRows(threadId);
  const rows = db
    .prepare(
      `SELECT messages.*,
              users.name as sender_name,
              users.handle as sender_handle,
              users.avatar as sender_avatar,
              users.verified as sender_verified,
              users.is_owner as sender_is_owner
       FROM messages
       JOIN users ON users.id = messages.sender_id
       LEFT JOIN message_hidden
         ON message_hidden.message_id = messages.id
        AND message_hidden.user_id = ?
       WHERE messages.thread_id = ?
         AND message_hidden.message_id IS NULL
       ORDER BY messages.created_at ASC`
    )
    .all(viewerId, threadId);

  const messages = rows.map((row) => {
    const attachments = normalizeMessageAttachments(safeJsonParse(row.attachments_json, []));
    const seenByCount = row.sender_id === viewerId
      ? participants.filter(
          (participant) =>
            participant.id !== viewerId &&
            participant.accepted &&
            participant.lastReadAt &&
            participant.lastReadAt >= row.created_at
        ).length
      : 0;
    const isOwn = row.sender_id === viewerId;
    const status = row.unsent
      ? "unsent"
      : row.read_at
        ? "read"
        : row.delivered_at
          ? "delivered"
          : "sent";

    return {
      id: row.id,
      threadId,
      senderId: row.sender_id,
      from: isOwn ? "you" : "them",
      isOwn,
      text: row.unsent ? "" : row.text,
      attachments,
      time: row.created_at,
      deliveredAt: row.delivered_at || row.created_at,
      readAt: row.read_at || "",
      read: Boolean(row.read_at || row.read),
      unsent: Boolean(row.unsent),
      pinned: Boolean(row.pinned),
      status,
      statusLabel: row.unsent
        ? "Unsent"
        : isOwn
          ? seenByCount > 0
            ? `Seen by ${seenByCount}`
            : row.read_at
              ? "Seen"
              : row.delivered_at
                ? "Delivered"
                : "Sent"
          : row.read_at
            ? "Read"
            : "Delivered",
      seenByCount,
      sender: {
        id: row.sender_id,
        name: row.sender_name,
        handle: row.sender_handle,
        avatar: row.sender_avatar || "",
        verified: Boolean(row.sender_verified),
        isOwner: Boolean(row.sender_is_owner),
      },
    };
  });

  return {
    thread: buildThreadSummary(threadId, viewerId),
    messages,
  };
}

function backfillLegacyMessageThreads() {
  const legacyRows = db
    .prepare(
      `SELECT id, sender_id, receiver_id, created_at, read
       FROM messages
       WHERE COALESCE(thread_id, 0) = 0
       ORDER BY created_at ASC`
    )
    .all();

  for (const row of legacyRows) {
    if (!row.receiver_id) continue;
    const threadId = ensureDirectMessageThread(row.sender_id, row.receiver_id, {
      acceptedForPartner: true,
      createdAt: row.created_at,
    });
    if (!threadId) continue;
    db.prepare(
      `UPDATE messages
       SET thread_id = ?,
           delivered_at = CASE WHEN delivered_at = '' THEN created_at ELSE delivered_at END,
           read_at = CASE WHEN read = 1 AND read_at = '' THEN created_at ELSE read_at END
       WHERE id = ?`
    ).run(threadId, row.id);
    if (row.read) {
      db.prepare(
        `UPDATE message_thread_members
         SET last_read_at = CASE
           WHEN last_read_at = '' OR last_read_at < ? THEN ?
           ELSE last_read_at
         END
         WHERE thread_id = ? AND user_id = ?`
      ).run(row.created_at, row.created_at, threadId, row.receiver_id);
    }
    touchMessageThread(threadId, row.created_at);
  }

  const updatedThreads = db.prepare("SELECT id FROM message_threads").all();
  for (const thread of updatedThreads) {
    const latest = db
      .prepare("SELECT created_at FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(thread.id);
    if (latest?.created_at) {
      touchMessageThread(thread.id, latest.created_at);
    }
  }
}

backfillLegacyMessageThreads();

function normalizeCallMode(value) {
  return `${value ?? ""}`.trim().toLowerCase() === "video" ? "video" : "audio";
}

function isLiveCallStatus(status) {
  return ["ringing", "active"].includes(`${status ?? ""}`.trim().toLowerCase());
}

function isVisibleCallStatus(status) {
  return ["ringing", "active", "ended", "declined", "canceled", "missed"].includes(
    `${status ?? ""}`.trim().toLowerCase()
  );
}

function getCallRow(callId) {
  return db.prepare("SELECT * FROM message_calls WHERE id = ?").get(callId);
}

function getCallPartnerId(call, userId) {
  if (!call) return 0;
  return call.initiator_id === userId ? call.recipient_id : call.initiator_id;
}

function createCallEvent(call, senderId, type, payload = {}) {
  const recipientId = getCallPartnerId(call, senderId);
  const createdAt = now();
  const info = db
    .prepare(
      `INSERT INTO message_call_events
       (call_id, thread_id, sender_id, recipient_id, type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      call.id,
      call.thread_id,
      senderId,
      recipientId,
      type,
      JSON.stringify(payload ?? {}),
      createdAt
    );
  db.prepare("UPDATE message_calls SET updated_at = ? WHERE id = ?").run(createdAt, call.id);
  return Number(info.lastInsertRowid);
}

function updateCallStatus(callId, status, options = {}) {
  const timestamp = options.at || now();
  const normalizedStatus = `${status ?? ""}`.trim().toLowerCase();
  db.prepare(
    `UPDATE message_calls
     SET status = ?,
         updated_at = ?,
         answered_at = CASE
           WHEN ? != '' AND answered_at = '' THEN ?
           ELSE answered_at
         END,
         ended_at = CASE
           WHEN ? != '' THEN ?
           ELSE ended_at
         END,
         ended_by = CASE
           WHEN ? > 0 THEN ?
           ELSE ended_by
         END
     WHERE id = ?`
  ).run(
    normalizedStatus,
    timestamp,
    options.answeredAt || "",
    options.answeredAt || "",
    options.endedAt || "",
    options.endedAt || "",
    options.endedBy || 0,
    options.endedBy || 0,
    callId
  );
}

function buildCallSummary(callOrId, viewerId) {
  const call =
    typeof callOrId === "object" && callOrId
      ? callOrId
      : db.prepare("SELECT * FROM message_calls WHERE id = ?").get(callOrId);
  if (!call) return null;
  const thread = buildThreadSummary(call.thread_id, viewerId);
  if (!thread) return null;
  const partnerId = getCallPartnerId(call, viewerId);
  const partner =
    thread.participants?.find((participant) => participant.id === partnerId) ?? null;

  return {
    id: call.id,
    threadId: call.thread_id,
    mode: normalizeCallMode(call.mode),
    status: call.status,
    initiatorId: call.initiator_id,
    recipientId: call.recipient_id,
    createdAt: call.created_at,
    updatedAt: call.updated_at,
    answeredAt: call.answered_at || "",
    endedAt: call.ended_at || "",
    endedBy: Number(call.ended_by || 0),
    threadName: thread.name,
    isGroup: Boolean(thread.isGroup),
    partner: partner
      ? {
          id: partner.id,
          name: partner.name,
          handle: partner.handle,
          avatar: partner.avatar || "",
          verified: Boolean(partner.verified),
          isOwner: Boolean(partner.isOwner),
        }
      : null,
  };
}

function getCurrentCallForUser(userId) {
  const recentCutoff = new Date(Date.now() - 15000).toISOString();
  const row = db
    .prepare(
      `SELECT *
       FROM message_calls
       WHERE (initiator_id = ? OR recipient_id = ?)
         AND (
           status IN ('ringing', 'active')
           OR (status IN ('ended', 'declined', 'canceled', 'missed') AND updated_at >= ?)
         )
       ORDER BY
         CASE WHEN status IN ('ringing', 'active') THEN 0 ELSE 1 END,
         updated_at DESC
       LIMIT 1`
    )
    .get(userId, userId, recentCutoff);
  return row ? buildCallSummary(row, userId) : null;
}

function listCallEventsForUser(userId, afterId = 0) {
  return db
    .prepare(
      `SELECT *
       FROM message_call_events
       WHERE id > ?
         AND (sender_id = ? OR recipient_id = ?)
       ORDER BY id ASC
       LIMIT 200`
    )
    .all(afterId, userId, userId)
    .map((row) => ({
      id: row.id,
      callId: row.call_id,
      threadId: row.thread_id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      type: row.type,
      payload: safeJsonParse(row.payload_json, {}),
      createdAt: row.created_at,
    }));
}

function getDirectCallPartner(threadId, userId) {
  const thread = getThreadRow(threadId);
  if (!thread || thread.is_group) return null;
  const member = getThreadMember(threadId, userId);
  if (!member || !member.accepted) return null;
  const participants = getThreadParticipantRows(threadId).filter((participant) => participant.accepted);
  const partner = participants.find((participant) => participant.id !== userId) ?? null;
  return partner ? { thread, partner } : null;
}

function getBusyCallForUsers(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return null;
  const uniqueIds = Array.from(new Set(userIds.map((value) => Number(value)).filter(Boolean)));
  if (uniqueIds.length === 0) return null;
  const placeholders = uniqueIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT *
       FROM message_calls
       WHERE status IN ('ringing', 'active')
         AND (
           initiator_id IN (${placeholders})
           OR recipient_id IN (${placeholders})
         )
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get(...uniqueIds, ...uniqueIds);
}

function getProfileMediaContext(targetUserId, kind) {
  if (!["avatar", "banner"].includes(kind)) return null;
  const user = db
    .prepare("SELECT id, name, handle, avatar, banner FROM users WHERE id = ?")
    .get(targetUserId);
  if (!user) return null;
  const src = kind === "avatar" ? user.avatar : user.banner;
  if (!src) return null;
  return {
    targetUserId: user.id,
    kind,
    src,
    ownerName: user.name,
    ownerHandle: user.handle,
  };
}

function getProfileMediaPayload(targetUserId, kind, viewerId) {
  const context = getProfileMediaContext(targetUserId, kind);
  if (!context) return null;
  const likes = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM profile_media_likes
       WHERE target_user_id = ? AND media_kind = ? AND media_src = ?`
    )
    .get(context.targetUserId, context.kind, context.src)?.count ?? 0;
  const likedByMe = Boolean(
    db
      .prepare(
        `SELECT 1
         FROM profile_media_likes
         WHERE user_id = ? AND target_user_id = ? AND media_kind = ? AND media_src = ?`
      )
      .get(viewerId, context.targetUserId, context.kind, context.src)
  );
  const comments = db
    .prepare(
      `SELECT profile_media_comments.id,
              profile_media_comments.text,
              profile_media_comments.created_at,
              users.id as user_id,
              users.name,
              users.handle,
              users.avatar
       FROM profile_media_comments
       JOIN users ON users.id = profile_media_comments.user_id
       WHERE profile_media_comments.target_user_id = ?
         AND profile_media_comments.media_kind = ?
         AND profile_media_comments.media_src = ?
       ORDER BY profile_media_comments.created_at DESC
       LIMIT 50`
    )
    .all(context.targetUserId, context.kind, context.src)
    .map((row) => ({
      id: row.id,
      text: row.text,
      time: row.created_at,
      userId: row.user_id,
      name: row.name,
      handle: row.handle,
      avatar: row.avatar || "",
    }));

  return {
    ...context,
    likes,
    likedByMe,
    comments,
  };
}

function enrichPostRow(row, viewerId) {
  let quoteOf = null;
  if (row.quote_of) {
    const quoteRow = db
      .prepare(
        `SELECT posts.id, posts.text, posts.image, users.name, users.handle
         FROM posts
         JOIN users ON posts.user_id = users.id
         WHERE posts.id = ?`
      )
      .get(row.quote_of);
    if (quoteRow) {
      quoteOf = {
        id: quoteRow.id,
        text: quoteRow.text,
        image: quoteRow.image,
        authorName: quoteRow.name,
        authorHandle: quoteRow.handle,
      };
    }
  }
  const liked = db
    .prepare("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?")
    .get(viewerId, row.id);
  const bookmarked = db
    .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND post_id = ?")
    .get(viewerId, row.id);
  const reposted = db
    .prepare("SELECT 1 FROM reposts WHERE user_id = ? AND post_id = ?")
    .get(viewerId, row.id);

  return {
    id: row.id,
    userId: row.user_id,
    targetUserId: row.target_user_id,
    visibility: row.visibility,
    replyAudience: normalizeReplyAudience(row.reply_audience),
    canReply: canReplyToPost(viewerId, row),
    name: row.name,
    handle: row.handle,
    verified: Boolean(row.verified),
    avatar: row.avatar || "",
    time: row.created_at,
    text: row.text,
    image: row.image || "",
    likes: row.likes_count,
    comments: row.comments_count,
    reposts: row.reposts_count,
    bookmarks: row.bookmarks_count,
    shares: 0,
    views: row.views_count,
    replies: [],
    replyTo: row.reply_to,
    quoteOf,
    poll: row.poll_json ? JSON.parse(row.poll_json) : null,
    likedByMe: Boolean(liked),
    bookmarkedByMe: Boolean(bookmarked),
    repostedByMe: Boolean(reposted),
  };
}

function queryPosts(sqlWhere, params, viewerId) {
  const visibilitySql = `
    (
      (posts.visibility = 'home' AND (
        users.is_private = 0
        OR posts.user_id = ?
        OR EXISTS (
          SELECT 1
          FROM follows
          WHERE follower_id = ? AND following_id = posts.user_id
        )
      ))
      OR
      (posts.visibility = 'profile' AND (
        COALESCE(target_user.is_private, 0) = 0
        OR posts.target_user_id = ?
        OR posts.user_id = ?
        OR EXISTS (
          SELECT 1
          FROM follows
          WHERE follower_id = ? AND following_id = posts.target_user_id
        )
      ))
    )
  `;
  const whereClause = sqlWhere ? `${sqlWhere} AND ${visibilitySql}` : `WHERE ${visibilitySql}`;
  const rows = db
    .prepare(
      `SELECT posts.*, users.name, users.handle, users.avatar, users.verified
       FROM posts
       JOIN users ON posts.user_id = users.id
       LEFT JOIN users AS target_user ON posts.target_user_id = target_user.id
       ${whereClause}
       ORDER BY posts.created_at DESC
       LIMIT 100`
    )
    .all(...params, viewerId, viewerId, viewerId, viewerId, viewerId);
  return rows.map((row) => enrichPostRow(row, viewerId));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/news", async (req, res) => {
  try {
    if (!GNEWS_KEY) return res.json({ items: [] });
    const nowMs = Date.now();
    if (newsCache.items.length > 0 && nowMs - newsCache.at < 5 * 60 * 1000) {
      return res.json({ items: newsCache.items });
    }
    const url = new URL("https://gnews.io/api/v4/top-headlines");
    url.searchParams.set("lang", "en");
    url.searchParams.set("country", "us");
    url.searchParams.set("max", "5");
    url.searchParams.set("apikey", GNEWS_KEY);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("News request failed");
    const data = await response.json();
    const items =
      data.articles?.map((article) => ({
        title: article.title,
        meta: article.source?.name ?? "Top headlines",
        url: article.url,
      })) ?? [];
    newsCache = { at: nowMs, items };
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

app.get("/status", requireAuth, requireOwner, (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    time: new Date().toISOString(),
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name, handle, remember } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedHandle = normalizeHandle(handle);
    if (!normalizedEmail || !password || !name || !normalizedHandle) {
      return res.status(400).json({ error: "Missing fields" });
    }
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }
    const existingHandle = findHandleConflict(normalizedHandle);
    if (existingHandle) {
      return res.status(409).json({ error: "Handle already in use" });
    }

    const countRow = db.prepare("SELECT COUNT(*) as count FROM users").get();
    const isOwner = countRow.count === 0;
    const passwordHash = await bcrypt.hash(password, 10);
    const joined = new Date().toLocaleString("en-AU", {
      month: "long",
      year: "numeric",
    });

    const stmt = db.prepare(`
      INSERT INTO users (
        email,
        password_hash,
        name,
        handle,
        avatar,
        banner,
        verified,
        is_owner,
        owner_tag,
        joined
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      normalizedEmail,
      passwordHash,
      name,
      normalizedHandle,
      "",
      "",
      isOwner ? 1 : 0,
      isOwner ? 1 : 0,
      isOwner ? "Official Owner of Circle" : "",
      joined
    );

    req.session.userId = info.lastInsertRowid;
    if (remember === false) {
      req.session.cookie.expires = false;
      req.session.cookie.maxAge = null;
    } else {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    res.json({
      user: sanitizeUser(user, { includeEmail: true, includeModeration: true }),
    });
  } catch {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email?.toLowerCase());
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    if (user.is_banned) {
      return res.status(403).json({ error: "Account banned" });
    }
    req.session.userId = user.id;
    if (remember === false) {
      req.session.cookie.expires = false;
      req.session.cookie.maxAge = null;
    } else {
    req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    res.json({
      user: sanitizeUser(user, { includeEmail: true, includeModeration: true }),
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("circle.sid");
    res.json({ ok: true });
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       WHERE users.id = ?`
    )
    .get(req.session.userId);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({
    user: sanitizeUser(user, { includeEmail: true, includeModeration: true }),
  });
});

app.get("/api/users", requireAuth, (req, res) => {
  const users = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       ORDER BY id ASC`
    )
    .all();
  const publicUsers = users.map((row) => sanitizeUser(row));
  res.json({ users: publicUsers });
});

app.get("/api/admin/users", requireAuth, requireOwner, (req, res) => {
  const users = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       ORDER BY id ASC`
    )
    .all()
    .map((row) => sanitizeUser(row, { includeEmail: true, includeModeration: true }));
  res.json({ users });
});

app.get("/api/admin/summary", requireAuth, requireOwner, (req, res) => {
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const posts = db.prepare("SELECT COUNT(*) as count FROM posts").get().count;
  const banned = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_banned = 1").get().count;
  res.json({ users, posts, banned });
});

app.get("/api/admin/status", requireAuth, requireOwner, (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    time: new Date().toISOString(),
    memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    node: process.version,
  });
});

app.get("/api/admin/posts", requireAuth, requireOwner, (req, res) => {
  const rows = db
    .prepare(
      `SELECT posts.*, users.name, users.handle, users.avatar, users.verified
       FROM posts
       JOIN users ON posts.user_id = users.id
       ORDER BY posts.created_at DESC
       LIMIT 50`
    )
    .all();
  const posts = rows.map((row) => enrichPostRow(row, req.session.userId));
  res.json({ posts });
});

app.get("/api/admin/users/:id/posts", requireAuth, requireOwner, (req, res) => {
  const userId = Number(req.params.id);
  const rows = db
    .prepare(
      `SELECT posts.*, users.name, users.handle, users.avatar, users.verified
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE posts.user_id = ?
       ORDER BY posts.created_at DESC
       LIMIT 25`
    )
    .all(userId);
  const posts = rows.map((row) => enrichPostRow(row, req.session.userId));
  res.json({ posts });
});

app.delete("/api/admin/posts/:id", requireAuth, requireOwner, (req, res) => {
  const postId = Number(req.params.id);
  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
  res.json({ ok: true });
});

app.patch("/api/admin/users/:id", requireAuth, requireOwner, async (req, res) => {
  const targetId = Number(req.params.id);
  const rawUpdates = req.body || {};
  const normalizedHandle = Object.prototype.hasOwnProperty.call(rawUpdates, "handle")
    ? normalizeHandle(rawUpdates.handle)
    : null;
  if (Object.prototype.hasOwnProperty.call(rawUpdates, "handle") && !normalizedHandle) {
    return res.status(400).json({ error: "Handle is required" });
  }
  if (normalizedHandle) {
    const existingHandle = findHandleConflict(normalizedHandle, targetId);
    if (existingHandle) {
      return res.status(409).json({ error: "Handle already in use" });
    }
  }
  const passwordHash = rawUpdates.password
    ? await bcrypt.hash(rawUpdates.password, 10)
    : null;
  const avatarScale = normalizeScaleValue(rawUpdates.avatarScale);
  const bannerScale = normalizeScaleValue(rawUpdates.bannerScale);
  const bannerPositionX = normalizePositionValue(rawUpdates.bannerPositionX);
  const bannerPositionY = normalizePositionValue(rawUpdates.bannerPositionY);

  const stmt = db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        handle = COALESCE(?, handle),
        bio = COALESCE(?, bio),
        location = COALESCE(?, location),
        link = COALESCE(?, link),
        avatar = COALESCE(?, avatar),
        banner = COALESCE(?, banner),
        avatar_scale = COALESCE(?, avatar_scale),
        banner_scale = COALESCE(?, banner_scale),
        banner_position_x = COALESCE(?, banner_position_x),
        banner_position_y = COALESCE(?, banner_position_y),
        verified = COALESCE(?, verified),
        is_owner = COALESCE(?, is_owner),
        owner_tag = COALESCE(?, owner_tag),
        is_private = COALESCE(?, is_private),
        is_banned = COALESCE(?, is_banned),
        ban_reason = COALESCE(?, ban_reason),
        password_hash = COALESCE(?, password_hash)
    WHERE id = ?
  `);

  stmt.run(
    rawUpdates.name ?? null,
    normalizedHandle,
    rawUpdates.bio ?? null,
    rawUpdates.location ?? null,
    rawUpdates.link ?? null,
    rawUpdates.avatar ?? null,
    rawUpdates.banner ?? null,
    avatarScale,
    bannerScale,
    bannerPositionX,
    bannerPositionY,
    typeof rawUpdates.verified === "boolean" ? (rawUpdates.verified ? 1 : 0) : null,
    typeof rawUpdates.isOwner === "boolean" ? (rawUpdates.isOwner ? 1 : 0) : null,
    rawUpdates.ownerTag ?? null,
    typeof rawUpdates.isPrivate === "boolean" ? (rawUpdates.isPrivate ? 1 : 0) : null,
    typeof rawUpdates.isBanned === "boolean" ? (rawUpdates.isBanned ? 1 : 0) : null,
    rawUpdates.banReason ?? null,
    passwordHash,
    targetId
  );

  const user = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       WHERE users.id = ?`
    )
    .get(targetId);
  res.json({
    user: sanitizeUser(user, { includeEmail: true, includeModeration: true }),
  });
});

app.get("/api/users/:id", requireAuth, (req, res) => {
  const user = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       WHERE users.id = ?`
    )
    .get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ user: sanitizeUser(user) });
});

app.put("/api/users/me", requireAuth, (req, res) => {
  const rawUpdates = req.body || {};
  const updates = (({
    name,
    handle,
    bio,
    location,
    link,
    avatar,
    banner,
    avatarScale,
    bannerScale,
    bannerPositionX,
    bannerPositionY,
    isPrivate,
  }) => ({
    name,
    handle,
    bio,
    location,
    link,
    avatar,
    banner,
    avatarScale,
    bannerScale,
    bannerPositionX,
    bannerPositionY,
    isPrivate,
  }))(rawUpdates);
  const normalizedHandle = Object.prototype.hasOwnProperty.call(rawUpdates, "handle")
    ? normalizeHandle(rawUpdates.handle)
    : null;
  const normalizedAvatarScale = normalizeScaleValue(rawUpdates.avatarScale);
  const normalizedBannerScale = normalizeScaleValue(rawUpdates.bannerScale);
  const normalizedBannerPositionX = normalizePositionValue(rawUpdates.bannerPositionX);
  const normalizedBannerPositionY = normalizePositionValue(rawUpdates.bannerPositionY);
  if (Object.prototype.hasOwnProperty.call(rawUpdates, "handle") && !normalizedHandle) {
    return res.status(400).json({ error: "Handle is required" });
  }
  if (normalizedHandle) {
    const existingHandle = findHandleConflict(normalizedHandle, req.session.userId);
    if (existingHandle) {
      return res.status(409).json({ error: "Handle already in use" });
    }
  }

  const stmt = db.prepare(`
    UPDATE users
    SET name = COALESCE(?, name),
        handle = COALESCE(?, handle),
        bio = COALESCE(?, bio),
        location = COALESCE(?, location),
        link = COALESCE(?, link),
        avatar = COALESCE(?, avatar),
        banner = COALESCE(?, banner),
        avatar_scale = COALESCE(?, avatar_scale),
        banner_scale = COALESCE(?, banner_scale),
        banner_position_x = COALESCE(?, banner_position_x),
        banner_position_y = COALESCE(?, banner_position_y),
        is_private = COALESCE(?, is_private)
    WHERE id = ?
  `);

  stmt.run(
    updates.name,
    normalizedHandle,
    updates.bio,
    updates.location,
    updates.link,
    updates.avatar,
    updates.banner,
    normalizedAvatarScale,
    normalizedBannerScale,
    normalizedBannerPositionX,
    normalizedBannerPositionY,
    typeof updates.isPrivate === "boolean" ? (updates.isPrivate ? 1 : 0) : null,
    req.session.userId
  );

  const user = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       WHERE users.id = ?`
    )
    .get(req.session.userId);
  res.json({
    user: sanitizeUser(user, { includeEmail: true, includeModeration: true }),
  });
});

app.get("/api/profile-media/:userId/:kind", requireAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  const kind = `${req.params.kind ?? ""}`.toLowerCase();
  const media = getProfileMediaPayload(targetUserId, kind, req.session.userId);
  if (!media) return res.status(404).json({ error: "Profile media not found" });
  res.json({ media });
});

app.post("/api/profile-media/:userId/:kind/like", requireAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  const kind = `${req.params.kind ?? ""}`.toLowerCase();
  const media = getProfileMediaContext(targetUserId, kind);
  if (!media) return res.status(404).json({ error: "Profile media not found" });
  const existing = db
    .prepare(
      `SELECT 1
       FROM profile_media_likes
       WHERE user_id = ? AND target_user_id = ? AND media_kind = ? AND media_src = ?`
    )
    .get(req.session.userId, media.targetUserId, media.kind, media.src);
  if (existing) {
    db.prepare(
      `DELETE FROM profile_media_likes
       WHERE user_id = ? AND target_user_id = ? AND media_kind = ? AND media_src = ?`
    ).run(req.session.userId, media.targetUserId, media.kind, media.src);
  } else {
    db.prepare(
      `INSERT INTO profile_media_likes (user_id, target_user_id, media_kind, media_src, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(req.session.userId, media.targetUserId, media.kind, media.src, now());
    createNotification({
      userId: media.targetUserId,
      actorId: req.session.userId,
      type: "like",
      text: `liked your ${media.kind === "avatar" ? "profile photo" : "cover photo"}`,
    });
  }
  const likes = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM profile_media_likes
       WHERE target_user_id = ? AND media_kind = ? AND media_src = ?`
    )
    .get(media.targetUserId, media.kind, media.src)?.count ?? 0;
  res.json({
    liked: !existing,
    likes,
    media: getProfileMediaPayload(media.targetUserId, media.kind, req.session.userId),
  });
});

app.post("/api/profile-media/:userId/:kind/comments", requireAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  const kind = `${req.params.kind ?? ""}`.toLowerCase();
  const media = getProfileMediaContext(targetUserId, kind);
  if (!media) return res.status(404).json({ error: "Profile media not found" });
  const text = `${req.body?.text ?? ""}`.trim();
  if (!text) return res.status(400).json({ error: "Comment is required" });
  const result = db
    .prepare(
      `INSERT INTO profile_media_comments (user_id, target_user_id, media_kind, media_src, text, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.session.userId, media.targetUserId, media.kind, media.src, text, now());
  createNotification({
    userId: media.targetUserId,
    actorId: req.session.userId,
    type: "reply",
    text: `commented on your ${media.kind === "avatar" ? "profile photo" : "cover photo"}`,
  });
  const comment = db
    .prepare(
      `SELECT profile_media_comments.id,
              profile_media_comments.text,
              profile_media_comments.created_at,
              users.id as user_id,
              users.name,
              users.handle,
              users.avatar
       FROM profile_media_comments
       JOIN users ON users.id = profile_media_comments.user_id
       WHERE profile_media_comments.id = ?`
    )
    .get(result.lastInsertRowid);
  res.json({
    comment: comment
      ? {
          id: comment.id,
          text: comment.text,
          time: comment.created_at,
          userId: comment.user_id,
          name: comment.name,
          handle: comment.handle,
          avatar: comment.avatar || "",
        }
      : null,
    media: getProfileMediaPayload(media.targetUserId, media.kind, req.session.userId),
  });
});

app.post("/api/follow/:id", requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.session.userId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }
  const existing = db
    .prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(req.session.userId, targetId);
  if (existing) {
    db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(
      req.session.userId,
      targetId
    );
  } else {
    db.prepare(
      "INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)"
    ).run(req.session.userId, targetId, now());
    createNotification({
      userId: targetId,
      actorId: req.session.userId,
      type: "follow",
      text: "started following you",
    });
  }

  const followerCount = db
    .prepare("SELECT COUNT(*) as count FROM follows WHERE following_id = ?")
    .get(targetId).count;
  const followingCount = db
    .prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ?")
    .get(req.session.userId).count;

  res.json({
    following: !existing,
    followerCount,
    followingCount,
  });
});

app.get("/api/follows", requireAuth, (req, res) => {
  const following = db
    .prepare("SELECT following_id FROM follows WHERE follower_id = ?")
    .all(req.session.userId)
    .map((row) => row.following_id);
  const followers = db
    .prepare("SELECT follower_id FROM follows WHERE following_id = ?")
    .all(req.session.userId)
    .map((row) => row.follower_id);
  res.json({ following, followers });
});

app.post("/api/posts", requireAuth, (req, res) => {
  const { text, image, poll, replyTo, quoteOf, visibility, targetUserId, replyAudience } =
    req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: "Missing text" });
  const pollJson = poll ? JSON.stringify(poll) : "";
  let finalVisibility = visibility === "profile" ? "profile" : "home";
  let finalTarget = targetUserId == null ? null : Number(targetUserId);
  const finalReplyAudience = normalizeReplyAudience(replyAudience);
  if (finalVisibility === "profile" && !finalTarget) {
    finalTarget = req.session.userId;
  }
  if (finalVisibility === "profile" && !canViewUserActivity(req.session.userId, finalTarget)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (replyTo) {
    const parent = getPostAccessRow(Number(replyTo));
    if (!parent) return res.status(404).json({ error: "Not found" });
    if (!canViewPost(req.session.userId, parent)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!canReplyToPost(req.session.userId, parent)) {
      return res.status(403).json({ error: "Replies restricted" });
    }
    if (parent) {
      finalVisibility = parent.visibility ?? "home";
      finalTarget = parent.target_user_id ?? null;
    }
  }
  if (quoteOf) {
    const quoted = getVisiblePost(Number(quoteOf), req.session.userId);
    if (quoted.error) {
      return res.status(quoted.status).json({ error: quoted.error });
    }
  }
  const stmt = db.prepare(`
    INSERT INTO posts (
      user_id,
      text,
      image,
      created_at,
      reply_to,
      quote_of,
      visibility,
      target_user_id,
      reply_audience,
      poll_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    req.session.userId,
    text.trim(),
    image || "",
    now(),
    replyTo ?? null,
    quoteOf ?? null,
    finalVisibility,
    finalTarget,
    finalReplyAudience,
    pollJson
  );

  if (replyTo) {
    db.prepare("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?").run(replyTo);
    const original = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(replyTo);
    if (original) {
      createNotification({
        userId: original.user_id,
        actorId: req.session.userId,
        type: "reply",
        postId: replyTo,
        text: "replied to your post",
      });
    }
  }

  const row = db
    .prepare(
      "SELECT posts.*, users.name, users.handle, users.avatar, users.verified FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id = ?"
    )
    .get(info.lastInsertRowid);
  res.json({ post: enrichPostRow(row, req.session.userId) });
});

app.get("/api/posts", requireAuth, (req, res) => {
  const mode = req.query.mode || "for-you";
  if (mode === "following") {
    const posts = queryPosts(
      `WHERE posts.visibility = 'home'
         AND (posts.user_id = ? OR posts.user_id IN (
           SELECT following_id FROM follows WHERE follower_id = ?
         ))`,
      [req.session.userId, req.session.userId],
      req.session.userId
    );
    return res.json({ posts });
  } else {
    const posts = queryPosts("WHERE posts.visibility = 'home'", [], req.session.userId);
    return res.json({ posts });
  }
});

app.get("/api/posts/user/:id", requireAuth, (req, res) => {
  const userId = Number(req.params.id);
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "Not found" });
  if (!canViewUserActivity(req.session.userId, userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const posts = queryPosts(
    `WHERE (
        (posts.visibility = 'home' AND posts.user_id = ?)
        OR (posts.visibility = 'profile' AND posts.target_user_id = ?)
      )`,
    [userId, userId],
    req.session.userId
  );
  res.json({ posts });
});

app.get("/api/posts/:id/replies", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const parent = getPostAccessRow(postId);
  if (!parent) return res.json({ posts: [] });
  if (!canViewPost(req.session.userId, parent)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const posts = queryPosts("WHERE posts.reply_to = ?", [postId], req.session.userId);
  res.json({ posts });
});

app.get("/api/posts/bookmarks", requireAuth, (req, res) => {
  const posts = queryPosts(
    `WHERE posts.id IN (
       SELECT post_id FROM bookmarks WHERE user_id = ?
     )`,
    [req.session.userId],
    req.session.userId
  );
  res.json({ posts });
});

app.get("/api/posts/likes", requireAuth, (req, res) => {
  const posts = queryPosts(
    `WHERE posts.id IN (
       SELECT post_id FROM likes WHERE user_id = ?
     )`,
    [req.session.userId],
    req.session.userId
  );
  res.json({ posts });
});

app.get("/api/search", requireAuth, (req, res) => {
  const q = (req.query.q || "").toString().trim().toLowerCase();
  if (!q) return res.json({ users: [], posts: [] });
  const users = db
    .prepare(
      `SELECT users.*,
        (SELECT COUNT(*) FROM follows WHERE following_id = users.id) as followers,
        (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following,
        (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as posts
       FROM users
       WHERE lower(users.name) LIKE ? OR lower(users.handle) LIKE ?
       ORDER BY followers DESC
       LIMIT 20`
    )
    .all(`%${q}%`, `%${q}%`)
    .map(sanitizeUser);

  const posts = queryPosts(
    "WHERE lower(posts.text) LIKE ? AND posts.visibility = 'home'",
    [`%${q}%`],
    req.session.userId
  );

  res.json({ users, posts });
});

app.put("/api/posts/:id", requireAuth, (req, res) => {
  const { text } = req.body || {};
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  if (post.user_id !== req.session.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.prepare("UPDATE posts SET text = ?, updated_at = ? WHERE id = ?").run(
    text || post.text,
    now(),
    req.params.id
  );
  res.json({ ok: true });
});

app.delete("/api/posts/:id", requireAuth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  if (post.user_id !== req.session.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

function toggleAction({ table, column, postId, userId }) {
  const existing = db
    .prepare(`SELECT 1 FROM ${table} WHERE user_id = ? AND post_id = ?`)
    .get(userId, postId);
  if (existing) {
    db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND post_id = ?`).run(userId, postId);
    db.prepare(
      `UPDATE posts SET ${column} = CASE WHEN ${column} > 0 THEN ${column} - 1 ELSE 0 END WHERE id = ?`
    ).run(postId);
    return false;
  }
  db.prepare(`INSERT INTO ${table} (user_id, post_id, created_at) VALUES (?, ?, ?)`).run(
    userId,
    postId,
    now()
  );
  db.prepare(`UPDATE posts SET ${column} = ${column} + 1 WHERE id = ?`).run(postId);
  return true;
}

app.post("/api/posts/:id/like", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const visiblePost = getVisiblePost(postId, req.session.userId);
  if (visiblePost.error) {
    return res.status(visiblePost.status).json({ error: visiblePost.error });
  }
  const toggledOn = toggleAction({
    table: "likes",
    column: "likes_count",
    postId,
    userId: req.session.userId,
  });
  const post = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(postId);
  if (toggledOn && post) {
    createNotification({
      userId: post.user_id,
      actorId: req.session.userId,
      type: "like",
      postId,
      text: "liked your post",
    });
  }
  const counts = db.prepare("SELECT likes_count FROM posts WHERE id = ?").get(postId);
  res.json({ liked: toggledOn, likes: counts?.likes_count ?? 0 });
});

app.post("/api/posts/:id/bookmark", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const visiblePost = getVisiblePost(postId, req.session.userId);
  if (visiblePost.error) {
    return res.status(visiblePost.status).json({ error: visiblePost.error });
  }
  const toggledOn = toggleAction({
    table: "bookmarks",
    column: "bookmarks_count",
    postId,
    userId: req.session.userId,
  });
  const counts = db.prepare("SELECT bookmarks_count FROM posts WHERE id = ?").get(postId);
  res.json({ bookmarked: toggledOn, bookmarks: counts?.bookmarks_count ?? 0 });
});

app.post("/api/posts/:id/repost", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const visiblePost = getVisiblePost(postId, req.session.userId);
  if (visiblePost.error) {
    return res.status(visiblePost.status).json({ error: visiblePost.error });
  }
  const toggledOn = toggleAction({
    table: "reposts",
    column: "reposts_count",
    postId,
    userId: req.session.userId,
  });
  const post = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(postId);
  if (toggledOn && post) {
    createNotification({
      userId: post.user_id,
      actorId: req.session.userId,
      type: "repost",
      postId,
      text: "reposted your post",
    });
  }
  const counts = db.prepare("SELECT reposts_count FROM posts WHERE id = ?").get(postId);
  res.json({ reposted: toggledOn, reposts: counts?.reposts_count ?? 0 });
});

app.post("/api/posts/:id/view", requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const visiblePost = getVisiblePost(postId, req.session.userId);
  if (visiblePost.error) {
    return res.status(visiblePost.status).json({ error: visiblePost.error });
  }
  const existing = db
    .prepare("SELECT 1 FROM views WHERE user_id = ? AND post_id = ?")
    .get(req.session.userId, postId);
  if (!existing) {
    db.prepare("INSERT INTO views (user_id, post_id, created_at) VALUES (?, ?, ?)")
      .run(req.session.userId, postId, now());
    db.prepare("UPDATE posts SET views_count = views_count + 1 WHERE id = ?").run(postId);
  }
  const counts = db.prepare("SELECT views_count FROM posts WHERE id = ?").get(postId);
  res.json({ views: counts?.views_count ?? 0 });
});

app.get("/api/notifications", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT notifications.*, users.name, users.handle
       FROM notifications
       JOIN users ON notifications.actor_id = users.id
       WHERE notifications.user_id = ?
       ORDER BY notifications.created_at DESC
       LIMIT 100`
    )
    .all(req.session.userId);
  const items = rows.map((row) => ({
    id: row.id,
    text: `${row.name} ${row.text}`,
    time: row.created_at,
    type: row.type,
    read: Boolean(row.read),
  }));
  res.json({ notifications: items });
});

app.post("/api/notifications/:id/read", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(
    req.params.id,
    req.session.userId
  );
  res.json({ ok: true });
});

app.post("/api/notifications/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(
    req.session.userId
  );
  res.json({ ok: true });
});

app.get("/api/messages/threads", requireAuth, (req, res) => {
  const threads = listThreadsForUser(req.session.userId);
  res.json({
    threads,
    unreadCount: threads.reduce((total, thread) => total + (thread.unreadCount ?? 0), 0),
    requestsCount: threads.filter((thread) => thread.isRequest && !thread.archived).length,
  });
});

app.get("/api/messages/search", requireAuth, (req, res) => {
  const query = `${req.query.q ?? ""}`.trim().toLowerCase();
  if (!query) return res.json({ threads: [], messages: [] });

  const threads = listThreadsForUser(req.session.userId)
    .filter((thread) => {
      const haystack = [
        thread.name,
        thread.handle,
        thread.preview,
        ...thread.participants.map((participant) => participant.name),
        ...thread.participants.map((participant) => participant.handle),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 10);

  const messageRows = db
    .prepare(
      `SELECT messages.id,
              messages.thread_id,
              messages.text,
              messages.created_at,
              messages.sender_id,
              users.name,
              users.handle
       FROM messages
       JOIN message_thread_members
         ON message_thread_members.thread_id = messages.thread_id
        AND message_thread_members.user_id = ?
       JOIN users ON users.id = messages.sender_id
       LEFT JOIN message_hidden
         ON message_hidden.message_id = messages.id
        AND message_hidden.user_id = ?
       WHERE lower(messages.text) LIKE ?
         AND message_hidden.message_id IS NULL
         AND messages.unsent = 0
       ORDER BY messages.created_at DESC
       LIMIT 30`
    )
    .all(req.session.userId, req.session.userId, `%${query}%`)
    .map((row) => {
      const thread = buildThreadSummary(row.thread_id, req.session.userId);
      return {
        id: row.id,
        threadId: row.thread_id,
        text: row.text,
        time: row.created_at,
        senderId: row.sender_id,
        senderName: row.name,
        senderHandle: row.handle,
        threadName: thread?.name || "Conversation",
      };
    });

  res.json({ threads, messages: messageRows });
});

app.post("/api/messages/threads", requireAuth, (req, res) => {
  const { userId, memberIds, title } = req.body || {};
  const creatorId = req.session.userId;
  const normalizedDirectUserId = Number(userId);
  const createdAt = now();

  if (normalizedDirectUserId) {
    if (!Number.isInteger(normalizedDirectUserId) || normalizedDirectUserId === creatorId) {
      return res.status(400).json({ error: "Invalid user" });
    }
    const partner = db.prepare("SELECT id FROM users WHERE id = ?").get(normalizedDirectUserId);
    if (!partner) return res.status(404).json({ error: "User not found" });
    const acceptedForPartner =
      isFollowingUser(creatorId, normalizedDirectUserId) ||
      isFollowingUser(normalizedDirectUserId, creatorId);
    const threadId = ensureDirectMessageThread(creatorId, normalizedDirectUserId, {
      acceptedForPartner,
      createdAt,
    });
    return res.json({ thread: buildThreadSummary(threadId, creatorId) });
  }

  const normalizedMembers = Array.from(
    new Set(
      (Array.isArray(memberIds) ? memberIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && value !== creatorId)
    )
  );

  if (normalizedMembers.length === 0) {
    return res.status(400).json({ error: "Choose at least one participant" });
  }

  const validUsers = db
    .prepare(
      `SELECT id
       FROM users
       WHERE id IN (${normalizedMembers.map(() => "?").join(",")})`
    )
    .all(...normalizedMembers)
    .map((row) => row.id);

  if (validUsers.length !== normalizedMembers.length) {
    return res.status(400).json({ error: "One or more users are invalid" });
  }

  const info = db
    .prepare(
      `INSERT INTO message_threads
       (title, pair_key, is_group, created_by, created_at, updated_at, last_message_at)
       VALUES (?, '', 1, ?, ?, ?, ?)`
    )
    .run(`${title ?? ""}`.trim(), creatorId, createdAt, createdAt, createdAt);
  const threadId = Number(info.lastInsertRowid);

  ensureThreadMember(threadId, creatorId, {
    role: "owner",
    accepted: true,
    joinedAt: createdAt,
    lastReadAt: createdAt,
  });
  for (const memberId of normalizedMembers) {
    ensureThreadMember(threadId, memberId, {
      accepted: true,
      joinedAt: createdAt,
    });
  }

  res.json({ thread: buildThreadSummary(threadId, creatorId) });
});

app.get("/api/messages/threads/:threadId", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread" });
  }
  const detail = getThreadDetail(threadId, req.session.userId);
  if (!detail) return res.status(404).json({ error: "Thread not found" });
  res.json(detail);
});

app.patch("/api/messages/threads/:threadId/settings", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread" });
  }
  const member = getThreadMember(threadId, req.session.userId);
  if (!member) return res.status(404).json({ error: "Thread not found" });

  const updates = req.body || {};
  db.prepare(
    `UPDATE message_thread_members
     SET muted = COALESCE(?, muted),
         archived = COALESCE(?, archived),
         pinned = COALESCE(?, pinned),
         folder = COALESCE(?, folder)
     WHERE thread_id = ? AND user_id = ?`
  ).run(
    typeof updates.muted === "boolean" ? (updates.muted ? 1 : 0) : null,
    typeof updates.archived === "boolean" ? (updates.archived ? 1 : 0) : null,
    typeof updates.pinned === "boolean" ? (updates.pinned ? 1 : 0) : null,
    updates.folder ? normalizeMessageFolder(updates.folder) : null,
    threadId,
    req.session.userId
  );

  res.json({ thread: buildThreadSummary(threadId, req.session.userId) });
});

app.post("/api/messages/threads/:threadId/accept", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  const member = getThreadMember(threadId, req.session.userId);
  if (!member) return res.status(404).json({ error: "Thread not found" });

  db.prepare(
    `UPDATE message_thread_members
     SET accepted = 1,
         archived = 0,
         folder = 'inbox'
     WHERE thread_id = ? AND user_id = ?`
  ).run(threadId, req.session.userId);

  res.json({ thread: buildThreadSummary(threadId, req.session.userId) });
});

app.delete("/api/messages/threads/:threadId/decline", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  const member = getThreadMember(threadId, req.session.userId);
  if (!member) return res.status(404).json({ error: "Thread not found" });

  db.prepare(
    `UPDATE message_thread_members
     SET archived = 1,
         accepted = 0
     WHERE thread_id = ? AND user_id = ?`
  ).run(threadId, req.session.userId);

  res.json({ ok: true });
});

app.post("/api/messages/threads/:threadId/typing", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  const member = getThreadMember(threadId, req.session.userId);
  if (!member) return res.status(404).json({ error: "Thread not found" });

  if (req.body?.isTyping) {
    db.prepare(
      `INSERT INTO message_typing (thread_id, user_id, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(thread_id, user_id)
       DO UPDATE SET updated_at = excluded.updated_at`
    ).run(threadId, req.session.userId, now());
  } else {
    db.prepare("DELETE FROM message_typing WHERE thread_id = ? AND user_id = ?").run(
      threadId,
      req.session.userId
    );
  }

  res.json({ ok: true });
});

app.post("/api/messages/threads/:threadId/messages", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  const thread = getThreadRow(threadId);
  const member = getThreadMember(threadId, req.session.userId);
  if (!thread || !member) return res.status(404).json({ error: "Thread not found" });

  const text = `${req.body?.text ?? ""}`.trim();
  const attachments = normalizeMessageAttachments(req.body?.attachments);
  if (!text && attachments.length === 0) {
    return res.status(400).json({ error: "Missing message content" });
  }

  if (!member.accepted) {
    db.prepare(
      `UPDATE message_thread_members
       SET accepted = 1,
           archived = 0,
           folder = 'inbox'
       WHERE thread_id = ?`
    ).run(threadId);
  }

  const participants = getThreadParticipantRows(threadId);
  const partnerId = thread.is_group
    ? 0
    : participants.find((participant) => participant.id !== req.session.userId)?.id ?? 0;
  const createdAt = now();

  db.prepare(
    `INSERT INTO messages
     (thread_id, sender_id, receiver_id, text, attachments_json, created_at, delivered_at, read, read_at, unsent, unsent_at, pinned)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, '', 0, '', 0)`
  ).run(
    threadId,
    req.session.userId,
    partnerId,
    text,
    JSON.stringify(attachments),
    createdAt,
    createdAt
  );

  db.prepare("DELETE FROM message_typing WHERE thread_id = ? AND user_id = ?").run(
    threadId,
    req.session.userId
  );
  touchMessageThread(threadId, createdAt);

  const threadSummary = buildThreadSummary(threadId, req.session.userId);
  for (const participant of participants) {
    if (participant.id === req.session.userId || participant.muted) continue;
    createNotification({
      userId: participant.id,
      actorId: req.session.userId,
      type: "message",
      text: thread.is_group
        ? `sent a message in ${threadSummary?.name || "your group"}`
        : "sent you a message",
    });
  }

  res.json(getThreadDetail(threadId, req.session.userId));
});

app.patch("/api/messages/messages/:messageId", requireAuth, (req, res) => {
  const messageId = Number(req.params.messageId);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ error: "Invalid message" });
  }
  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(messageId);
  if (!message) return res.status(404).json({ error: "Message not found" });
  const member = getThreadMember(message.thread_id, req.session.userId);
  if (!member) return res.status(403).json({ error: "Forbidden" });

  const action = `${req.body?.action ?? ""}`.trim().toLowerCase();
  if (action === "unsend") {
    if (message.sender_id !== req.session.userId) {
      return res.status(403).json({ error: "Only the sender can unsend" });
    }
    db.prepare(
      `UPDATE messages
       SET text = '',
           attachments_json = '[]',
           unsent = 1,
           unsent_at = ?,
           pinned = 0
       WHERE id = ?`
    ).run(now(), messageId);
  } else if (action === "delete_self") {
    db.prepare(
      `INSERT OR IGNORE INTO message_hidden (message_id, user_id, hidden_at)
       VALUES (?, ?, ?)`
    ).run(messageId, req.session.userId, now());
  } else if (action === "pin" || action === "unpin") {
    db.prepare("UPDATE messages SET pinned = ? WHERE id = ?").run(action === "pin" ? 1 : 0, messageId);
  } else {
    return res.status(400).json({ error: "Unsupported action" });
  }

  res.json(getThreadDetail(message.thread_id, req.session.userId));
});

app.get("/api/messages/calls/poll", requireAuth, (req, res) => {
  const afterId = Math.max(0, Number(req.query.afterId) || 0);
  const events = listCallEventsForUser(req.session.userId, afterId);
  res.json({
    call: getCurrentCallForUser(req.session.userId),
    events,
    lastEventId: events.at(-1)?.id ?? afterId,
  });
});

app.get("/api/messages/calls/config", requireAuth, (req, res) => {
  res.json({
    rtcConfiguration: CALL_RTC_CONFIGURATION,
    relayEnabled: CALL_RTC_CONFIGURATION.iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) => `${url ?? ""}`.trim().toLowerCase().startsWith("turn"));
    }),
  });
});

app.post("/api/messages/threads/:threadId/calls/start", requireAuth, (req, res) => {
  const threadId = Number(req.params.threadId);
  if (!Number.isInteger(threadId) || threadId <= 0) {
    return res.status(400).json({ error: "Invalid thread" });
  }

  const directCall = getDirectCallPartner(threadId, req.session.userId);
  if (!directCall) {
    return res.status(400).json({ error: "Calls are available in direct chats only" });
  }

  const busyCall = getBusyCallForUsers([req.session.userId, directCall.partner.id]);
  if (busyCall) {
    const sameParticipants =
      [busyCall.initiator_id, busyCall.recipient_id].includes(req.session.userId) &&
      [busyCall.initiator_id, busyCall.recipient_id].includes(directCall.partner.id);
    if (busyCall.thread_id === threadId && sameParticipants) {
      return res.json({ call: buildCallSummary(busyCall, req.session.userId) });
    }
    return res.status(409).json({ error: "One of you is already on another call" });
  }

  const createdAt = now();
  const mode = normalizeCallMode(req.body?.mode);
  const info = db
    .prepare(
      `INSERT INTO message_calls
       (thread_id, initiator_id, recipient_id, mode, status, created_at, updated_at, answered_at, ended_at, ended_by)
       VALUES (?, ?, ?, ?, 'ringing', ?, ?, '', '', 0)`
    )
    .run(threadId, req.session.userId, directCall.partner.id, mode, createdAt, createdAt);

  const callId = Number(info.lastInsertRowid);
  createNotification({
    userId: directCall.partner.id,
    actorId: req.session.userId,
    type: "message",
    text: `started a ${mode === "video" ? "video" : "voice"} call with you`,
  });

  res.json({ call: buildCallSummary(callId, req.session.userId) });
});

app.post("/api/messages/calls/:callId/accept", requireAuth, (req, res) => {
  const callId = Number(req.params.callId);
  if (!Number.isInteger(callId) || callId <= 0) {
    return res.status(400).json({ error: "Invalid call" });
  }

  const call = getCallRow(callId);
  if (!call) return res.status(404).json({ error: "Call not found" });
  if (![call.initiator_id, call.recipient_id].includes(req.session.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (call.recipient_id !== req.session.userId && call.status === "ringing") {
    return res.status(403).json({ error: "Only the recipient can answer" });
  }

  if (isLiveCallStatus(call.status) && call.status !== "active") {
    const answeredAt = now();
    updateCallStatus(call.id, "active", { answeredAt });
    createCallEvent(getCallRow(call.id), req.session.userId, "accepted", {});
  }

  res.json({ call: buildCallSummary(call.id, req.session.userId) });
});

app.post("/api/messages/calls/:callId/decline", requireAuth, (req, res) => {
  const callId = Number(req.params.callId);
  if (!Number.isInteger(callId) || callId <= 0) {
    return res.status(400).json({ error: "Invalid call" });
  }

  const call = getCallRow(callId);
  if (!call) return res.status(404).json({ error: "Call not found" });
  if (![call.initiator_id, call.recipient_id].includes(req.session.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (isVisibleCallStatus(call.status) && !isLiveCallStatus(call.status)) {
    return res.json({ call: buildCallSummary(call.id, req.session.userId) });
  }

  const endedAt = now();
  updateCallStatus(call.id, "declined", {
    endedAt,
    endedBy: req.session.userId,
  });
  createCallEvent(getCallRow(call.id), req.session.userId, "decline", {});

  res.json({ call: buildCallSummary(call.id, req.session.userId) });
});

app.post("/api/messages/calls/:callId/end", requireAuth, (req, res) => {
  const callId = Number(req.params.callId);
  if (!Number.isInteger(callId) || callId <= 0) {
    return res.status(400).json({ error: "Invalid call" });
  }

  const call = getCallRow(callId);
  if (!call) return res.status(404).json({ error: "Call not found" });
  if (![call.initiator_id, call.recipient_id].includes(req.session.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!isLiveCallStatus(call.status)) {
    return res.json({ call: buildCallSummary(call.id, req.session.userId) });
  }

  const endedAt = now();
  const nextStatus = call.status === "ringing" ? "canceled" : "ended";
  const eventType = call.status === "ringing" ? "cancel" : "end";
  updateCallStatus(call.id, nextStatus, {
    endedAt,
    endedBy: req.session.userId,
  });
  createCallEvent(getCallRow(call.id), req.session.userId, eventType, {});

  res.json({ call: buildCallSummary(call.id, req.session.userId) });
});

app.post("/api/messages/calls/:callId/signal", requireAuth, (req, res) => {
  const callId = Number(req.params.callId);
  if (!Number.isInteger(callId) || callId <= 0) {
    return res.status(400).json({ error: "Invalid call" });
  }

  const call = getCallRow(callId);
  if (!call) return res.status(404).json({ error: "Call not found" });
  if (![call.initiator_id, call.recipient_id].includes(req.session.userId)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (!isLiveCallStatus(call.status)) {
    return res.status(409).json({ error: "Call is no longer live" });
  }

  const type = `${req.body?.type ?? ""}`.trim().toLowerCase();
  if (!["offer", "answer", "ice"].includes(type)) {
    return res.status(400).json({ error: "Unsupported signal type" });
  }

  if (type === "answer" && call.status === "ringing") {
    updateCallStatus(call.id, "active", { answeredAt: now() });
  }

  const eventId = createCallEvent(getCallRow(call.id), req.session.userId, type, req.body?.payload ?? {});
  res.json({
    ok: true,
    eventId,
    call: buildCallSummary(call.id, req.session.userId),
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`SQLite DB at ${dbPath}`);
});

app.get("*", (req, res) => {
  if (hasClientBuild) {
    res.sendFile(path.join(clientDist, "index.html"));
  } else {
    res
      .status(503)
      .send(
        "Frontend build not found. Run `npm run build` in the project root."
      );
  }
});

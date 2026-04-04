const Database = require('better-sqlite3');
const config = require('./config');

let db;

function getDb() {
  if (!db) {
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    init();
  }
  return db;
}

function init() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT UNIQUE,
      video_title TEXT,
      video_url TEXT,
      transcript TEXT,
      status TEXT DEFAULT 'pending',
      -- status: pending | approved | rejected | published
      article_html TEXT,
      blog_card_html TEXT,
      sitemap_entry TEXT,
      slug TEXT,
      title TEXT,
      category TEXT,
      meta_description TEXT,
      read_time TEXT,
      regenerate_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      published_at TEXT,
      commit_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS processed_videos (
      video_id TEXT PRIMARY KEY,
      processed_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── Queue operations ──────────────────────────────────────────────

function insertArticle(data) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO articles
      (video_id, video_title, video_url, transcript, article_html, blog_card_html,
       sitemap_entry, slug, title, category, meta_description, read_time, status, updated_at)
    VALUES
      (@video_id, @video_title, @video_url, @transcript, @article_html, @blog_card_html,
       @sitemap_entry, @slug, @title, @category, @meta_description, @read_time, 'pending', datetime('now'))
  `);
  return stmt.run(data);
}

function getPending() {
  return getDb().prepare(`SELECT * FROM articles WHERE status = 'pending' ORDER BY created_at DESC`).all();
}

function getAll() {
  return getDb().prepare(`SELECT * FROM articles ORDER BY created_at DESC`).all();
}

function getById(id) {
  return getDb().prepare(`SELECT * FROM articles WHERE id = ?`).get(id);
}

function updateStatus(id, status) {
  getDb().prepare(`UPDATE articles SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
}

function updateArticle(id, fields) {
  const allowed = ['article_html', 'blog_card_html', 'title', 'slug', 'category', 'meta_description', 'read_time', 'regenerate_note'];
  const sets = allowed.filter(k => fields[k] !== undefined).map(k => `${k} = @${k}`);
  if (!sets.length) return;
  sets.push(`updated_at = datetime('now')`);
  const stmt = getDb().prepare(`UPDATE articles SET ${sets.join(', ')} WHERE id = @id`);
  stmt.run({ ...fields, id });
}

function markPublished(id, commitHash) {
  getDb().prepare(`
    UPDATE articles SET status = 'published', published_at = datetime('now'), commit_hash = ?, updated_at = datetime('now') WHERE id = ?
  `).run(commitHash, id);
}

function isVideoProcessed(videoId) {
  return !!getDb().prepare(`SELECT 1 FROM processed_videos WHERE video_id = ?`).get(videoId);
}

function markVideoProcessed(videoId) {
  getDb().prepare(`INSERT OR IGNORE INTO processed_videos (video_id) VALUES (?)`).run(videoId);
}

function getPublished() {
  return getDb().prepare(`SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC`).all();
}

module.exports = {
  getById, getPending, getAll, getPublished,
  insertArticle, updateStatus, updateArticle, markPublished,
  isVideoProcessed, markVideoProcessed,
};

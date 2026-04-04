require('dotenv').config({ path: '../config/.env' });
const express = require('express');
const path = require('path');
const config = require('../config');
const db = require('../db');
const { fetchNewVideos, fetchSingleVideo } = require('../pipeline/fetch');
const { generateArticle } = require('../pipeline/generate');
const { publishArticle } = require('../pipeline/publish');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Queue ──────────────────────────────────────────────────────────

app.get('/api/queue', (req, res) => {
  res.json(db.getPending());
});

app.get('/api/articles', (req, res) => {
  res.json(db.getAll());
});

app.get('/api/article/:id', (req, res) => {
  const article = db.getById(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json(article);
});

// ── Actions ────────────────────────────────────────────────────────

// Approve article (mark ready for publish)
app.post('/api/article/:id/approve', (req, res) => {
  try {
    db.updateStatus(req.params.id, 'approved');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject article
app.post('/api/article/:id/reject', (req, res) => {
  try {
    db.updateStatus(req.params.id, 'rejected');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save edits to article HTML
app.post('/api/article/:id/edit', (req, res) => {
  try {
    const { article_html, blog_card_html, title, slug, category, meta_description, read_time } = req.body;
    db.updateArticle(req.params.id, { article_html, blog_card_html, title, slug, category, meta_description, read_time });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate with note
app.post('/api/article/:id/regenerate', async (req, res) => {
  try {
    const { note } = req.body;
    const article = db.getById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Not found' });

    const generated = await generateArticle({
      transcript: article.transcript,
      videoTitle: article.video_title,
      regenerateNote: note,
    });

    db.updateArticle(article.id, {
      article_html: generated.article_html,
      blog_card_html: generated.blog_card_html,
      slug: generated.slug,
      title: generated.title,
      category: generated.category,
      meta_description: generated.meta_description,
      read_time: generated.read_time,
      regenerate_note: note,
    });
    db.updateStatus(article.id, 'pending');

    res.json({ ok: true, title: generated.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish approved article to GitHub
app.post('/api/article/:id/publish', async (req, res) => {
  try {
    const commitHash = await publishArticle(req.params.id);
    res.json({ ok: true, commitHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manual URL import ──────────────────────────────────────────────

app.post('/api/import/url', async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

    const video = await fetchSingleVideo(videoUrl);
    const generated = await generateArticle({
      transcript: video.transcript,
      videoTitle: video.video_title,
    });

    db.insertArticle({
      video_id: video.video_id,
      video_title: video.video_title,
      video_url: video.video_url,
      transcript: video.transcript,
      article_html: generated.article_html,
      blog_card_html: generated.blog_card_html,
      sitemap_entry: generated.sitemap_entry,
      slug: generated.slug,
      title: generated.title,
      category: generated.category,
      meta_description: generated.meta_description,
      read_time: generated.read_time,
    });

    db.markVideoProcessed(video.video_id);
    res.json({ ok: true, title: generated.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually trigger playlist check
app.post('/api/run-pipeline', async (req, res) => {
  try {
    const { runPipeline } = require('../cron');
    // Don't await — let it run in background
    runPipeline().catch(err => console.error('Pipeline error:', err));
    res.json({ ok: true, message: 'Pipeline started — check server logs' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log(`\n✅ Dashboard running at http://localhost:${config.port}`);
  console.log(`   Press Ctrl+C to stop.\n`);
});

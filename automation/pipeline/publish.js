const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const config = require('../config');
const db = require('../db');

const REPO = config.repoPath;
const BLOG_HTML = path.join(REPO, 'blog.html');
const SITEMAP = path.join(REPO, 'sitemap.xml');

const CORRECT_NAV = `<nav>
  <a href="index.html" class="nav-logo">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="#1B4FBF" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#1B4FBF"/>
    </svg>
  </a>
  <ul class="nav-links">
    <li><a href="blog.html" class="active">Blog</a></li>
    <li><a href="index.html#inside">What's Inside</a></li>
    <li><a href="index.html#pricing">Pricing</a></li>
    <li>
      <a href="https://buy.stripe.com/5kQ9AT3ODbyLdht65r3ZK00" class="nav-cta">Get the Guide →</a>
    </li>
  </ul>
</nav>`;

const CORRECT_NAV_CSS = `    nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 200;
      padding: 0 40px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,255,255,0.88);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      border-bottom: 1px solid rgba(0,0,0,0.08);
    }
    .nav-logo {
      display: flex;
      align-items: center;
      text-decoration: none;
      line-height: 1;
    }
    .nav-links {
      display: flex; align-items: center; gap: 32px; list-style: none;
    }
    .nav-links a {
      font-size: 13px; color: var(--gray);
      text-decoration: none; transition: color 0.15s;
    }
    .nav-links a:hover { color: var(--ink); }
    .nav-links a.active { color: var(--ink); font-weight: 500; }
    .nav-cta {
      background: var(--navy) !important; color: white !important;
      padding: 8px 18px; border-radius: 980px;
      font-weight: 500 !important; font-size: 13px !important;
    }
    .nav-cta:hover { background: var(--navy-dk) !important; }`;

function fixNav(html) {
  // Replace whatever nav element Claude generated with the correct one
  html = html.replace(/<nav[\s\S]*?<\/nav>/, CORRECT_NAV);

  // Replace nav CSS block — handles various formats Claude might generate
  html = html.replace(/nav\s*\{[\s\S]*?\.nav-cta:hover\s*\{[^}]*\}/m, CORRECT_NAV_CSS);

  return html;
}

async function publishArticle(articleId) {
  const article = db.getById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);
  if (article.status !== 'approved') throw new Error(`Article ${articleId} is not approved`);

  const articlePath = path.join(REPO, `${article.slug}.html`);
  console.log(`\n📦 Publishing: ${article.title}`);

  // Fix nav before writing to disk
  const fixedHtml = fixNav(article.article_html);
  fs.writeFileSync(articlePath, fixedHtml, 'utf8');
  console.log(`   ✅ Written: ${article.slug}.html (nav fixed)`);

  injectBlogCard(article);
  console.log(`   ✅ Blog card injected into blog.html`);

  updateSitemap(article);
  console.log(`   ✅ Sitemap updated`);

  const commitHash = gitPush(article);
  console.log(`   ✅ Pushed to GitHub: ${commitHash}`);

  db.markPublished(articleId, commitHash);
  console.log(`   ✅ Marked published in queue`);

  return commitHash;
}

function injectBlogCard(article) {
  let html = fs.readFileSync(BLOG_HTML, 'utf8');

  // Duplicate check — if slug already exists in blog.html, skip injection
  if (html.includes(`href="${article.slug}.html"`)) {
    console.log(`   ⚠️  Blog card already exists for ${article.slug} — skipping injection`);
    return;
  }

  const gridMarker = '<!-- ── RECENTLY PUBLISHED ── -->';
  const idx = html.indexOf(gridMarker);
  if (idx === -1) throw new Error('Could not find RECENTLY PUBLISHED marker in blog.html');

  // Inject after the grid-label divider block (two closing </div> tags after the marker)
  const dividerEnd = html.indexOf('</div>', idx);
  const dividerEnd2 = html.indexOf('</div>', dividerEnd + 1);
  const insertAt = dividerEnd2 + 6;

  const card = `\n\n      ${article.blog_card_html}\n`;
  html = html.slice(0, insertAt) + card + html.slice(insertAt);

  fs.writeFileSync(BLOG_HTML, html, 'utf8');
}

function updateSitemap(article) {
  const today = new Date().toISOString().split('T')[0];

  // Duplicate check — if slug already in sitemap, skip
  if (fs.existsSync(SITEMAP)) {
    const existing = fs.readFileSync(SITEMAP, 'utf8');
    if (existing.includes(`/${article.slug}.html`)) {
      console.log(`   ⚠️  Sitemap entry already exists for ${article.slug} — skipping`);
      return;
    }
  }

  if (!fs.existsSync(SITEMAP)) {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.siteUrl}/index.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${config.siteUrl}/blog.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ${article.sitemap_entry}
</urlset>`;
    fs.writeFileSync(SITEMAP, sitemap, 'utf8');
  } else {
    let xml = fs.readFileSync(SITEMAP, 'utf8');
    const closeTag = '</urlset>';
    const idx = xml.lastIndexOf(closeTag);
    if (idx === -1) throw new Error('Invalid sitemap: missing </urlset>');
    xml = xml.slice(0, idx) + `  ${article.sitemap_entry}\n` + closeTag;
    fs.writeFileSync(SITEMAP, xml, 'utf8');
  }
}

function gitPush(article) {
  const cwd = REPO;
  const opts = { cwd, encoding: 'utf8' };

  try {
    execSync('git add -A', opts);
    execSync(`git commit -m "feat: add article ${article.slug}"`, opts);
    execSync('git push origin main', opts);
    const hash = execSync('git rev-parse --short HEAD', opts).trim();
    return hash;
  } catch (err) {
    throw new Error(`Git operation failed: ${err.message}`);
  }
}

module.exports = { publishArticle };

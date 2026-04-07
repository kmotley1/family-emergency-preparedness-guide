# Emergency Preparedness Checklist — Strategy & Documentation
**emergencypreparednesschecklist.com**
*Last updated: April 2026*

---

## 1. What We've Built

### The Product
A $25 Family Emergency Preparedness Guide sold at emergencypreparednesschecklist.com. Anonymous brand — no personal identity attached to the site or social accounts. Seven chapters covering: Emergency Plan, Cash Reserve, Go-Bag, Home Safety & Self-Defense, Self-Sufficiency Skills, Community Network, Mental & Emotional Preparedness. Delivered in five formats: PDF, DOCX, CSV (Notion-ready), Obsidian vault, XLSX.

### The Site
A static HTML/CSS website hosted on Cloudflare Pages, connected to a GitHub repository (`kmotley1/family-emergency-preparedness-guide`). No framework, no CMS, no build step. Every page is a hand-coded HTML file deployed automatically when changes are pushed to the `main` branch on GitHub.

Pages live:
- `index.html` — Homepage / sales page
- `blog.html` — Blog index with filterable article cards
- Individual article `.html` files (one per article)

**Positioning:** The site is organized around the question "How should we prepare for what's coming?" The blog explains structural risks (economic, political, supply chain). The guide is the action layer — what households actually do about it.

### The Blog
Articles are written to a strict spec (`blog_article_generation_spec.md`) that governs voice, structure, SEO requirements, HTML template, and the five-step reasoning sequence every article must follow:

1. Separate signal from facts (transcript tells you what people feel, not what's true)
2. Find the system underneath the symptom (explain how things actually work)
3. Validate before informing (name the concern before offering solutions)
4. Form a position (take a stance, don't hedge)
5. Map the CTA to the correct guide chapter (one specific chapter per article scenario)

**CTA matching table:**
| Article scenario | Guide chapter |
|---|---|
| Shelter-in-place / long disruption | Ch. 1 — Emergency Plan |
| Financial disruption / economic instability | Ch. 2 — Cash Reserve |
| Evacuation / rapid departure | Ch. 3 — Go-Bag |
| Home security / civil unrest | Ch. 4 — Home Safety & Self-Defense |
| Self-reliance / skills / food production | Ch. 5 — Self-Sufficiency Skills |
| Community / mutual aid | Ch. 6 — Community Network |
| Anxiety / fear / mental load | Ch. 7 — Mental & Emotional Preparedness |

### The Content Automation Pipeline
A Node.js/Express local dashboard running at `localhost:3000` that automates the full content workflow:

```
YouTube playlist (saved videos)
        ↓
Fetch transcript (youtube-captions-scraper)
        ↓
Generate article (Claude API + spec prompt)
        ↓
SQLite queue (stores pending articles locally)
        ↓
Dashboard review (localhost:3000)
        ↓
Approve → write files + inject blog card + update sitemap + git push
        ↓
Cloudflare auto-deploys (~60 seconds)
```

Articles published to date: 4 live articles on the site.

---

## 2. Current Tech Stack

### Hosting & Deployment
| Layer | Tool | Details |
|---|---|---|
| Domain | GoDaddy | emergencypreparednesschecklist.com |
| DNS | Cloudflare | Nameservers point to Cloudflare |
| Hosting | Cloudflare Pages | Auto-deploys on GitHub push to `main` |
| Repository | GitHub | `kmotley1/family-emergency-preparedness-guide` |
| Local clone | Mac | `/Users/kellymotley/Sites/family-emergency-preparedness-guide` |

### Commerce
| Layer | Tool | Details |
|---|---|---|
| Payments | Stripe | `buy.stripe.com/5kQ9AT3ODbyLdht65r3ZK00` |
| Email | ConvertKit | Opt-in funnel, free checklist lead magnet |

### Content Pipeline
| Layer | Tool | Details |
|---|---|---|
| Runtime | Node.js v20.18.3 | CommonJS (not ESM) |
| Web server | Express | `dashboard/server.js` on port 3000 |
| Database | SQLite (better-sqlite3) | `queue.db` in automation root |
| AI generation | Anthropic SDK | `claude-sonnet-4-5`, 16,000 max tokens |
| Transcript fetching | youtube-captions-scraper | More reliable than youtube-transcript |
| YouTube auth | Google OAuth 2.0 | Private playlist access via googleapis |
| Publishing | Node.js execSync | `git add -A → git commit → git push origin main` |

### Automation folder structure
```
automation/
  auth.js              ← OAuth setup (run once)
  cron.js              ← Daily playlist watcher (node cron.js)
  config.js            ← All settings, loads .env
  db.js                ← SQLite queue operations
  pipeline/
    fetch.js           ← YouTube transcript fetcher
    generate.js        ← Claude API + article spec (system prompt)
    publish.js         ← File writes + git push
  dashboard/
    server.js          ← Express API routes
    public/
      index.html       ← Queue view UI
      preview.html     ← Article preview + edit UI
  config/
    client_secret.json ← Google credentials (gitignored)
    token.json         ← OAuth token (gitignored, auto-generated)
    .env               ← API keys (gitignored)
  package.json
  .gitignore
```

### Design System
All pages share the same CSS variable system:

```css
--white: #FFFFFF
--bg: #F5F5F7
--ink: #1D1D1F
--gray: #6E6E73
--gray-lt: #E8E8ED
--navy: #1B4FBF
--navy-dk: #153D96
--navy-lt: #EEF2FB
--green: #2A7A4B
--green-lt: #EAF5EE
--amber: #B45309
--amber-lt: #FEF3C7
--divider: #D2D2D7
```

Fonts: Inter (body) + JetBrains Mono (labels, badges, numbers, monospace elements)

---

## 3. Coding Approach

*This section is written for developers who may need to understand, extend, or debug the system.*

### Philosophy
The codebase is written in vanilla Node.js CommonJS (not ESM/TypeScript). Every dependency choice was made to maintain CommonJS compatibility — this is a hard constraint because `execSync` (used for git operations) and most SQLite libraries work cleanly in CommonJS, and mixing ESM/CommonJS creates brittle dependency chains.

**Key decisions:**
- `open@8` not `open@9+` — v9 is ESM-only, incompatible with CommonJS
- `youtube-captions-scraper` not `youtube-transcript` — the transcript package switched to ESM, captions-scraper stays CommonJS
- `better-sqlite3` not `sqlite3` — synchronous API, no callback hell, faster
- No ORM — raw SQL via prepared statements for simplicity

### Authentication Flow
Google OAuth 2.0 for private YouTube playlist access. One-time setup:
1. `node auth.js` opens browser
2. User clicks Allow on Google consent screen
3. Auth code redirected to `localhost:4242`
4. Token saved to `config/token.json`
5. Token auto-refreshes via googleapis library on expiry

The auth server listens for requests on port 4242 and ignores any request that doesn't contain a `code=` parameter (this prevents favicon requests from triggering the failure path).

### Article Generation
The Claude API call in `pipeline/generate.js` uses a single large system prompt that encodes:
- The full article spec (voice rules, HTML template, CSS variables, required elements)
- The five-step reasoning sequence
- The CTA matching table
- Exact nav HTML to use (prevents drift)
- Exact CSS blocks for nav-cta, checklist, mid-cta (prevents styling bugs)
- Blog card format with `data-category` attribute and New badge
- Output format: JSON with seven required fields

The model is `claude-sonnet-4-5` at 16,000 max tokens. This is necessary because the HTML output for a full article runs approximately 8,000-10,000 tokens when JSON-escaped.

The JSON response is stripped of any accidental markdown fences before parsing. If parsing fails, the error includes the first 500 characters of the raw response for debugging.

### Publish Flow
`pipeline/publish.js` executes in this exact order:
1. Write article HTML to repo root (`{slug}.html`)
2. Inject blog card into `blog.html` — finds `<!-- ── RECENTLY PUBLISHED ── -->` comment, navigates past the grid-label divider block (two `</div>` tags), injects card there
3. Create or update `sitemap.xml` — creates from scratch on first article, appends `<url>` block before `</urlset>` on subsequent articles
4. `git add -A` — stages all changes
5. `git commit -m "feat: add article {slug}"` — commit message uses slug not title to avoid shell quoting issues with special characters in titles
6. `git push origin main` — triggers Cloudflare auto-deploy
7. Returns commit hash, stored in SQLite for dashboard display

**No `git pull --rebase` before commit.** Earlier versions did this and caused failures when the repo had unstaged changes. The current approach stages everything first, then commits, eliminating the conflict.

### Dashboard
Two-page Express app:
- `GET /` — Queue view: lists articles by status (pending/approved/published/rejected), URL import bar, Check Playlist button
- `GET /preview.html?id={n}` — Full article preview in iframe, blog card editor, action buttons

Key API routes:
- `POST /api/import/url` — Accepts YouTube URL, fetches transcript, generates article, adds to queue
- `POST /api/article/:id/approve` — Marks approved
- `POST /api/article/:id/publish` — Triggers publish flow (must be approved first)
- `POST /api/article/:id/regenerate` — Re-runs generation with editor note appended to prompt
- `POST /api/run-pipeline` — Triggers playlist check in background (non-blocking)

### Duplicate Prevention
A `processed_videos` table in SQLite tracks every video ID that has been fetched. The playlist check filters these out before attempting transcript fetch. This prevents re-processing videos on subsequent cron runs.

The blog card injection does not yet have duplicate detection — if publish is triggered multiple times for the same article (e.g., after repeated failures), the card will be injected multiple times. Manual cleanup required. **This is a known gap to address.**

---

## 4. Next Steps Already Identified

From the content strategy session:

1. **FAQ schema (JSON-LD)** — Add structured FAQ markup to every article. Highest leverage for AI crawler citations (Perplexity, ChatGPT, Google AI Overview). Build into the generation spec and pipeline.

2. **Topical cluster architecture** — Plan hub + spoke article structure before publishing at volume. Each core theme gets a hub article and 8-10 supporting articles with internal links. Prevents 90 standalone articles with no interlinking.

3. **Trending signal layer** — Add a daily step that pulls Google Trends RSS, Reddit hot posts, and Google News RSS filtered by topic clusters. Pipeline scores signals and selects the 3 strongest for article generation. Current flow (saved video → article) becomes one input among several.

4. **Publish time distribution** — Cron should fire at 7am, 12pm, 5pm rather than all at once. Signals active editorial operation to Google.

5. **"What This Means for Your Household" H2** — Make this a mandatory section in the article spec. AI crawlers specifically pull this section when answering follow-up questions.

6. **Google Search Console + sitemap submission** — Sitemap is generating. Needs to be submitted at console.search.google.com. Blocking indexing on every new article until done.

7. **Duplicate card prevention in publish.js** — Check for existing slug in `blog.html` before injecting card. If found, skip injection.

---

## 5. How Claude Skills Fits In

### What Claude Skills Is
A Claude Skill is a folder containing a `SKILL.md` file with YAML frontmatter and Markdown instructions. Skills teach Claude how to handle specific repeatable tasks without re-explaining context every session. They load progressively — frontmatter always loads, full instructions load when relevant.

Skills work across Claude.ai, Claude Code, and the API. They are an open standard, portable across AI platforms.

### Where Skills Apply to This Project

**Skill 1: Article Generation Spec (highest priority)**

The system prompt in `pipeline/generate.js` is already structured like a skill — it encodes the full editorial spec, voice rules, HTML template, CSS blocks, reasoning sequence, and CTA matching table. The problem is it lives inside application code, making it hard to update, version, or reuse.

Extracting this into a proper `SKILL.md` file means:
- The spec becomes updateable without touching application code
- The same spec works in Claude.ai conversations (manual article generation) and the pipeline (automated generation) without duplication
- Version control on the spec itself — you can see when and how it changed
- Claude Code sessions automatically have access to it

Proposed skill structure:
```
automation/skills/
  article-generation/
    SKILL.md          ← Full spec as skill instructions
    references/
      cta-matching.md ← CTA chapter matching table
      html-template.md ← Exact HTML/CSS blocks
      voice-rules.md  ← Forbidden phrases and required constructions
```

**Skill 2: Content Pipeline Operator**

A skill that teaches Claude how to operate the dashboard — what each API route does, how to diagnose common errors (git lock files, duplicate cards, JSON parse failures), and what the correct fix is for each. Useful for Claude Code sessions where you're debugging the pipeline.

**Skill 3: Site Maintenance**

Teaches Claude the site's file structure, CSS variable system, nav HTML, and injection points in `blog.html`. Any session where Claude is editing site files would load this automatically, preventing the nav drift and CSS inconsistency issues that required multiple fix scripts.

### Implementation Approach

**Phase 1 (now):** Extract the article generation system prompt from `generate.js` into `automation/skills/article-generation/SKILL.md`. Update `generate.js` to load the skill file at runtime rather than hardcoding the prompt. This is a one-time refactor that pays ongoing dividends.

**Phase 2 (when Claude Code is in active use):** Add site maintenance and pipeline operator skills. Upload to Claude.ai settings so they load automatically in this project.

**Phase 3 (when pipeline is proven at scale):** Package the full pipeline as a distributable skill + documentation set. This is the foundation of the second product identified from the "shovels in a gold rush" insight — other content operators can buy or license the system.

### Skill File Format (for the article generation skill)

```yaml
---
name: article-generation
description: Generates complete blog articles for emergencypreparednesschecklist.com from YouTube transcripts or other source material. Use when processing a transcript, generating an article, or asked to write content for the emergency prep site.
metadata:
  author: Kelly Motley
  version: 1.0.0
  site: emergencypreparednesschecklist.com
---

# Article Generation — Emergency Preparedness Checklist

[Full spec content follows...]
```

---

## 6. What This Project Is Building Toward

**Product 1 (current):** The $25 Family Emergency Preparedness Guide. Revenue from guide sales, scaled by SEO/AI crawler traffic from the blog.

**Product 2 (emerging):** The content automation pipeline itself. A system that takes social media saves, generates SEO-optimized articles via Claude, and publishes them to a live site with one-click approval. The emergency prep site is the proof it works.

**The skill connection:** Packaging the pipeline as a distributable Claude Skill is the bridge between product 1 and product 2. It turns an internal tool into something that can be sold, licensed, or taught — to other niche content operators who want the same system for their vertical.

---

## 7. Open Items / Known Gaps

| Item | Priority | Status |
|---|---|---|
| Google Search Console setup + sitemap submission | High | Not done |
| Duplicate blog card prevention in publish.js | High | Not done |
| FAQ JSON-LD schema in article generation | High | Not done |
| Topical cluster planning | High | Not done |
| Article generation spec → Claude Skill extraction | Medium | Not done |
| Trending signal layer (Google Trends / Reddit RSS) | Medium | Not done |
| Publish time distribution (7am / 12pm / 5pm) | Low | Not done |
| Nav fix on energy + petrodollar articles (wrong nav structure) | Medium | Partial — regeneration needed |
| Two articles missing from local repo (energy, petrodollar) | Low | Need to push from outputs |
| `fix-gridmarker.js` and other temp scripts in pipeline folder | Low | Cleanup needed |


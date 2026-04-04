# Emergency Prep — Content Automation

Watches your YouTube playlist for new saves, generates blog articles via Claude API, and gives you a local dashboard to review, edit, and publish directly to GitHub.

---

## Setup (one time)

### 1. Move the automation folder

Copy this `/automation` folder into your repo:
```
/Users/kellymotley/Sites/family-emergency-preparedness-guide/automation/
```

### 2. Move your credentials file

Move your downloaded `client_secret_*.json` file to:
```
automation/config/client_secret.json
```

### 3. Create your .env file

```bash
cp config/.env.example config/.env
```

Edit `config/.env` and fill in:
- `ANTHROPIC_API_KEY` — your Anthropic API key (console.anthropic.com)
- `YOUTUBE_PLAYLIST_ID` — the playlist ID from your YouTube saved playlist URL

### 4. Install dependencies

```bash
cd automation
npm install
```

### 5. Authorize YouTube access (one time)

```bash
node auth.js
```

This opens a browser. Sign in with your Google account and click Allow. Token saves automatically.

### 6. Start the dashboard

```bash
npm start
```

Open http://localhost:3000

---

## Daily use

**Dashboard is running:** Go to http://localhost:3000
- Paste a YouTube URL in the import bar to generate an article on demand
- Click "Check Playlist" to process any new saves from your playlist
- Review each article, preview it full-size, edit the blog card if needed
- Click "Approve & Publish" — it commits to GitHub and Cloudflare deploys automatically

**Automated cron (optional):** Run in a separate terminal tab to check the playlist daily at 9am:
```bash
node cron.js
```

---

## File structure

```
automation/
  auth.js              ← OAuth setup (run once)
  cron.js              ← Daily playlist watcher
  config.js            ← All settings
  db.js                ← SQLite queue
  pipeline/
    fetch.js           ← YouTube transcript fetcher
    generate.js        ← Claude API + article spec
    publish.js         ← File writes + git push
  dashboard/
    server.js          ← Express server
    public/
      index.html       ← Queue view
      preview.html     ← Article preview + edit
  config/
    client_secret.json ← Google credentials (gitignored)
    token.json         ← OAuth token (gitignored, auto-generated)
    .env               ← API keys (gitignored)
```

---

## What the publish step does

When you approve and publish:
1. Writes `{slug}.html` to the repo root
2. Injects the blog card as the first item in `.posts-grid` in `blog.html`
3. Creates or updates `sitemap.xml`
4. `git pull --rebase → git add → git commit → git push`
5. Cloudflare picks up the push and deploys within ~60 seconds

---

## Never commit these files

Already covered by `.gitignore`:
- `config/client_secret.json`
- `config/token.json`
- `config/.env`
- `queue.db`
- `node_modules/`

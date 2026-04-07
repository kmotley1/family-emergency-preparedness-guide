/**
 * Signal fetcher — pulls trending topics from Reddit and Google News RSS
 * Returns scored, deduplicated signals ready for dashboard display
 */

const https = require('https');
const http = require('http');

// ── Config ─────────────────────────────────────────────────────────

const SUBREDDITS = [
  'collapse',
  'economy',
  'preppers',
  'personalfinance',
  'supplychain',
];

const NEWS_QUERIES = [
  'supply chain disruption',
  'food prices',
  'dollar reserve',
  'energy crisis',
  'FEMA',
  'federal reserve',
  'tariffs',
  'job market',
];

// Keywords that boost relevance score
const RELEVANCE_KEYWORDS = [
  'household', 'family', 'supply', 'food', 'water', 'energy', 'inflation',
  'shortage', 'disruption', 'crisis', 'collapse', 'reserve', 'dollar',
  'debt', 'recession', 'unemployment', 'tariff', 'price', 'bank', 'grid',
  'fema', 'emergency', 'prepare', 'stock', 'cash', 'fuel', 'power',
];

// ── HTTP fetch utility ─────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'EmergencyPrepBot/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── RSS parser (lightweight, no dependencies) ──────────────────────

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   block.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const link  = (block.match(/<link>(.*?)<\/link>/) ||
                   block.match(/<guid>(.*?)<\/guid>/) || [])[1] || '';
    const desc  = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
                   block.match(/<description>(.*?)<\/description>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';

    if (title && link) {
      items.push({
        title: title.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        link: link.trim(),
        description: desc.replace(/<[^>]+>/g, '').trim().slice(0, 300),
        pubDate: pubDate.trim(),
      });
    }
  }

  return items;
}

// ── Relevance scoring ──────────────────────────────────────────────

function scoreItem(item) {
  const text = (item.title + ' ' + item.description).toLowerCase();
  let score = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (text.includes(kw)) score += 1;
  }
  // Boost for multiple keyword hits
  if (score >= 3) score += 2;
  if (score >= 5) score += 3;
  return score;
}

// ── Reddit RSS ─────────────────────────────────────────────────────

async function fetchReddit(subreddit) {
  try {
    const xml = await fetchUrl(`https://www.reddit.com/r/${subreddit}/hot.rss?limit=10`);
    const items = parseRSS(xml);
    return items.map(item => ({
      ...item,
      source: 'reddit',
      subreddit,
      score: scoreItem(item),
    }));
  } catch (err) {
    console.log(`   ⚠️  Reddit r/${subreddit}: ${err.message}`);
    return [];
  }
}

// ── Google News RSS ────────────────────────────────────────────────

async function fetchGoogleNews(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchUrl(url);
    const items = parseRSS(xml);
    return items.slice(0, 5).map(item => ({
      ...item,
      source: 'google_news',
      query,
      score: scoreItem(item),
    }));
  } catch (err) {
    console.log(`   ⚠️  Google News "${query}": ${err.message}`);
    return [];
  }
}

// ── Deduplication ──────────────────────────────────────────────────

function deduplicate(signals) {
  const seen = new Set();
  return signals.filter(s => {
    // Normalize title for comparison
    const key = s.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main fetch ─────────────────────────────────────────────────────

async function fetchSignals() {
  console.log('📡 Fetching signals...');

  const results = await Promise.allSettled([
    ...SUBREDDITS.map(fetchReddit),
    ...NEWS_QUERIES.map(fetchGoogleNews),
  ]);

  let all = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all = all.concat(r.value);
  }

  // Deduplicate, filter low scores, sort by score desc
  const signals = deduplicate(all)
    .filter(s => s.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20

  console.log(`   ✅ ${signals.length} signals found`);
  return signals;
}

module.exports = { fetchSignals };

const fs = require('fs');
const REPO = '/Users/kellymotley/Sites/family-emergency-preparedness-guide';
const files = [
  'economic-mobility-crisis-how-to-protect-your-household.html',
  'creator-economy-collapse-household-income-diversification.html'
];

// Correct nav CSS matching existing articles
const correctNavCSS = `    nav {
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
      font-size: 14px; font-weight: 600; color: var(--ink);
      text-decoration: none; letter-spacing: -0.01em;
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

// Correct nav HTML
const correctNavHTML = `<nav>
  <a href="index.html" class="nav-logo">Prepared. Not scared.</a>
  <ul class="nav-links">
    <li><a href="blog.html" class="active">Blog</a></li>
    <li><a href="index.html#inside">What's Inside</a></li>
    <li><a href="index.html#pricing">Pricing</a></li>
    <li>
      <a href="https://buy.stripe.com/5kQ9AT3ODbyLdht65r3ZK00" class="nav-cta">Get the Guide →</a>
    </li>
  </ul>
</nav>`;

// Correct mid-CTA CSS
const correctMidCTA = `    .mid-cta {
      background: var(--ink); border-radius: 16px;
      padding: 28px 32px;
      display: flex; align-items: center;
      justify-content: space-between; gap: 24px; margin: 40px 0;
    }
    .mid-cta-text {
      font-size: 15px; font-weight: 600; color: white; line-height: 1.5;
    }
    .mid-cta-text span {
      display: block; font-size: 13px; font-weight: 400;
      color: rgba(255,255,255,0.55); margin-top: 4px;
    }
    .mid-cta-btn {
      background: white; color: var(--navy);
      font-size: 14px; font-weight: 600;
      padding: 12px 24px; border-radius: 980px;
      text-decoration: none; white-space: nowrap; flex-shrink: 0;
    }`;

files.forEach(f => {
  const fp = REPO + '/' + f;
  if (!fs.existsSync(fp)) { console.log('Not found:', f); return; }
  let h = fs.readFileSync(fp, 'utf8');

  // 1. Replace all nav-related CSS blocks (between </style> start and body)
  // Find the style block and replace nav CSS
  h = h.replace(/\/\*.*?nav.*?\*\/[\s\S]*?(?=\/\*|\s*<\/style>)/i, '');

  // 2. Replace the nav HTML element — handles both <nav> and <div class="nav">
  h = h.replace(/<nav[\s\S]*?<\/nav>/, correctNavHTML);
  h = h.replace(/<div class="nav">[\s\S]*?<\/div>\s*\n/, correctNavHTML + '\n');
  h = h.replace(/<header[\s\S]*?<\/header>/, correctNavHTML);

  // 3. Fix mid-cta CSS — replace any existing .mid-cta block
  h = h.replace(/\.mid-cta\s*\{[\s\S]*?\}[\s\S]*?\.mid-cta-btn\s*\{[\s\S]*?\}/, correctMidCTA);

  // 4. Add padding-top to body for fixed nav
  h = h.replace(/body\s*\{([^}]+)\}/, (match, inner) => {
    if (inner.includes('padding-top')) return match;
    return match.replace(inner, inner + '\n      padding-top: 52px;');
  });

  fs.writeFileSync(fp, h, 'utf8');
  console.log('Fixed:', f);
});

console.log('\nNow commit:');
console.log('cd ~/Sites/family-emergency-preparedness-guide && git add -A && git commit -m "fix: correct nav structure in generated articles" && git push origin main');

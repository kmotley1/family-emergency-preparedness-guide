const fs = require('fs');
const path = require('path');

const REPO = '/Users/kellymotley/Sites/family-emergency-preparedness-guide';

const files = [
  'economic-mobility-crisis-how-to-protect-your-household.html',
  'creator-economy-collapse-household-income-diversification.html',
];

// ── Fixes to apply ─────────────────────────────────────────────────

const fixes = [

  // 1. Nav CTA — ensure white text with !important
  {
    name: 'nav-cta color',
    find: /\.nav-cta\s*\{[^}]+\}/,
    replace: `.nav-cta {
      background: var(--navy) !important; color: white !important;
      padding: 8px 18px; border-radius: 980px;
      font-weight: 500 !important; font-size: 13px !important;
    }`,
  },

  // 2. Nav CTA hover
  {
    name: 'nav-cta hover',
    find: /\.nav-cta:hover\s*\{[^}]+\}/,
    replace: `.nav-cta:hover { background: var(--navy-dk) !important; }`,
  },

  // 3. Mid-CTA — fix layout to flex row (text left, button right)
  {
    name: 'mid-cta layout',
    find: /\.mid-cta\s*\{[^}]+\}/,
    replace: `.mid-cta {
      background: var(--ink); border-radius: 16px;
      padding: 28px 32px;
      display: flex; align-items: center;
      justify-content: space-between; gap: 24px; margin: 40px 0;
    }`,
  },

  // 4. Mid-CTA text
  {
    name: 'mid-cta-text',
    find: /\.mid-cta-text\s*\{[^}]+\}/,
    replace: `.mid-cta-text {
      font-size: 15px; font-weight: 600;
      color: white; line-height: 1.5;
    }`,
  },

  // 5. Mid-CTA text span (subtitle)
  {
    name: 'mid-cta-text span',
    find: /\.mid-cta-text\s+span\s*\{[^}]+\}/,
    replace: `.mid-cta-text span {
      display: block; font-size: 13px; font-weight: 400;
      color: rgba(255,255,255,0.55); margin-top: 4px;
    }`,
  },

  // 6. Mid-CTA button
  {
    name: 'mid-cta-btn',
    find: /\.mid-cta-btn\s*\{[^}]+\}/,
    replace: `.mid-cta-btn {
      background: white; color: var(--navy);
      font-size: 14px; font-weight: 600;
      padding: 12px 24px; border-radius: 980px;
      text-decoration: none; white-space: nowrap; flex-shrink: 0;
      transition: background 0.15s;
    }`,
  },

  // 7. Mobile mid-cta stacking
  {
    name: 'mid-cta mobile',
    find: /\.mid-cta\s*\{\s*flex-direction:\s*column[^}]+\}/,
    replace: `.mid-cta { flex-direction: column; align-items: flex-start; }`,
  },
];

// ── Apply fixes ────────────────────────────────────────────────────

for (const filename of files) {
  const filepath = path.join(REPO, filename);

  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  Not found: ${filename}`);
    continue;
  }

  let html = fs.readFileSync(filepath, 'utf8');
  let changed = 0;

  for (const fix of fixes) {
    if (fix.find.test(html)) {
      html = html.replace(fix.find, fix.replace);
      changed++;
    }
  }

  fs.writeFileSync(filepath, html, 'utf8');
  console.log(`✅ ${filename} — ${changed} fixes applied`);
}

console.log('\nDone. Now run:');
console.log('cd ~/Sites/family-emergency-preparedness-guide');
console.log('git add -A && git commit -m "fix: nav and mid-cta styling in generated articles" && git push origin main');

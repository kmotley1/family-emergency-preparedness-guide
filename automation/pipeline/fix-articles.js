const fs = require('fs');
const REPO = '/Users/kellymotley/Sites/family-emergency-preparedness-guide';
const files = [
  'economic-mobility-crisis-how-to-protect-your-household.html',
  'creator-economy-collapse-household-income-diversification.html'
];

const correctNav = `<nav>
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

files.forEach(f => {
  const fp = REPO + '/' + f;
  if (!fs.existsSync(fp)) { console.log('Not found:', f); return; }
  let h = fs.readFileSync(fp, 'utf8');

  // Fix nav-cta CSS color
  h = h.replace(
    /\.nav-cta\s*\{[^}]+\}/,
    '.nav-cta {\n      background: var(--navy) !important; color: white !important;\n      padding: 8px 18px; border-radius: 980px;\n      font-weight: 500 !important; font-size: 13px !important;\n    }'
  );

  // Replace entire nav element
  h = h.replace(/<nav>[\s\S]*?<\/nav>/, correctNav);

  // Fix mid-cta layout
  h = h.replace(
    /\.mid-cta\s*\{[^}]+\}/,
    '.mid-cta {\n      background: var(--ink); border-radius: 16px;\n      padding: 28px 32px;\n      display: flex; align-items: center;\n      justify-content: space-between; gap: 24px; margin: 40px 0;\n    }'
  );

  fs.writeFileSync(fp, h, 'utf8');
  console.log('Fixed:', f);
});

console.log('\nNow run:');
console.log('cd ~/Sites/family-emergency-preparedness-guide && git add -A && git commit -m "fix: correct nav and cta in generated articles" && git push origin main');

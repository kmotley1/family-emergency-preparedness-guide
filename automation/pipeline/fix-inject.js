const fs = require('fs');
const file = '/Users/kellymotley/Sites/family-emergency-preparedness-guide/automation/pipeline/publish.js';
let content = fs.readFileSync(file, 'utf8');

const oldInject = `  const gridMarker = '<!-- ── RECENTLY PUBLISHED ── -->';
  const idx = html.indexOf(gridMarker);
  if (idx === -1) throw new Error('Could not find .posts-grid in blog.html');
  const insertAt = idx + gridMarker.length;`;

const newInject = `  const gridMarker = '<!-- ── RECENTLY PUBLISHED ── -->';
  const idx = html.indexOf(gridMarker);
  if (idx === -1) throw new Error('Could not find .posts-grid in blog.html');
  // Inject after the grid-label divider block that follows the comment
  const dividerEnd = html.indexOf('</div>', idx);
  const dividerEnd2 = html.indexOf('</div>', dividerEnd + 1);
  const insertAt = dividerEnd2 + 6; // after second </div>`;

if (content.includes(oldInject)) {
  content = content.replace(oldInject, newInject);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Done — inject logic updated');
} else {
  console.log('❌ Pattern not found. Current injectBlogCard function:');
  const match = content.match(/function injectBlogCard[\s\S]+?^}/m);
  console.log(match ? match[0] : 'function not found');
}

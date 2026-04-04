const fs = require('fs');
const file = '/Users/kellymotley/Sites/family-emergency-preparedness-guide/automation/pipeline/publish.js';
let content = fs.readFileSync(file, 'utf8');

// Find and replace the gridMarker line
const oldMarker = `const gridMarker = '<div class="posts-grid" id="mainGrid">';`;
const newMarker = `const gridMarker = '<!-- ── RECENTLY PUBLISHED ── -->';`;

if (content.includes(oldMarker)) {
  content = content.replace(oldMarker, newMarker);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Done — gridMarker updated');
} else {
  console.log('❌ Old marker not found — checking current value:');
  const match = content.match(/const gridMarker = .+/);
  console.log(match ? match[0] : 'gridMarker not found at all');
}

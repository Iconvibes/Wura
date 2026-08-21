const fs = require('fs');
let content = fs.readFileSync('server/routes/publicExtensions.js', 'utf8');

// Find the exact string and replace
const oldStr = "`- ${r.name}: $${r.price}/night`";
const newStr = "'- ' + r.name + ': $' + r.price + '/night'";

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  console.log('Found and replaced template literal');
} else {
  console.log('Template literal not found, searching...');
  // Show what's around roomList
  const idx = content.indexOf('roomList');
  console.log('Around roomList:', JSON.stringify(content.substring(idx, idx + 120)));
}

fs.writeFileSync('server/routes/publicExtensions.js', content);

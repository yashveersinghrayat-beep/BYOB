const fs = require('fs');
const path = require('path');

const menuDataPath = path.join(__dirname, '..', 'js', 'menu-data.js');
let lines = fs.readFileSync(menuDataPath, 'utf8').split('\n');

let insideMenuItems = false;
let currentItemId = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const MENU_ITEMS = [')) {
    insideMenuItems = true;
  }
  if (!insideMenuItems) continue;

  const idMatch = line.match(/id:\s*"([^"]+)"/);
  if (idMatch) {
    currentItemId = idMatch[1];
  }

  if (currentItemId && line.includes('image:')) {
    lines[i] = `    image: "images/dishes/${currentItemId}.jpg"`;
    currentItemId = null; // reset after assigning
  }
}

fs.writeFileSync(menuDataPath, lines.join('\n'), 'utf8');
console.log('✅ Precisely updated MENU_ITEMS in menu-data.js');


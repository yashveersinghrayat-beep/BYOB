const fs = require('fs');
const path = require('path');

const menuDataPath = path.join(__dirname, '..', 'js', 'menu-data.js');
let content = fs.readFileSync(menuDataPath, 'utf8');

// Replace image: "https://..." with image: "images/dishes/<item.id>.jpg"
// Let's parse item blocks:
content = content.replace(/id:\s*"([a-zA-Z0-9_]+)",([\s\S]*?)image:\s*"[^"]+"/g, (match, id, middle) => {
  return `id: "${id}",${middle}image: "images/dishes/${id}.jpg"`;
});

fs.writeFileSync(menuDataPath, content, 'utf8');
console.log('✅ Updated js/menu-data.js with local dish images!');


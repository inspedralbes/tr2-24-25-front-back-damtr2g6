const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'centros.json');

try {
  const data = fs.readFileSync(filePath, 'utf8');
  JSON.parse(data);
  console.log('JSON content is valid.');
} catch (err) {
  console.error('JSON validation failed:', err.message);
  process.exit(1);
}

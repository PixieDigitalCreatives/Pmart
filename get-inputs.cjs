const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

console.log("=== RAW <input> ELEMENTS ===");
let total = 0;
let fileCount = 0;
walkDir('src', function(filePath) {
  if (filePath.endsWith('.jsx') && !filePath.endsWith('Input.jsx')) { // Exclude the component itself
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let hasInput = false;
    lines.forEach((line, i) => {
      // Find raw <input ... >
      // Note: we should ignore <Input (capital I)
      const inputMatch = line.match(/<input\b[^>]*>/);
      if (inputMatch) {
        hasInput = true;
        total++;
        let typeMatch = inputMatch[0].match(/type=["']?([^"'\s>]+)["']?/i);
        let type = typeMatch ? typeMatch[1] : 'text (default/unknown)';
        console.log(`- ${filePath}:${i+1} -> type="${type}"`);
      }
    });
    if (hasInput) fileCount++;
  }
});
console.log(`\nFound ${total} raw <input> elements across ${fileCount} files.`);

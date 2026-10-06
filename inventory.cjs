const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let totalInputs = 0;
let fileCount = 0;

console.log("=== RAW <input> ELEMENTS INVENTORY ===");

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('Input.jsx')) return; // Ignore the shared component itself
  
  const content = fs.readFileSync(filePath, 'utf8');
  // Removed 'i' flag so it strictly matches lowercase '<input'
  const regex = /<input([^>]*?)>/g;
  
  let match;
  let hasInput = false;
  
  while ((match = regex.exec(content)) !== null) {
    // Determine line number
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Determine type (case insensitive since type="text" or type="TEXT")
    const typeMatch = match[1].match(/type=["']([^"']*)["']/i);
    const type = typeMatch ? typeMatch[1] : "text"; // HTML default is text
    
    if (!hasInput) {
      console.log(`\nFile: ${filePath}`);
      hasInput = true;
      fileCount++;
    }
    console.log(`  Line ${lineNum}: type="${type}"`);
    totalInputs++;
  }
});

console.log(`\nTotal: ${totalInputs} raw <input> elements across ${fileCount} files.`);

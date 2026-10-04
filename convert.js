const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// try using pandoc to convert docx to markdown if it's installed
try {
  execSync('pandoc PMart_Backend_PRD.docx -f docx -t markdown -o PMart_Backend_PRD.md');
  console.log('Successfully converted using pandoc.');
} catch (e) {
  console.log('pandoc failed. trying to read raw xml...');
}

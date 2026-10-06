const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const unmigratedInputs = [];
const unmigratedButtons = [];
const unmigratedSelects = [];
const unmigratedModals = [];
const missingHtmlFor = [];
const missingLabels = [];

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx') || filePath.includes('Input.jsx')) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Look for raw elements
  const rawInputMatches = content.match(/<input[^>]*>/g) || [];
  const inputMatches = rawInputMatches.filter(m => !m.match(/type=["'](checkbox|radio|range|file)["']/i));
  const buttonMatches = content.match(/<button[^>]*class(Name)?=["'][^"']*btn[^"']*["'][^>]*>/g) || [];
  const selectMatches = content.match(/<select[^>]*>/g) || [];
  
  if (inputMatches.length > 0) {
    unmigratedInputs.push({ file: filePath, count: inputMatches.length });
  }
  
  if (buttonMatches.length > 0) {
    unmigratedButtons.push({ file: filePath, count: buttonMatches.length });
  }
  
  if (selectMatches.length > 0) {
    unmigratedSelects.push({ file: filePath, count: selectMatches.length });
  }

  // Look for missing htmlFor on raw labels (excluding those inside FormField)
  const labelMatches = content.match(/<label([^>]*)>/gi) || [];
  let noHtmlForCount = 0;
  labelMatches.forEach(label => {
    if (!label.includes('htmlFor') && !label.includes('for=')) {
      noHtmlForCount++;
    }
  });
  if (noHtmlForCount > 0) {
    missingHtmlFor.push({ file: filePath, count: noHtmlForCount });
  }
  
});

console.log("=== UI CONSISTENCY AUDIT REPORT ===\n");

console.log("Unmigrated <input> elements (use <Input> instead):");
unmigratedInputs.forEach(i => console.log(`- ${i.file} (${i.count})`));

console.log("\nUnmigrated <button> elements (use <Button> instead):");
unmigratedButtons.forEach(i => console.log(`- ${i.file} (${i.count})`));

console.log("\nUnmigrated <select> elements (use <Select> instead):");
unmigratedSelects.forEach(i => console.log(`- ${i.file} (${i.count})`));

console.log("\nRaw <label> elements missing htmlFor (a11y issue):");
missingHtmlFor.forEach(i => console.log(`- ${i.file} (${i.count})`));

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

function ensureInputImport(content, filePath) {
  if (content.includes("import { Input") || content.includes("import { Button, Input") || content.includes("import { Input,") || content.match(/import\s*{[^}]*Input[^}]*}\s*from\s*['"]@\/components\/ui['"]/)) {
    return content;
  }
  
  // Find where we import from @/components/ui
  const uiImportRegex = /import\s*{([^}]+)}\s*from\s*['"]@\/components\/ui['"];?/;
  if (uiImportRegex.test(content)) {
    return content.replace(uiImportRegex, (match, p1) => {
      const parts = p1.split(',').map(s => s.trim()).filter(Boolean);
      if (!parts.includes('Input')) {
        parts.push('Input');
      }
      return `import { ${parts.join(', ')} } from '@/components/ui';`;
    });
  } else {
    // Just add it after the last import
    const importLines = content.match(/^import .*;$/gm) || [];
    if (importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      return content.replace(lastImport, lastImport + `\nimport { Input } from '@/components/ui';`);
    } else {
      return `import { Input } from '@/components/ui';\n` + content;
    }
  }
}

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('Input.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // We need to carefully replace <input ...> with <Input ...>
  // BUT only if it's NOT a checkbox/radio/range.
  
  // We can use a replacer function
  const regex = /<input\b([^>]*)>/g;
  let modified = false;
  
  content = content.replace(regex, (match, p1) => {
    // Check type
    const typeMatch = p1.match(/type=["']([^"']*)["']/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : "text";
    
    if (['checkbox', 'radio', 'range', 'file'].includes(type)) {
      // Leave native
      return match;
    }
    
    // We should remove className="form-control" if present
    let newAttrs = p1;
    newAttrs = newAttrs.replace(/\bclassName=(["'])(?:.*?\bform-control\b.*?)\1/g, (clsMatch, q) => {
       let cls = clsMatch.substring(11, clsMatch.length - 1);
       cls = cls.replace(/\bform-control\b/g, '').trim();
       if (cls === '') return ''; // remove className entirely
       return `className=${q}${cls}${q}`;
    });
    
    modified = true;
    return `<Input${newAttrs}>`;
  });
  
  if (modified) {
    content = ensureInputImport(content, filePath);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Migrated inputs in ${filePath}`);
  }
});

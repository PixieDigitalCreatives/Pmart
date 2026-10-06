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

function ensureImports(content, components) {
  let toImport = [];
  components.forEach(c => {
    if (!content.match(new RegExp(`import\\s*\\{[^}]*\\b${c}\\b[^}]*\\}\\s*from\\s*['"]@\\/components\\/ui['"]`))) {
      toImport.push(c);
    }
  });

  if (toImport.length === 0) return content;

  const uiImportRegex = /import\s*{([^}]+)}\s*from\s*['"]@\/components\/ui['"];?/;
  if (uiImportRegex.test(content)) {
    return content.replace(uiImportRegex, (match, p1) => {
      const parts = p1.split(',').map(s => s.trim()).filter(Boolean);
      toImport.forEach(c => {
        if (!parts.includes(c)) parts.push(c);
      });
      return `import { ${parts.join(', ')} } from '@/components/ui';`;
    });
  } else {
    const importLines = content.match(/^import .*;$/gm) || [];
    if (importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      return content.replace(lastImport, lastImport + `\nimport { ${toImport.join(', ')} } from '@/components/ui';`);
    } else {
      return `import { ${toImport.join(', ')} } from '@/components/ui';\n` + content;
    }
  }
}

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.jsx') && !filePath.endsWith('.tsx')) return;
  if (filePath.includes('Button.jsx') || filePath.includes('Select.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let modified = false;
  let componentsNeeded = new Set();
  
  // 1. Button migration
  if (content.match(/<button/)) {
    content = content.replace(/<button\b([^>]*)>/gi, (match, attrs) => {
      // Extract className
      let newAttrs = attrs;
      let variant = 'primary'; // Button default
      let size = 'md'; // Button default
      let variantAdded = false;
      let sizeAdded = false;

      newAttrs = newAttrs.replace(/\bclassName=(["'])(.*?)\1/g, (clsMatch, q, cls) => {
        let classes = cls.split(' ').filter(Boolean);
        
        const newClasses = [];
        for (let c of classes) {
          if (c === 'btn') continue;
          else if (c.startsWith('btn-')) {
            const val = c.substring(4);
            if (['primary', 'secondary', 'danger', 'success', 'outline', 'ghost', 'icon'].includes(val)) {
              variant = val;
              variantAdded = true;
            } else if (['sm', 'md', 'lg', 'full'].includes(val)) {
              size = val;
              sizeAdded = true;
            } else {
              newClasses.push(c);
            }
          } else {
            newClasses.push(c);
          }
        }
        
        return newClasses.length > 0 ? `className=${q}${newClasses.join(' ')}${q}` : '';
      });
      
      let props = newAttrs;
      if (variantAdded && variant !== 'primary') props += ` variant="${variant}"`;
      if (sizeAdded && size !== 'md') props += ` size="${size}"`;

      modified = true;
      componentsNeeded.add('Button');
      return `<Button${props}>`;
    });
    
    if (modified) {
      content = content.replace(/<\/button>/gi, '</Button>');
    }
  }

  // 2. Select migration
  if (content.match(/<select/)) {
    content = content.replace(/<select\b([^>]*)>/gi, (match, attrs) => {
      let newAttrs = attrs.replace(/\bclassName=(["'])(?:.*?\bform-control\b.*?)\1/g, (clsMatch, q) => {
        let cls = clsMatch.substring(11, clsMatch.length - 1);
        cls = cls.replace(/\bform-control\b/g, '').trim();
        if (cls === '') return '';
        return `className=${q}${cls}${q}`;
      });
      
      modified = true;
      componentsNeeded.add('Select');
      return `<Select${newAttrs}>`;
    });
    
    if (modified) {
      content = content.replace(/<\/select>/gi, '</Select>');
    }
  }
  
  // 3. Label htmlFor fixing
  if (content.match(/<label\b/)) {
    content = content.replace(/<label\b([^>]*)>/gi, (match, attrs) => {
      if (!attrs.includes('htmlFor') && !attrs.includes('for=')) {
        modified = true;
        return `<label htmlFor="auto-id-needed"${attrs}>`;
      }
      return match;
    });
  }

  if (modified) {
    if (componentsNeeded.size > 0) {
      content = ensureImports(content, Array.from(componentsNeeded));
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Migrated elements in ${filePath}`);
  }
});

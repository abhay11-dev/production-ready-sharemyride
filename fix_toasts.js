const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');
const toastServicePath = path.join(srcDir, 'services', 'toastService.js'); // actually .jsx

function getRelativePath(fromFile) {
  const rel = path.relative(path.dirname(fromFile), path.join(srcDir, 'services', 'toastService'));
  return rel.startsWith('.') ? rel : './' + rel;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      if (fullPath.includes('toastService') || fullPath.includes('App.jsx')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const importRegex1 = /import\s+toast\s+from\s+['"]react-hot-toast['"];?/g;
      const importRegex2 = /import\s+\{\s*toast\s*\}\s+from\s+['"]react-hot-toast['"];?/g;
      
      let changed = false;
      
      if (importRegex1.test(content) || importRegex2.test(content)) {
        const relPath = getRelativePath(fullPath);
        const newImport = `import toast from '${relPath}';`;
        
        content = content.replace(importRegex1, newImport);
        content = content.replace(importRegex2, newImport);
        changed = true;
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log("Done!");

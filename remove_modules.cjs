const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove import statements
      content = content.replace(/^import\s+.*?;?\r?\n/gm, '');
      
      // Remove export from export const/let/function
      content = content.replace(/^export\s+(const|let|var|function|async\s+function)/gm, '$1');
      
      // Remove export default
      content = content.replace(/^export\s+default\s+/gm, '');

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log('Processed', fullPath);
    }
  }
}

processDir(srcDir);
console.log('Done!');

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const htmlPath = path.join(rootDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Inline CSS
html = html.replace(/<link rel="stylesheet" href="\.\/([^"]+)" \/>/g, (match, p1) => {
  try {
    const cssContent = fs.readFileSync(path.join(rootDir, p1), 'utf8');
    return `<style>${cssContent}</style>`;
  } catch (e) {
    console.error('Error reading CSS:', p1);
    return match;
  }
});

// Inline JS
html = html.replace(/<script src="\.\/([^"]+)"><\/script>/g, (match, p1) => {
  try {
    const jsContent = fs.readFileSync(path.join(rootDir, p1), 'utf8');
    return `<script>${jsContent}</script>`;
  } catch (e) {
    console.error('Error reading JS:', p1);
    return match;
  }
});

const outputPath = path.join(rootDir, 'Infinitee_PrintFlow_DB_Standalone.html');
fs.writeFileSync(outputPath, html, 'utf8');
console.log('Successfully created', outputPath);

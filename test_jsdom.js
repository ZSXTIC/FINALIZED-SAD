const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const jsdom = new JSDOM(htmlContent, {
  url: 'file://' + htmlPath.replace(/\\/g, '/'),
  runScripts: 'dangerously',
  resources: 'usable'
});

jsdom.window.onerror = function(msg, url, line, col, error) {
  console.error('JSDOM Error:', msg, line, col, error);
};

jsdom.window.addEventListener('error', (event) => {
  console.error('JSDOM Event Error:', event.error);
});

setTimeout(() => {
  console.log('JSDOM test complete. App HTML:', !!jsdom.window.document.querySelector('#app').innerHTML);
  process.exit(0);
}, 2000);

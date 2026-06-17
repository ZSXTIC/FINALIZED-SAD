const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/utils/formatters.js');
let content = fs.readFileSync(file, 'utf8');

const functions = [
  'formatCurrency',
  'formatCompact',
  'formatDate',
  'formatDateOnly',
  'slugify',
  'classNames',
  'toSentenceCase',
  'toTitleCase',
  'escapeHtml',
  'uid',
  'todayMonthValue',
  'last4'
];

functions.forEach(fn => {
  content = content.replace(new RegExp(`function ${fn}\\(`, 'g'), `export function ${fn}(`);
});

fs.writeFileSync(file, content, 'utf8');
console.log('Restored formatters.js exports');

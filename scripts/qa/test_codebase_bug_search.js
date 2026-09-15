import fs from 'fs';
import path from 'path';

const patterns = [
  'currentPlayer',
  'currentUser',
  'currentPuzzle',
  'globalScore',
  'globalCoins',
  'activePlayer',
  'activeSession',
  'gameState',
  'localStorage',
  'sessionStorage'
];

function searchFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'data') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      searchFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = searchFiles('./src').concat(searchFiles('./server'));
const findings = {};

patterns.forEach(p => findings[p] = []);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    patterns.forEach(p => {
      if (line.includes(p)) {
        findings[p].push({ file, line: idx + 1, snippet: line.trim() });
      }
    });
  });
}

console.log('=== CODEBASE PATTERN AUDIT RESULTS ===');
for (const [pattern, matches] of Object.entries(findings)) {
  console.log(`\nPattern: "${pattern}" (${matches.length} occurrences)`);
  matches.slice(0, 10).forEach(m => {
    console.log(`  ${m.file}:${m.line} -> ${m.snippet.slice(0, 80)}`);
  });
}

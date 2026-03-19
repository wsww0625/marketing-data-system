const { execSync } = require('child_process');
const path = require('path');
process.chdir(path.join(__dirname, 'client'));
const args = process.argv.slice(2).join(' ');
const viteBin = path.join(__dirname, 'client', 'node_modules', 'vite', 'bin', 'vite.js');
require('child_process').spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: path.join(__dirname, 'client')
});

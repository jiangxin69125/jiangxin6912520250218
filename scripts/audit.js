const { spawnSync } = require('child_process');

const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm.cmd', 'audit', '--omit=dev']
  : ['audit', '--omit=dev'];
const result = spawnSync(command, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status;
}

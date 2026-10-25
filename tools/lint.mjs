// Shared local/CI entry point. No shell, automatic fixes or runtime dependencies.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, relative} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const selected = process.argv[2];
if (process.argv.length > 3 || (selected && !['js', 'css', 'py'].includes(selected))) {
  console.error('Usage: node tools/lint.mjs [js|css|py]');
  process.exit(2);
}
const venv = resolve(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const python = process.env.LINT_PYTHON || (existsSync(venv) ? venv : 'python');
const checks = {
  js: [process.execPath, ['node_modules/eslint/bin/eslint.js', '--format=json', '--max-warnings=0',
    'js/', 'tools/', 'resources/pdf-fields.js', '*.html', '*.config.mjs']],
  css: [process.execPath, ['node_modules/stylelint/bin/stylelint.mjs', '--formatter=json', '--max-warnings=0',
    'css/**/*.css', '*.html']],
  py: [python, ['-m', 'ruff', 'check', '--output-format=json', 'server/', 'tools/']],
};
let failed = false;
for (const [name, [command, args]] of Object.entries(checks)) {
  if (selected && selected !== name) continue;
  const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  if (result.status === 0) {
    console.log(`${name}: OK`);
  } else {
    failed = true;
    // Each tool emits JSON for findings. Stylelint uses stderr for its report.
    const report = name === 'css' ? result.stderr || result.stdout : result.stdout;
    try {
      for (const file of JSON.parse(report)) {
        const path = relative(root, file.filePath || file.source || file.filename).replaceAll('\\', '/');
        const messages = file.messages || file.warnings || [file];
        for (const message of messages) {
          const line = message.line || message.location?.row || 1;
          const column = message.column || message.location?.column || 1;
          const rule = message.ruleId || message.rule || message.code || 'syntax';
          const text = message.message || message.text;
          console.error(`${path}:${line}:${column} ${rule} ${text}`);
        }
        for (const error of file.parseErrors || []) console.error(`${path}:${error.line || 1}:${error.column || 1} syntax ${error.text}`);
      }
      if (name !== 'css' && result.stderr) process.stderr.write(result.stderr);
    } catch {
      // Configuration/startup failures are not necessarily JSON; preserve details.
      if (result.stdout) process.stderr.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    if (result.error) console.error(`${name}: ${result.error.message}`);
    if (result.signal) console.error(`${name}: terminated by ${result.signal}`);
  }
}
process.exitCode = failed ? 1 : 0;

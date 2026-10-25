// Data-free configuration checks using the actual installed linters.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ESLint} from 'eslint';
import stylelint from 'stylelint';

const root = fileURLToPath(new URL('../', import.meta.url));
const eslint = new ESLint({cwd: root});
let checks = 0;
async function js(code, filePath, expected) {
  const [result] = await eslint.lintText(code, {filePath});
  assert.deepEqual(result.messages.map(message => message.ruleId).sort(), [...expected].sort(), filePath);
  checks++;
  return result;
}
await js('document.title = window.location.href;', 'js/app.js', []);
await js('PDFLib.PDFDocument.load(new Uint8Array());', 'js/app.js', []);
await js('module.exports = require("./rules-core.js");', 'js/core/rules-engine.js', []);
await js('process.exitCode = 0;', 'tools/lint.mjs', []);
await js('document.title = "test";', 'tools/lint.mjs', ['no-undef']);
await js('process.exitCode = 0;', 'js/app.js', ['no-undef']);
await js('WScript.Echo(new ActiveXObject("test")); new Enumerator([]);', 'tools/validate.js', []);
await js('window.test = ROOT;', 'tools/cc_fetch.js', []);
await js('window.test = 1;', 'resources/pdf-fields.js', []);
await js('missingLintProbe();', 'js/app.js', ['no-undef']);
await js('var test = {a: 1, a: 2};', 'js/app.js', ['no-dupe-keys']);
await js('function test() { return; missingLintProbe(); }', 'js/app.js', ['no-unreachable', 'no-undef']);
const inline = await js('<!doctype html>\n<script>\nmissingLintProbe();\n</script>', 'classes.html', ['no-undef']);
assert.equal(inline.messages[0].line, 3); checks++;
const ignored = ['resources/data-lint-probe.js', 'resources/features/lint-probe.js',
  'resources/pdf-lib.min.js', 'tools/browser/artifacts/lint-probe.mjs',
  'node_modules/lint-probe.js', '.venv/lint-probe.js', 'Microsoft/lint-probe.js',
  'CharacterManager_Harness_v0.1/lint-probe.js'];
for (const file of ignored) {
  assert.equal(await eslint.isPathIgnored(resolve(root, file)), true, file); checks++;
}
for (const file of ['css/lint-probe.css', 'classes.html']) {
  const css = '.probe { colro: red; color: #ggg; width: 1notAUnit; }';
  const result = await stylelint.lint({code: file.endsWith('.html') ? `<!doctype html>\n<style>\n${css}\n</style>` : css,
    codeFilename: resolve(root, file), configFile: resolve(root, 'stylelint.config.mjs')});
  const warnings = result.results[0].warnings;
  assert.deepEqual(warnings.map(warning => warning.rule).sort(),
    ['color-no-invalid-hex', 'property-no-unknown', 'unit-no-unknown']);
  assert.equal(warnings[0].line, file.endsWith('.html') ? 3 : 1); checks++;
}
const venv = resolve(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const python = process.env.LINT_PYTHON || (existsSync(venv) ? venv : 'python');
const ruff = spawnSync(python, ['-m', 'ruff', 'check', '--output-format=json', '--stdin-filename', 'server/lint_probe.py', '-'],
  {cwd: root, input: 'print(missing_lint_probe)\n', encoding: 'utf8'});
assert.equal(ruff.status, 1, ruff.stderr);
assert.deepEqual(JSON.parse(ruff.stdout).map(message => message.code), ['F821']); checks++;
const files = spawnSync(python, ['-m', 'ruff', 'check', '--show-files', '.'], {cwd: root, encoding: 'utf8'});
assert.equal(files.status, 0, files.stderr);
const paths = files.stdout.trim().split(/\r?\n/).map(path => path.replaceAll('\\', '/'));
assert(paths.some(path => path.endsWith('/server/app.py')));
assert(paths.some(path => path.endsWith('/tools/gen_items.py')));
assert(paths.every(path => path.startsWith(root.replaceAll('\\', '/') + 'server/') || path.startsWith(root.replaceAll('\\', '/') + 'tools/')));
assert(paths.every(path => !/\/(\.venv|venv|node_modules|artifacts)\//.test(path))); checks++;
console.log(`${checks} linter configuration checks passed`);

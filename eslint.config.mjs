import globals from 'globals';
import html from 'eslint-plugin-html';

const browserFiles = ['js/**/*.js', 'resources/pdf-fields.js', '*.html'];
const nodeFiles = ['tools/**/*.mjs', '*.config.mjs'];
const wshFiles = ['tools/validate.js', 'tools/cc_fetch.js'];

// Deliberately limited to likely programming errors, with no formatting rules.
const rules = {
  'no-undef': 'error',
  'no-const-assign': 'error',
  'no-dupe-args': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  'no-func-assign': 'error',
  'no-unreachable': 'error',
  'no-unsafe-finally': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
};

export default [
  {ignores: ['**/node_modules/**', '**/.venv/**', '**/venv/**', '**/artifacts/**',
    'Microsoft/**', 'CharacterManager_Harness_v0.1/**', 'resources/*', '!resources/pdf-fields.js']},
  {files: [...browserFiles, ...nodeFiles, ...wshFiles], rules},
  {files: browserFiles, languageOptions: {sourceType: 'script', globals: globals.browser}},
  // Optional pdf-lib script; exportPdf checks window.PDFLib before use.
  {files: ['js/app.js'], languageOptions: {globals: {PDFLib: 'readonly'}}},
  // The HTML plugin checks inline scripts and maps diagnostics to HTML lines.
  {files: ['*.html'], plugins: {html}},
  {files: ['js/core/*.js', 'js/ui/*.js', 'js/character-validation.js'],
    languageOptions: {globals: {module: 'readonly', require: 'readonly'}}},
  {files: nodeFiles, languageOptions: {sourceType: 'module', globals: globals.node}},
  // page.evaluate/addInitScript/waitForFunction callbacks execute in the browser.
  {files: ['tools/browser/mobile.mjs'], languageOptions: {globals: globals.browser}},
  {files: wshFiles, languageOptions: {ecmaVersion: 5, sourceType: 'script',
    globals: {WScript: 'readonly', ActiveXObject: 'readonly', Enumerator: 'readonly'}}},
  // These two bindings are injected by the evaluated validate.js loader.
  {files: ['tools/cc_fetch.js'], languageOptions: {globals: {window: 'readonly', ROOT: 'readonly'}}},
];

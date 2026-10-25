export default {
  ignoreFiles: ['**/node_modules/**', '**/artifacts/**', 'Microsoft/**', 'CharacterManager_Harness_v0.1/**'],
  overrides: [{files: ['*.html'], customSyntax: 'postcss-html'}],
  rules: {
    'color-no-invalid-hex': true,
    'property-no-unknown': true,
    'unit-no-unknown': true,
  },
};

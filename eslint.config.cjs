const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: Object.assign({}, globals.node, {
        after: 'readonly',
        afterEach: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        fdescribe: 'readonly',
        fit: 'readonly',
        inject: 'readonly',
        it: 'readonly',
        jasmine: 'readonly',
        Promise: 'readonly',
        spyOn: 'readonly',
        xdescribe: 'readonly',
        xit: 'readonly'
      })
    },
    rules: {
      'no-extra-boolean-cast': 'off',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true
      }]
    }
  }
];

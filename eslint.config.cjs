var js = require('@eslint/js');
var globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 5,
      sourceType: 'commonjs',
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
      'no-unused-vars': 'off'
    }
  }
];

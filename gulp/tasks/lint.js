'use strict';

const
  gulp   = require('gulp'),
  spawn = require('child_process').spawn,
  path = require('path'),
  config = require('../config');

const
  SRC = {
    jsFiles: [config.paths.source + '/**/*.js', config.paths.test.base + '/**/*.js', config.paths.gulp + '/**/*.js' ]
  };

gulp.task('_lint', function() {
  const eslintCli = path.resolve(process.cwd(), 'node_modules', 'eslint', 'bin', 'eslint.js');

  return new Promise(function (resolve, reject) {
    const lint = spawn(process.execPath, [eslintCli].concat(SRC.jsFiles), {
      stdio: 'inherit'
    });

    lint.on('error', reject);
    lint.on('exit', function (code) {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('ESLint failed with exit code ' + code));
      }
    });
  });
});

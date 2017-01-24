'use strict';

var
  gulp = require('gulp'),
  exec = require('child_process').exec,
  sprintf = require('sprintf-js').sprintf;

function release(version, cb) {
  exec(sprintf('npm version %s -m "release (nems): v%s" && npm publish', version, '%s'), function (err) {
    cb(err);
  });
}

gulp.task('release:patch', function (done) {
  release('patch', done);
});

gulp.task('release:minor', function (done) {
  release('minor', done);
});

gulp.task('release:major', function (done) {
  release('major', done);
});
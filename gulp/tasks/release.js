'use strict';

var
  gulp = require('gulp'),
  exec = require('child_process').exec;

function release(version, cb) {
  exec(`npm version ${version} -m "release (nems): v%s" && npm publish`, function (err) {
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

'use strict';

var
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  Ramda = require('ramda'),
  Promise = require('bluebird'),
  extractZip = require('extract-zip'),
  tar = require('tar'),

  ExtractionError = require('../error/errors').ExtractionError,

  DEFAULT_EXTRACTION_DIR = 'mongodb-download',
  ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION = 'missing file for extraction',
  ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION = 'missing version for extraction',
  ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE = 'invalid arch type';

function isNilOrEmptyString(variable) {
  return Ramda.isNil(variable) || (Ramda.is(String,variable) && variable.length === 0);
}

function ensureDir(dir) {
  return new Promise(function (resolve, reject) {
    fs.mkdir(dir, function (err) {
      if (!err || (err && err.code === 'EEXIST')) {
        return resolve();
      }

      if (err.code !== 'ENOENT') {
        return reject(err);
      }

      return ensureDir(path.dirname(dir))
        .then(function () {
          return ensureDir(dir);
        })
        .then(resolve)
        .catch(reject);
    });
  });
}

function isSafeTarEntry(_entryPath, entry) {
  return entry.type !== 'SymbolicLink' && entry.type !== 'Link';
}

function getArchiveType(file) {
  if (/\.zip$/.test(file)) {
    return 'zip';
  } else if (/\.(tar\.|t)?gz$/.test(file)) {
    return 'targz';
  } else if (/tar$/.test(file)) {
    return 'tar';
  }
  throw new ExtractionError(ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE, 400);
}

function extractArchive(file, extractionDir, archiveType) {
  var resolvedExtractionDir = path.resolve(extractionDir);

  return ensureDir(resolvedExtractionDir).then(function () {
    if (archiveType === 'zip') {
      return extractZip(file, {
        dir: resolvedExtractionDir
      });
    }

    return tar.x({
      file: file,
      cwd: resolvedExtractionDir,
      strip: 1,
      gzip: archiveType === 'targz',
      preservePaths: false,
      filter: isSafeTarEntry
    });
  });
}

function extract(file, version, extractionBaseDir) {
  return Promise.try(function () {
    var
      archiveType,
      extractionDir;

    if (isNilOrEmptyString(file)) {
      throw new ExtractionError(ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION);
    } else if (isNilOrEmptyString(version)) {
      throw new ExtractionError(ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION);
    }

    archiveType = getArchiveType(file);
    extractionDir = path.join((extractionBaseDir) ? extractionBaseDir : os.tmpdir(), DEFAULT_EXTRACTION_DIR, version);

    return extractArchive(file, extractionDir, archiveType)
      .then(function () {
        return extractionDir;
      });
  });
}

module.exports.extract = extract;

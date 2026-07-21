'use strict';

var
  fs = require('fs'),
  os = require('os'),
  path = require('path'),
  Ramda = require('ramda'),
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

async function ensureDir(dir) {
  try {
    await fs.promises.mkdir(dir);
  } catch (err) {
    if (err && err.code === 'EEXIST') {
      return;
    }

    if (!err || err.code !== 'ENOENT') {
      throw err;
    }

    await ensureDir(path.dirname(dir));
    await ensureDir(dir);
  }
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

async function extractArchive(file, extractionDir, archiveType) {
  var resolvedExtractionDir = path.resolve(extractionDir);

  await ensureDir(resolvedExtractionDir);

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
}

async function extract(file, version, extractionBaseDir) {
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

  await extractArchive(file, extractionDir, archiveType);

  return extractionDir;
}

module.exports.extract = extract;

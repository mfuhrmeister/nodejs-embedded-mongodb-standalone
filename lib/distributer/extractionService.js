import fs from 'fs';
import os from 'os';
import path from 'path';
import extractZip from 'extract-zip';
import * as tar from 'tar';

import { ExtractionError } from '../error/errors.js';

const
  DEFAULT_EXTRACTION_DIR = 'mongodb-download',
  ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION = 'missing file for extraction',
  ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION = 'missing version for extraction',
  ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE = 'invalid arch type';

function isNilOrEmptyString(variable) {
  return variable == null || (typeof variable === 'string' && variable.length === 0);
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

function createExtractionService(dependencies) {
  const resolvedDependencies = dependencies || {};
  const resolvedExtractZip = resolvedDependencies.extractZip || extractZip;
  const resolvedTar = resolvedDependencies.tar || tar;
  const resolvedEnsureDir = resolvedDependencies.ensureDir || ensureDir;

  async function extractArchive(file, extractionDir, archiveType) {
    const resolvedExtractionDir = path.resolve(extractionDir);

    await resolvedEnsureDir(resolvedExtractionDir);

    if (archiveType === 'zip') {
      return resolvedExtractZip(file, {
        dir: resolvedExtractionDir
      });
    }

    return resolvedTar.x({
      file: file,
      cwd: resolvedExtractionDir,
      strip: 1,
      gzip: archiveType === 'targz',
      preservePaths: false,
      filter: isSafeTarEntry
    });
  }

  async function extract(file, version, extractionBaseDir) {
    if (isNilOrEmptyString(file)) {
      throw new ExtractionError(ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION);
    } else if (isNilOrEmptyString(version)) {
      throw new ExtractionError(ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION);
    }

    const archiveType = getArchiveType(file);
    const extractionDir = path.join((extractionBaseDir) ? extractionBaseDir : os.tmpdir(), DEFAULT_EXTRACTION_DIR, version);

    await extractArchive(file, extractionDir, archiveType);

    return extractionDir;
  }

  return {
    extract: extract
  };
}

const extractionService = createExtractionService();

export { createExtractionService };
export default extractionService;

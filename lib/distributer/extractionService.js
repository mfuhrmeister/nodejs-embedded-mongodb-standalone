import fs from 'fs';
import os from 'os';
import path from 'path';
import extractZip from 'extract-zip';
import * as tar from 'tar';

import { ExtractionError } from '../error/errors.js';

const
  DEFAULT_EXTRACTION_DIR = 'mongodb-download',
  DEFAULT_ZIP_MAX_ENTRIES = 20000,
  DEFAULT_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = 8 * 1024 * 1024 * 1024,
  DEFAULT_ZIP_MAX_COMPRESSION_RATIO = 200,
  ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION = 'missing file for extraction',
  ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION = 'missing version for extraction',
  ERROR_MESSAGE_ZIP_ENTRY_LIMIT_EXCEEDED = 'zip extraction limits exceeded: too many entries',
  ERROR_MESSAGE_ZIP_TOTAL_SIZE_LIMIT_EXCEEDED = 'zip extraction limits exceeded: total uncompressed size',
  ERROR_MESSAGE_ZIP_COMPRESSION_RATIO_LIMIT_EXCEEDED = 'zip extraction limits exceeded: compression ratio',
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
  const resolvedZipLimits = Object.assign({
    maxEntries: DEFAULT_ZIP_MAX_ENTRIES,
    maxTotalUncompressedBytes: DEFAULT_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES,
    maxCompressionRatio: DEFAULT_ZIP_MAX_COMPRESSION_RATIO
  }, resolvedDependencies.zipLimits || {});

  async function extractArchive(file, extractionDir, archiveType) {
    const resolvedExtractionDir = path.resolve(extractionDir);

    await resolvedEnsureDir(resolvedExtractionDir);

    if (archiveType === 'zip') {
      let entryCount = 0;
      let totalUncompressed = 0;

      return resolvedExtractZip(file, {
        dir: resolvedExtractionDir,
        onEntry: function (entry) {
          entryCount += 1;
          if (entryCount > resolvedZipLimits.maxEntries) {
            throw new ExtractionError(ERROR_MESSAGE_ZIP_ENTRY_LIMIT_EXCEEDED, 413);
          }

          const entryUncompressedSize = Number(entry.uncompressedSize) || 0;
          const entryCompressedSize = Number(entry.compressedSize) || 0;

          totalUncompressed += entryUncompressedSize;
          if (totalUncompressed > resolvedZipLimits.maxTotalUncompressedBytes) {
            throw new ExtractionError(ERROR_MESSAGE_ZIP_TOTAL_SIZE_LIMIT_EXCEEDED, 413);
          }

          if (entryCompressedSize > 0 && entryUncompressedSize > 0) {
            const ratio = entryUncompressedSize / entryCompressedSize;
            if (ratio > resolvedZipLimits.maxCompressionRatio) {
              throw new ExtractionError(ERROR_MESSAGE_ZIP_COMPRESSION_RATIO_LIMIT_EXCEEDED, 413);
            }
          }
        }
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

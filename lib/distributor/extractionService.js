import fs from 'fs';
import os from 'os';
import path from 'path';
import StreamZip from 'node-stream-zip';
import * as tar from 'tar';

async function extractZip(file, options) {
  const zip = new StreamZip.async({ file: file });
  try {
    const entries = await zip.entries();
    if (options.onEntry) {
      for (const entry of Object.values(entries)) {
        const adaptedEntry = Object.assign({}, entry, {
          uncompressedSize: entry.size
        });
        options.onEntry(adaptedEntry);
      }
    }

    const targetDir = path.resolve(options.dir);
    for (const entry of Object.values(entries)) {
      const entryPath = path.resolve(targetDir, entry.name);
      if (!entryPath.startsWith(targetDir + path.sep)) {
        throw new Error(`Out of bound path "${entryPath}" found while processing file ${entry.name}`);
      }
    }

    await zip.extract(null, options.dir);
  } finally {
    await zip.close();
  }
}

import { ExtractionError } from '../error/errors.js';

const
  DEFAULT_EXTRACTION_DIR = 'mongodb-download',
  DEFAULT_ZIP_MAX_ENTRIES = 20000,
  DEFAULT_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = 8 * 1024 * 1024 * 1024,
  DEFAULT_ZIP_MAX_COMPRESSION_RATIO = 200,
  DEFAULT_TAR_MAX_ENTRIES = 20000,
  DEFAULT_TAR_MAX_TOTAL_UNCOMPRESSED_BYTES = 8 * 1024 * 1024 * 1024,
  DEFAULT_TAR_MAX_DECOMPRESSION_RATIO = 200,
  ERROR_MESSAGE_NO_FILE_FOR_EXTRACTION = 'missing file for extraction',
  ERROR_MESSAGE_NO_VERSION_FOR_EXTRACTION = 'missing version for extraction',
  ERROR_MESSAGE_TAR_ENTRY_LIMIT_EXCEEDED = 'tar extraction limits exceeded: too many entries',
  ERROR_MESSAGE_TAR_TOTAL_SIZE_LIMIT_EXCEEDED = 'tar extraction limits exceeded: total uncompressed size',
  ERROR_MESSAGE_ZIP_ENTRY_LIMIT_EXCEEDED = 'zip extraction limits exceeded: too many entries',
  ERROR_MESSAGE_ZIP_TOTAL_SIZE_LIMIT_EXCEEDED = 'zip extraction limits exceeded: total uncompressed size',
  ERROR_MESSAGE_ZIP_COMPRESSION_RATIO_LIMIT_EXCEEDED = 'zip extraction limits exceeded: compression ratio',
  ERROR_MESSAGE_UNPROCESSABLE_ARCH_TYPE = 'invalid arch type';

function isNilOrEmptyString(variable) {
  return variable == null || (typeof variable === 'string' && variable.length === 0);
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function normalizeExtractionRoot(resolvedFs, resolvedPath, extractionDir) {
  const resolvedExtractionDir = resolvedPath.resolve(extractionDir);
  const entries = await resolvedFs.promises.readdir(resolvedExtractionDir, {
    withFileTypes: true
  });

  if (entries.some(function (entry) {
    return entry.name === 'bin';
  })) {
    return resolvedExtractionDir;
  }

  const directories = entries.filter(function (entry) {
    return entry.isDirectory();
  });

  if (directories.length !== 1) {
    return resolvedExtractionDir;
  }

  const nestedRoot = resolvedPath.join(resolvedExtractionDir, directories[0].name);
  const nestedEntries = await resolvedFs.promises.readdir(nestedRoot, {
    withFileTypes: true
  });

  if (nestedEntries.some(function (entry) {
    return entry.name === 'bin';
  })) {
    return nestedRoot;
  }

  return resolvedExtractionDir;
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
  const resolvedFs = resolvedDependencies.fs || fs;
  const resolvedPath = resolvedDependencies.path || path;
  const resolvedEnsureDir = resolvedDependencies.ensureDir || ensureDir;
  const resolvedNormalizeExtractionRoot = resolvedDependencies.normalizeExtractionRoot || normalizeExtractionRoot;
  const resolvedZipLimits = Object.assign({
    maxEntries: DEFAULT_ZIP_MAX_ENTRIES,
    maxTotalUncompressedBytes: DEFAULT_ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES,
    maxCompressionRatio: DEFAULT_ZIP_MAX_COMPRESSION_RATIO
  }, resolvedDependencies.zipLimits || {});
  const resolvedTarLimits = Object.assign({
    maxEntries: DEFAULT_TAR_MAX_ENTRIES,
    maxTotalUncompressedBytes: DEFAULT_TAR_MAX_TOTAL_UNCOMPRESSED_BYTES,
    maxDecompressionRatio: DEFAULT_TAR_MAX_DECOMPRESSION_RATIO
  }, resolvedDependencies.tarLimits || {});

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

    let entryCount = 0;
    let totalUncompressed = 0;

    return resolvedTar.x({
      file: file,
      cwd: resolvedExtractionDir,
      strip: 1,
      gzip: archiveType === 'targz',
      preservePaths: false,
      filter: isSafeTarEntry,
      maxDecompressionRatio: resolvedTarLimits.maxDecompressionRatio,
      onReadEntry: function (entry) {
        entryCount += 1;
        if (entryCount > resolvedTarLimits.maxEntries) {
          throw new ExtractionError(ERROR_MESSAGE_TAR_ENTRY_LIMIT_EXCEEDED, 413);
        }

        totalUncompressed += Number(entry && entry.size) || 0;
        if (totalUncompressed > resolvedTarLimits.maxTotalUncompressedBytes) {
          throw new ExtractionError(ERROR_MESSAGE_TAR_TOTAL_SIZE_LIMIT_EXCEEDED, 413);
        }
      }
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

    return resolvedNormalizeExtractionRoot(resolvedFs, resolvedPath, extractionDir);
  }

  return {
    extract: extract
  };
}

const extractionService = createExtractionService();

export { createExtractionService };
export default extractionService;

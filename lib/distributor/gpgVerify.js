import fs from 'fs';
import path from 'path';
import https from 'https';

import * as openpgp from 'openpgp';

const KEY_SERVER_BASE = 'https://pgp.mongodb.com';

const BUNDLED_KEYS = {
  '8.0': 'server-8.0.asc',
  '7.0': 'server-7.0.asc',
  '6.0': 'server-6.0.asc',
  '5.0': 'server-5.0.asc',
  '4.4': 'server-4.4.asc'
};

const keyCache = new Map();

function getKeyFileForVersion(version) {
  const parts = version.split('.');
  const major = parseInt(parts[0], 10);
  const minor = parts[1] ? parseInt(parts[1], 10) : 0;

  if (major >= 5) {
    return BUNDLED_KEYS[`${major}.0`] || BUNDLED_KEYS[`${major}.${minor}`];
  }

  if (major === 4) {
    return BUNDLED_KEYS[`${major}.${minor}`];
  }

  return null;
}

function getKeyUrl(version) {
  const parts = version.split('.');
  const major = parseInt(parts[0], 10);
  const minor = parts[1] ? parseInt(parts[1], 10) : 0;

  if (major >= 5) {
    return `${KEY_SERVER_BASE}/server-${major}.0.asc`;
  }

  if (major === 4) {
    return `${KEY_SERVER_BASE}/server-${major}.${minor}.asc`;
  }

  return null;
}

async function fetchKeyFromServer(keyUrl) {
  return new Promise((resolve, reject) => {
    const request = https.get(keyUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch GPG key: HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout fetching GPG key'));
    });
  });
}

async function readBundledKey(keyFile) {
  const keyPath = path.resolve(path.dirname(''), 'lib/keys', keyFile);
  return fs.promises.readFile(keyPath, 'utf8');
}

async function getPublicKey(version) {
  const cacheKey = version.split('.').slice(0, 2).join('.');

  if (keyCache.has(cacheKey)) {
    return keyCache.get(cacheKey);
  }

  const keyFile = getKeyFileForVersion(version);
  let keyArmored;

  if (keyFile) {
    try {
      keyArmored = await readBundledKey(keyFile);
    } catch (_err) {
      // Fall through to fetch from server
    }
  }

  if (!keyArmored) {
    const keyUrl = getKeyUrl(version);
    if (!keyUrl) {
      throw new Error(`No GPG key available for MongoDB version ${version}`);
    }
    keyArmored = await fetchKeyFromServer(keyUrl);
  }

  const key = await openpgp.readKey({ armoredKey: keyArmored });
  keyCache.set(cacheKey, key);
  return key;
}

async function downloadSignatureFile(signatureUrl, httpOptions) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(signatureUrl);
    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': 'nems/GPG' },
      ...httpOptions
    };

    const request = https.request(options, (response) => {
      if (response.statusCode === 404) {
        reject(new Error('SIGNATURE_NOT_FOUND'));
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download signature: HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Timeout downloading signature file'));
    });

    request.end();
  });
}

export async function verifySignature(filePath, version, httpOptions) {
  const signatureUrl = `${filePath}.sig`;

  let signatureArmored;
  try {
    signatureArmored = await downloadSignatureFile(signatureUrl, httpOptions);
  } catch (err) {
    if (err.message === 'SIGNATURE_NOT_FOUND') {
      throw new Error(`GPG signature file not found for ${filePath}.sig`);
    }
    throw err;
  }

  const publicKey = await getPublicKey(version);

  const message = await openpgp.createMessage({
    binary: fs.createReadStream(filePath)
  });

  const signature = await openpgp.readSignature({
    armoredSignature: signatureArmored
  });

  const verificationResult = await openpgp.verify({
    message,
    signature,
    verificationKeys: publicKey
  });

  const { verified } = verificationResult.signatures[0];
  await verified;

  return true;
}

export function getSignatureUrl(downloadUrl) {
  return `${downloadUrl}.sig`;
}

export function clearKeyCache() {
  keyCache.clear();
}

export { BUNDLED_KEYS, getKeyFileForVersion, getKeyUrl };
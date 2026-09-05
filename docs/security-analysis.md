# Security Analysis Summary

**Last Updated**: 2026-09-05

## Positive Security Practices

The project has several good security measures already in place:

1. **Path traversal protection** in `extractionService.js` (lines 22-25) - checks that extracted paths stay within the target directory
2. **Archive bomb protection** - limits on entries (20,000), total uncompressed size (8GB), and compression ratio (200x)
3. **Symlink filtering** in tar extraction (`isSafeTarEntry` function, line 95-97)
4. **SHA256 checksum verification** for downloaded MongoDB archives (enabled by default)
5. **Download size limits** and timeout protections
6. **Redirect limits** (max 5) to prevent redirect loops

## Potential Vulnerabilities & Concerns

### 1. ~~Dependency Version Audit~~ ✅ RESOLVED

**Status**: Verified clean - `npm audit` returns 0 vulnerabilities (135 dependencies checked).

The dependencies are:
- `getos: ^3.2.1`
- `node-stream-zip: ^1.16.0`
- `tar: ^7.5.20`

The `overrides` section shows patched transitive dependencies (`async`, `brace-expansion`, `graceful-fs`, `js-yaml`, `lodash`, `minimatch`), demonstrating awareness of past vulnerabilities.

### 2. Executable Download Without Signature Verification

The code downloads MongoDB binaries from `fastdl.mongodb.org` and verifies SHA256 checksums. However:
- Checksums are fetched from the same server as the binary (not a separate signing key infrastructure)
- If an attacker compromised the MongoDB download server, they could replace both the binary and checksum

**Status**: Research completed on 2026-09-05.

MongoDB provides GPG signatures for all releases:
- Signature files available at `{download_url}.sig`
- Version-specific public keys at `https://pgp.mongodb.com/server-{major}.{minor}.asc`
- Example: MongoDB 8.0.9 uses `server-8.0.asc` key

**Implementation recommendation**:
- Use `openpgp` npm package (LGPL-3.0+, pure JavaScript, actively maintained)
- Bundle known-good public keys for supported MongoDB versions (8.0, 7.0, 6.0, etc.)
- Fetch keys from `pgp.mongodb.com` as fallback for newer versions
- Add as additional verification layer alongside SHA256 (defense in depth)
- Make opt-in via `verify_signature: 'gpg'` option initially

See implementation details in `docs/tasks/gpg-verification-plan.md`.

### 3. Command Execution via `spawn`

The `mongoService.js` spawns `mongod` with user-provided arguments:
```javascript
args.push('--port', String(port));
args.push('--dbpath', mongoRuntimePaths.resolvedDbPath);
```

The code properly uses `spawn` with an argument array (not shell interpolation), which prevents shell injection. However:
- Port is converted to string without strict validation (only MongoDB's own error handling catches bad ports)
- Paths are used directly without sanitization

**Current risk**: Low - the `spawn` usage is safe from shell injection. But if this library were used in a context where untrusted input reaches `version`, `binPath`, or `dbPath` parameters, it could lead to unexpected behavior.

### 4. ~~No Input Validation for Version String~~ ✅ RESOLVED

**Status**: Version validation added in `mongodbDownload.js` (lines 17-23).

The version string is now validated against the regex `/^\d+\.\d+\.\d+$/` before URL construction. Invalid formats like `6.0`, `v6.0.8`, `../malicious`, or `6.0.8-rc0` are rejected with a clear error message.

```javascript
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

function validateVersion(version) {
  if (!VERSION_REGEX.test(version)) {
    throw new Error(ERROR_MESSAGE_INVALID_VERSION);
  }
}
```

### 5. Temporary File Handling

Downloads write to `${tmpdir}/mongodb-download/${filename}.in_progress` before renaming. This is reasonably secure, but:
- No explicit file permission restrictions
- Could be vulnerable to race conditions on shared systems

## Recommendations Summary

| Recommendation | Status | Notes |
|----------------|--------|-------|
| Run `npm audit` locally | ✅ Done | 0 vulnerabilities found |
| Add version string validation | ✅ Done | Regex: `/^\d+\.\d+\.\d+$/` in `mongodbDownload.js` |
| Consider GPG signature verification | ⚠️ Open | Architectural consideration |
| Document security assumptions | ✅ Done | Added Security section to README.md |

## Overall Assessment

The codebase demonstrates security-conscious design. Both the dependency audit and version validation concerns are now resolved. The main remaining items are:
1. GPG verification (architectural consideration)
2. Enhanced security documentation for library consumers

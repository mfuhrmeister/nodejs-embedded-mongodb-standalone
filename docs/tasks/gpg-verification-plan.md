# GPG Signature Verification Implementation Plan

**Created**: 2026-09-05

## Overview

This document outlines the implementation plan for adding GPG signature verification to MongoDB downloads, addressing the security concern that SHA256 checksums are fetched from the same server as the binaries.

## MongoDB GPG Infrastructure

### Signature Files
- **URL pattern**: `{download_url}.sig`
- **Example**: `https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-8.0.9.tgz.sig`
- **Format**: Detached PGP signature (ASCII-armored or binary)

### Public Keys
- **Key server**: `https://pgp.mongodb.com/`
- **Naming convention**: `server-{major}.{minor}.asc`
- **Examples**:
  - MongoDB 8.x: `server-8.0.asc`
  - MongoDB 7.x: `server-7.0.asc`
  - MongoDB 6.x: `server-6.0.asc`
  - MongoDB 5.x: `server-5.0.asc`
  - MongoDB 4.4: `server-4.4.asc`

### Key Mapping Logic
```javascript
function getKeyFileForVersion(version) {
  const parts = version.split('.');
  const major = parseInt(parts[0], 10);
  
  // MongoDB 8.x and 7.x use their respective major.0 keys
  if (major >= 7) {
    return `server-${major}.0.asc`;
  }
  
  // MongoDB 6.x, 5.x use major.0 keys
  if (major >= 5) {
    return `server-${major}.0.asc`;
  }
  
  // MongoDB 4.x uses specific minor versions
  return `server-${major}.${parts[1] || '0'}.asc`;
}
```

## Implementation Approach

### 1. Dependencies

Add `openpgp` as a dependency:
```bash
npm install openpgp
```

**Why `openpgp`**:
- Pure JavaScript (no native dependencies)
- Works in Node.js 18+ without system GPG
- Actively maintained (626k weekly downloads)
- LGPL-3.0+ license (compatible as a dependency)
- Two security audits completed

### 2. Key Management Strategy

**Hybrid approach**: Bundle known keys + fetch fallback

#### Bundled Keys (Phase 1)
Store public keys in `lib/keys/`:
```
lib/keys/
  server-8.0.asc
  server-7.0.asc
  server-6.0.asc
  server-5.0.asc
  server-4.4.asc
```

**Rationale**:
- Works offline for supported versions
- No network dependency at verification time
- ~10KB total storage

#### Fetch Fallback (Phase 1)
If version not in bundle:
1. Fetch from `https://pgp.mongodb.com/server-{major}.{minor}.asc`
2. Cache in memory for process lifetime
3. Throw clear error if fetch fails

### 3. API Design

#### Low-level API (`mongodbDownload.js`)
```javascript
mongodbDownload({
  version: '8.0.9',
  download_dir: '.',
  verify_checksum: true,      // existing: SHA256 verification (default: true)
  verify_signature: 'gpg'     // new: false | 'gpg' | 'both' (default: false)
})
```

#### High-level API (`nems.js`)
```javascript
// Future: could add convenience option
nems.download('8.0.9', '.', { verify: 'both' })  // 'sha256' | 'gpg' | 'both' | false
```

### 4. Implementation Files

#### New Files
- `lib/distributor/gpgVerify.js` - GPG verification logic
- `lib/keys/*.asc` - Bundled public keys

#### Modified Files
- `lib/distributor/mongodbDownload.js` - Integrate GPG verification
- `lib/error/errors.js` - Add `SignatureError` type
- `test/unit/distributor/gpgVerifySpec.js` - Unit tests

### 5. Error Handling

| Scenario | Behavior |
|----------|----------|
| Signature file missing (404) | When `verify_signature: 'gpg'`: throw error, delete downloaded file |
| Signature verification fails | Throw `SignatureError`, delete downloaded file |
| Key not found for version | Fetch from `pgp.mongodb.com`; if fails, throw with guidance |
| Network error fetching key | Use bundled key if available; otherwise throw |
| `verify_signature: false` | Skip GPG verification (current behavior) |

### 6. Verification Flow

```
Download archive → Download .sig file → Get public key → Verify signature → Verify SHA256 → Return file
                        ↓                        ↓
                    (if missing)           (bundled or fetch)
                        ↓                        ↓
                  Throw error           Cache for reuse
```

### 7. Security Considerations

#### Why Both SHA256 and GPG?
- **SHA256**: Catches corruption, fast, always available
- **GPG**: Proves authenticity (signed by MongoDB), catches tampering
- **Defense in depth**: Two independent verification layers

#### Key Trust
- Bundled keys are trusted if package integrity is verified (`npm audit`, lockfile)
- Fetched keys use HTTPS but could be MITM'd (mitigated by preferring bundled keys)

#### Signature File Availability
- All modern MongoDB releases have `.sig` files
- Older releases (pre-4.0) may not have signatures
- Behavior: fail closed when GPG verification is requested but signature unavailable

### 8. Implementation Phases

#### Phase 1: Core Implementation
- [ ] Add `openpgp` dependency
- [ ] Create `lib/keys/` with bundled public keys
- [ ] Implement `lib/distributor/gpgVerify.js`
- [ ] Add `SignatureError` error type
- [ ] Integrate into `mongodbDownload.js`
- [ ] Unit tests with test fixtures

#### Phase 2: Testing & Documentation
- [ ] Integration tests with real MongoDB releases
- [ ] Update README.md with `verify_signature` option
- [ ] Update security-analysis.md

#### Phase 3: Opt-in Rollout
- [ ] Release with `verify_signature: false` default
- [ ] Gather feedback from early adopters
- [ ] Monitor for edge cases (missing .sig files, key rotation)

#### Phase 4: Default Enable (Future Major Version)
- [ ] Consider making `verify_signature: 'gpg'` the default
- [ ] Document migration path for users who need to opt-out

### 9. Testing Strategy

#### Unit Tests
- Verify known-good signature succeeds
- Verify corrupted file fails
- Verify wrong key fails
- Verify missing signature fails when required
- Key fetching and caching

#### Integration Tests
- Download real MongoDB 8.0.x release with GPG verification
- Download real MongoDB 7.0.x release with GPG verification
- Verify behavior when `.sig` file 404s

#### Test Fixtures
- Small test archive with known signature
- Corresponding public key
- Corrupted archive for negative test

### 10. Estimated Effort

| Task | Effort |
|------|--------|
| Add dependency + bundled keys | 1 hour |
| Implement `gpgVerify.js` | 2-3 hours |
| Integrate into download flow | 1 hour |
| Error handling + tests | 2-3 hours |
| Documentation | 1 hour |
| **Total** | **7-9 hours** |

## Decision Points

### For Immediate Implementation
1. Should GPG verification be implemented now or deferred?
2. What versions should have bundled keys? (Recommend: 4.4, 5.0, 6.0, 7.0, 8.0)
3. Should missing `.sig` files be a hard error or warn-only?

### For Future Consideration
1. Should GPG become the default in next major version?
2. Should we support custom public keys for air-gapped environments?
3. Should we expose the GPG verification as a standalone utility?

## References

- MongoDB Package Verification Docs: https://www.mongodb.com/docs/manual/tutorial/verify-mongodb-packages/
- MongoDB PGP Keys: https://pgp.mongodb.com/
- `openpgp` npm package: https://www.npmjs.com/package/openpgp
- `openpgp` documentation: https://openpgpjs.org/

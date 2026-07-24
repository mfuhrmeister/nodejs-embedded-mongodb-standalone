# 2026 Best Practices Backlog

## Goal

Improve maintainability, runtime hardening, performance, and release confidence for `nems` without changing its core purpose: download, extract, and run a standalone MongoDB instance for tests.

## Priority 1: Runtime Hardening

- [x] Replace shell-based `child_process.exec(...)` usage with `spawn(...)` or `execFile(...)` plus explicit argv arrays in `lib/process/mongoService.js`
- [x] Stop building `mongod` commands through string concatenation in `lib/process/mongoService.js`
- [x] Add startup and shutdown timeouts in `lib/process/mongoService.js` so hung processes fail deterministically
- [x] Clean up `stdout` and `stderr` listeners after resolve or reject in `lib/process/mongoService.js`
- [x] Keep PID-file shutdown as the primary path, but make fallback shutdown behavior explicit and bounded in `lib/process/mongoService.js`
- [x] Add tests for paths containing quotes or shell metacharacters in `test/unit/process/mongoServiceSpec.js`

## Priority 2: Download And Extraction Security

- [x] Add checksum verification for downloaded MongoDB archives in `lib/distributer/mongodbDownload.js`
- [x] Enforce a redirect limit in `lib/distributer/mongodbDownload.js`
- [x] Add request timeouts and clearer network failure handling in `lib/distributer/mongodbDownload.js`
- [x] Reject oversized downloads using `content-length` when available in `lib/distributer/mongodbDownload.js`
- [x] Remove partial `.in_progress` files on every failure path in `lib/distributer/mongodbDownload.js`
- [x] Add bounded extraction safeguards for zip archives in `lib/distributer/extractionService.js`
- [x] Evaluate decompression ratio, total extracted size, and entry-count limits for both tar and zip flows in `lib/distributer/extractionService.js`
- [x] Add security-focused tests for malformed, oversized, or hostile archive inputs in `test/unit/distributer/extractionServiceSpec.js`

## Priority 3: Safe Defaults

- [ ] Remove MongoDB `2.4.9` as the default version for non-macOS-arm64 CLI flows in `bin/start.js` and `bin/dax.js`
- [ ] Decide whether the default version should be a supported MongoDB LTS or whether version input should become mandatory
- [ ] Centralize default version logic in a shared helper instead of duplicating it in `bin/start.js` and `bin/dax.js`
- [ ] Make debug logging opt-in instead of forcing `process.env.DEBUG = '*'` in `bin/start.js` and `bin/dax.js`
- [ ] Normalize CLI error output so all entrypoints log consistently and predictably across `bin/start.js`, `bin/dax.js`, and `bin/stop.js`
- [ ] Update `README.md` after any default-version or CLI-behavior change

## Priority 4: Test And CI Confidence

- [ ] Re-enable or replace the skipped functional suite in `test/functional/nemsSpec.js`
- [ ] Add at least one CI-executed smoke path for download, extract, start, and stop behavior
- [ ] Switch CircleCI from `npm install` to `npm ci` in `.circleci/config.yml`
- [ ] Add a Node version matrix that covers Node 18 and the current LTS line in `.circleci/config.yml`
- [ ] Add coverage reporting and a minimum threshold for critical modules
- [ ] Add an audit or dependency-health step in CI for production dependencies
- [ ] Decide whether stale committed audit artifacts such as `audit-current.json` and `npm-audit.json` should be regenerated automatically or removed from source control

## Priority 5: Package And Tooling Modernization

- [ ] Add an `exports` map in `package.json` to define the supported public entrypoints explicitly
- [ ] Decide whether the scripts in `bin/` should be published as package binaries via the `bin` field in `package.json`
- [ ] Expand the lint script in `package.json` to include `bin/**/*.js`
- [ ] Re-enable `no-unused-vars` in `eslint.config.cjs` with targeted ignore patterns instead of disabling it globally
- [ ] Add `packageManager` metadata to `package.json`
- [ ] Add `.nvmrc` or `.node-version` to make local toolchain selection less ambiguous
- [ ] Add Renovate or Dependabot configuration for automated dependency maintenance

## Priority 6: Code Maintainability

- [ ] Rename `lib/distributer` to `lib/distributor` only if the compatibility impact is acceptable and imports can be updated safely
- [ ] Simplify `errorHandler` so typed-error detection does not depend on a truthy `predicate` property in `lib/error/errorHandler.js`
- [ ] Consider introducing stable error codes or stronger typed error checks in `lib/error/errors.js` and `lib/error/errorHandler.js`
- [ ] Remove duplicated PID helper logic inside `lib/process/mongoService.js`
- [ ] Replace the custom recursive directory helper with native recursive `mkdir` usage in `lib/distributer/extractionService.js`
- [ ] Consider using `path.join(...)` instead of string concatenation for `bin` path creation in `lib/nems.js`

## Suggested Execution Order

1. Harden `mongoService` process execution and timeouts
2. Add download integrity and cleanup safeguards
3. Fix obsolete defaults and debug behavior
4. Restore meaningful functional coverage and improve CI
5. Tighten package metadata and lint rules
6. Clean up lower-risk maintainability issues

## Notes

- For each Priority task list, create a separate branch.
- Current `npm run build` passes, but the functional suite is still skipped, so build success does not yet prove operational end-to-end behavior.
- Current `npm audit --omit=dev` reports zero production vulnerabilities, so the highest-value security work is runtime hardening rather than emergency dependency patching.
- Keep changes incremental and testable; the highest-risk files are `lib/process/mongoService.js`, `lib/distributer/mongodbDownload.js`, and `lib/distributer/extractionService.js`.
- After finishing each Priority task list, evaluate what release type (patch/minor/major) is appropriate.
- After finishing each Priority task list, give a command list for releasing on github and npmjs.org.

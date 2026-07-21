# Tasks

## Current Focus

- [x] Remove `ramda` by replacing the remaining usage in `lib/distributer/extractionService.js`
- [x] Remove `fs-extra` from `test/testUtil.js` and switch to Node built-in `fs`
- [x] Remove `sprintf-js` and replace formatting with template literals
- [x] Replace deprecated `npmlog` with a minimal local logger and keep CLI output simple
- [ ] Keep `getos` for now unless Linux distro detection is redesigned
- [x] Replace Gulp-based `build` and `test` orchestration with npm and Node scripts

## Modernization

- [x] Replace remaining `var` declarations with `const` and `let` where appropriate
- [x] Simplify small helper functions with modern JavaScript syntax where it improves readability
- [ ] Keep the project in CommonJS unless there is a strong reason to migrate to ESM
- [x] Evaluate whether Gulp can be replaced with plain npm scripts or small Node-based task runners
- [x] Remove the remaining Gulp-specific files and dependency if they are no longer needed

## ESM Migration Steps

### Phase 1: Testing And Seams

- [ ] Decide whether ESM is still worth the migration cost compared to keeping CommonJS
- [ ] Keep Jasmine unless there is a strong reason to migrate the test runner separately
- [ ] Remove `rewire`-style testing from the unit suite before changing module format
- [x] Refactor `lib/nems.js` to use explicit dependency seams instead of test-time module replacement
- [ ] Refactor `lib/distributer/extractionService.js` to expose testable seams without private module patching
- [ ] Refactor `lib/distributer/mongodbDownload.js` to expose pure helpers directly and inject I/O dependencies for download behavior
- [ ] Refactor `lib/process/mongoService.js` to use injected dependencies and instance-based state instead of patched module internals
- [ ] Update unit tests to stop using `rewire`, `__set__`, and `__get__`

### Phase 2: Module Conversion

- [ ] Decide whether to use package-wide `"type": "module"` or a narrower `.mjs` migration strategy
- [ ] Convert `require(...)` and `module.exports` usage to `import` and `export`
- [ ] Replace `__dirname` and `__filename` usage in scripts with `import.meta.url` equivalents where needed
- [ ] Update CLI entrypoints under `bin/` for ESM-compatible imports and execution
- [ ] Update helper scripts under `scripts/` for ESM-compatible path handling and imports

### Phase 3: Verification And Docs

- [ ] Re-run `npm test`, `npm run build`, `npm run dax`, `npm run start`, and `npm run stop` after the migration
- [ ] Update `README.md` and release notes if module system behavior changes for users

## Process

- [ ] Keep each cleanup as a separate commit
- [ ] Run targeted tests after each dependency removal
- [ ] Run lint and diagnostics after each code change
- [ ] Update `README.md` if user-facing behavior changes

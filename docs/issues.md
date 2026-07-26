# Issue tasks tracker

## Open Github Issues

### Issue #6: Cross Platform Shutdown Feature

- [ ] Review the current shutdown flow in `lib/process/mongoService.js` and document which parts are Linux-specific today.
- [ ] Define the supported shutdown behavior for macOS and Windows, including whether PID-file shutdown, signal-based shutdown, and `mongod --shutdown` should be preferred or avoided per platform.
- [ ] Refactor `mongoService.stop()` to choose a platform-appropriate shutdown strategy without regressing the current Linux behavior.
- [ ] Add unit coverage in `test/unit/process/mongoServiceSpec.js` for the platform-specific shutdown branches and failure modes.
- [ ] Add or extend a functional validation path that proves shutdown works on non-Linux platforms where CI or local verification is feasible.
- [ ] Update `README.md` and the CLI usage notes in `bin/stop.js` if shutdown expectations or platform support become more explicit.
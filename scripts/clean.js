'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve(__dirname, '..', 'target');

fs.rmSync(TARGET_DIR, { recursive: true, force: true });

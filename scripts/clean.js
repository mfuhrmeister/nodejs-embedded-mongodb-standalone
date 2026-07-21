import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(currentDir, '..', 'target');

fs.rmSync(TARGET_DIR, { recursive: true, force: true });

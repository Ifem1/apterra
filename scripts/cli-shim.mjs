import fs from 'node:fs';
const originalChmod = fs.chmodSync;
fs.chmodSync = (...args) => {
  try { return originalChmod(...args); } catch (error) {
    if (error?.code !== 'EPERM') throw error;
  }
};
await import('../node_modules/genlayer/dist/index.js');

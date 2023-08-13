/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');
module.exports = async function () {
  // close the browser instance
  await globalThis.__BROWSER_GLOBAL__.close();

  // clean-up the wsEndpoint file
  await fs.rm(DIR, { force: true, recursive: true });
};

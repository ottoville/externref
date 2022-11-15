/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
const {mkdir, writeFile} = require('fs').promises;
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

module.exports = async function () {
  const browser = await puppeteer.launch({
    product: 'chrome',
    channel: 'chrome-canary',
    executablePath: "C:/Users/lamminpa/AppData/Local/Google/Chrome SxS/Application/chrome.exe",
    headless:false,
    args: [
    "--remote-debugging-port=9222",
    "--enable-unsafe-webgpu",
    "--enable-features=SharedArrayBuffer",
]});
  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  globalThis.__BROWSER_GLOBAL__ = browser;

  // use the file system to expose the wsEndpoint for TestEnvironments
  await mkdir(DIR, {recursive: true});
  await writeFile(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
};
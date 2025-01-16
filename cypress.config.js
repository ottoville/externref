/* eslint-disable sort-keys */
import { defineConfig } from 'cypress';
import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';

// eslint-disable-next-line import/no-unused-modules
export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      //Visual testing
      initPlugin(on, config);

      // implement node event listeners here
      on(
        'before:browser:launch',
        (
          browser = {
            name: '',
            family: 'chromium',
            channel: '',
            displayName: '',
            version: '',
            majorVersion: '',
            path: '',
            isHeaded: false,
            isHeadless: false,
          },
          launchOptions,
        ) => {
          // `args` is an array of all the arguments that will
          // be passed to browsers when it launches
          console.log(launchOptions.args); // print all current args

          if (browser.family === 'chromium' && browser.name !== 'electron') {
            // Enable shared array buffer
            launchOptions.args.push('--enable-features=SharedArrayBuffer');
            launchOptions.args.push('--force-device-scale-factor=1')

          }

          // whatever you return here becomes the launchOptions
          return launchOptions;
        },
      );
    },
  },
});

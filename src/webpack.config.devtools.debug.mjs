// eslint-disable-next-line import/extensions
import debugConfig from './webpack.config.devtools.mjs';

debugConfig.module.rules.push({
  enforce: 'pre',
  test: /\.js$/,
  use: ['source-map-loader'],
});
export default debugConfig;

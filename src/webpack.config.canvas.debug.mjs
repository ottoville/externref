// eslint-disable-next-line import/extensions
import canvasConfig from './webpack.config.canvas.mjs';

canvasConfig.module.rules.push({
  enforce: 'pre',
  test: /\.js$/,
  use: ['source-map-loader'],
});
export default canvasConfig;

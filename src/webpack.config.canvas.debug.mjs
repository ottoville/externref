// eslint-disable-next-line import/extensions
import canvasConfig from './webpack.config.canvas.mjs';

canvasConfig.module.rules.push({
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
});
export default canvasConfig;
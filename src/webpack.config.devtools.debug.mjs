// eslint-disable-next-line import/extensions
import debugConfig from './webpack.config.devtools.mjs';

debugConfig.module.rules.push({
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
});
export default debugConfig;
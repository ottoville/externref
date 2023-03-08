const path = require('path');

module.exports = {
    mode: 'development',
    entry: './ui/DevTools.ts',
    experiments: {
        outputModule: true,
    },
    output: {
        library: {
            type: 'module',
        },
        path: path.resolve(__dirname, '../wwwroot/js/'),
        filename: 'devTools.bundle.js',
    },
    module: {
        rules: [{ test: /\.ts$/, use: 'ts-loader' },],
    },

};
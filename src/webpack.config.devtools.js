const path = require('path');

module.exports = {
    mode: 'development',
    entry: './ui/DevTools.tsx',
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
        rules: [{ test: /\.ts|tsx$/, use: 'ts-loader' },],
    },
    resolve: {
        extensionAlias: {
            '.js': ['.ts', '.js'],
            '.mjs': ['.mts', '.mjs'],
        },
        alias: {
            "/DevTools.bundle.js": path.resolve(__dirname, "./ui/DevTools.tsx")
        }
    },

};
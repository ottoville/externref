const path = require('path');

module.exports = {
    mode: 'development',
    entry: './ui/DevTools/DevToolsApp.tsx',
    experiments: {
        outputModule: true,
    },
    output: {
        library: {
            type: 'module',
        },
        path: path.resolve(__dirname, '../wwwroot/js/ui/DevTools/'),
        filename: 'DevToolsApp.js',
    },
    module: {
        rules: [{ test: /\.ts|tsx$/, use: 'ts-loader' },],
    },
    resolve: {
        extensionAlias: {
            '.js': ['.ts', '.js'],
            '.mjs': ['.mts', '.mjs'],
        }
    },
};
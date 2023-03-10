import * as path from 'path';

export default {
    mode: 'development',
    entry: './ui/DevTools/DevToolsApp.tsx',
    experiments: {
        outputModule: true,
    },
    output: {
        library: {
            type: 'module',
        },
        path: path.resolve('../wwwroot/js/ui/DevTools/'),
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
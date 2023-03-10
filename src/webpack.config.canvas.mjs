import * as path from 'path';

export default {
    mode: 'development',
    entry: './bundled.ts',
    experiments: {
        outputModule: true,
    },
    output: {
        library: {
            type: 'module',
        },
        path: path.resolve('../wwwroot/js/'),
        filename: 'bundled.js',
    },
    module: {
        rules: [{ test: /\.ts$/, use: 'ts-loader' },],
    },
    resolve: {
        extensionAlias: {
            '.js': ['.ts', '.js'],
            '.mjs': ['.mts', '.mjs'],
        }
    },
};
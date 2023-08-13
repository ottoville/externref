import * as path from 'path';

export default {
  entry: './bundled.ts',
  experiments: {
    outputModule: true,
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
    ],
  },
  output: {
    filename: 'bundled.js',
    library: {
      type: 'module',
    },
    path: path.resolve('../wwwroot/js/'),
  },
  resolve: {
    extensionAlias: {
      '.js': ['.ts', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
  },
};

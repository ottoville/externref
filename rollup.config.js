import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: './src/bundled.ts',
  output: {
    dir: 'wwwroot/js',
    format: 'es'
  },
  plugins: [nodeResolve()]
};
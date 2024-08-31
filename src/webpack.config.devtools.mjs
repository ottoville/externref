import * as path from 'path';

export default {
  entry: './ui/DevTools/DevToolsApp.tsx',
  experiments: {
    outputModule: true,
  },
  externals: {
    '../../GPU/Drawables/Drawable.js': '../../GPU/Drawables/Drawable.js',
    '../../GPU/Drawables/DrawableDirect.js':
      '../../GPU/Drawables/DrawableDirect.js',
    '../../GPU/Drawables/DrawableIndexed.js':
      '../../GPU/Drawables/DrawableIndexed.js',
    '../../GPU/Meshes/helpers/boundingbox.js':
      '../../GPU/Meshes/helpers/boundingbox.js',
    '../../GPU/Meshes/helpers/normals.js':
      '../../GPU/Meshes/helpers/normals.js',
    '../../GPU/Meshes/helpers/wireframe.js':
      '../../GPU/Meshes/helpers/wireframe.js',
    '../../GPU/Meshes/helpers/depthSlices.js':
      '../../GPU/Meshes/helpers/depthSlices.js',
    '../../MainNode.js': '../../MainNode.js',
    '../../Math.js': '../../Math.js',
    '../../controllers/ArcRotateCamera.js':
      '../../controllers/ArcRotateCamera.js',
    '../../controllers/PositionCamera.js':
      '../../controllers/PositionCamera.js',
    '../../nodes/BoundableNodeIndexed.js':
      '../../nodes/BoundableNodeIndexed.js',
    '../../nodes/DataNode.js': '../../nodes/DataNode.js',
    '../../RenderPipeLines/Terrain.js': '../../RenderPipeLines/Terrain.js',
    './Slider.js': './Slider.js',
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.ts|tsx$/,
        use: [
          {
            loader: 'swc-loader',
          },
        ],
      },
    ],
  },
  output: {
    filename: 'DevToolsApp.js',
    library: {
      type: 'module',
    },
    path: path.resolve('../wwwroot/js/ui/DevTools/'),
  },
  resolve: {
    extensionAlias: {
      '.js': ['.ts', '.js', '.tsx'],
      '.mjs': ['.mts', '.mjs'],
    },
  },
};

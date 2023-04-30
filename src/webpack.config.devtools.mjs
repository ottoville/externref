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
        rules: [{ test: /\.ts|tsx$/, use: 'ts-loader' }],
    },
    resolve: {
        extensionAlias: {
            '.js': ['.ts', '.js', '.tsx'],
            '.mjs': ['.mts', '.mjs'],
        }
    },
    externals: {
        '../../MainNode.js': '../../MainNode.js',
        '../../nodes/DataNode.js': '../../nodes/DataNode.js',
        '../../nodes/BoundableNodeIndexed.js': '../../nodes/BoundableNodeIndexed.js',
        '../../GPU/Drawables/DrawableDirect.js': '../../GPU/Drawables/DrawableDirect.js',
        '../../controllers/ArcRotateCamera.js': '../../controllers/ArcRotateCamera.js',
        '../../controllers/PositionCamera.js': '../../controllers/PositionCamera.js',
        '../../GPU/Meshes/helpers/wireframe.js': '../../GPU/Meshes/helpers/wireframe.js',
        '../../GPU/Meshes/helpers/normals.js': '../../GPU/Meshes/helpers/normals.js',
        '../../GPU/Meshes/helpers/boundingbox.js': '../../GPU/Meshes/helpers/boundingbox.js',
        '../../GPU/Drawables/DrawableIndexed.js': '../../GPU/Drawables/DrawableIndexed.js',
        '../../nodes/NodeIndexed.js': '../../nodes/NodeIndexed.js',
        '../../Math.js': '../../Math.js'
    },
};
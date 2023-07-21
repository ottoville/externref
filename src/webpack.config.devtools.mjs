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
        rules: [
            {
                test: /\.ts|tsx$/, use: 'ts-loader',
            }
        ],
    },
    resolve: {
        extensionAlias: {
            '.js': [
                '.ts',
                '.js',
                '.tsx'
            ],
            '.mjs': [
                '.mts',
                '.mjs'
            ],
        },
    },
    externals: {
        '../../GPU/Drawables/DrawableDirect.js': '../../GPU/Drawables/DrawableDirect.js',
        '../../GPU/Drawables/DrawableIndexed.js': '../../GPU/Drawables/DrawableIndexed.js',
        '../../GPU/Meshes/helpers/boundingbox.js': '../../GPU/Meshes/helpers/boundingbox.js',
        '../../GPU/Meshes/helpers/normals.js': '../../GPU/Meshes/helpers/normals.js',
        '../../GPU/Meshes/helpers/wireframe.js': '../../GPU/Meshes/helpers/wireframe.js',
        '../../MainNode.js': '../../MainNode.js',
        '../../Math.js': '../../Math.js',
        '../../controllers/ArcRotateCamera.js': '../../controllers/ArcRotateCamera.js',
        '../../controllers/PositionCamera.js': '../../controllers/PositionCamera.js',
        '../../nodes/BoundableNodeIndexed.js': '../../nodes/BoundableNodeIndexed.js',
        '../../nodes/DataNode.js': '../../nodes/DataNode.js',
        '../../nodes/NodeIndexed2.js': '../../nodes/NodeIndexed2.js',
    },
};
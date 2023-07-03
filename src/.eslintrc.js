/* eslint-disable sort-keys */
// eslint-disable-next-line no-undef
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',

    parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
        ecmaFeatures: {
            jsx: true, // Allows for the parsing of JSX
        },
        validate: [
            'javascript',
            'javascriptreact',
            'typescript',
            'typescriptreact'
        ],
    },
    plugins: [
        '@typescript-eslint',
        'promise',
        'import'
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
    ],
    rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-shadow': ['error'],
        '@typescript-eslint/no-explicit-any': ['error'],
        'promise/catch-or-return': 'error',
        'no-var': 'off',
        'no-cond-assign': 'off',
        'no-this-alias': 'off',
        'require-await': 2,
        'require-atomic-updates': 2,
        'no-promise-executor-return': 2,
        'no-self-compare': 2,
        'no-throw-literal': 2,
        'valid-typeof': 2,
        'import/no-cycle': [2],
        'import/extensions': 2,
        'prefer-promise-reject-errors': 2,
        'no-unused-expressions': 2,
        'no-loop-func': 2,

        // Style rules
        'array-bracket-newline': 2,
        'array-bracket-spacing': 2,
        'object-curly-spacing': [2, 'always'],
        'no-trailing-spaces': 2,
        'key-spacing': ['error', { 'afterColon': true, }],
        'indent': ['error', 4, { 'SwitchCase': 1, }],
        'sort-keys': ['error', 'asc', { 'caseSensitive': true, 'natural': false, 'minKeys': 2, }],
        'quotes': ['error', 'single'],
        'comma-dangle': [
            'error', {
                'arrays': 'never',
                'objects': 'always',
                'functions': 'never',
            }
        ],
        'function-call-argument-newline': ['error', 'always'],
        'implicit-arrow-linebreak': ['error', 'below'],
        'object-property-newline': ['error', { 'allowAllPropertiesOnSameLine': true, }],
        'object-curly-newline': [
            'error', {
                'ObjectExpression': 'always',
                'ImportDeclaration': 'never',
            }
        ],
    },
    settings: {
        'import/resolver': {
            typescript: true,
            node: true,
        },
        'import/extensions': [
            '.js',
            '.jsx',
            '.ts'
        ],
    },
};
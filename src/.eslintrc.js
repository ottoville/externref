module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',

    parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: "module", // Allows for the use of imports
        ecmaFeatures: {
            jsx: true // Allows for the parsing of JSX
        },
        validate: [
            "javascript",
            "javascriptreact",
            "typescript",
            "typescriptreact",
        ]
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "no-var": "off",

    }
};
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
        "@typescript-eslint/no-non-null-assertion": "off",
        "no-var": "off",
        "no-cond-assign": "off",
        "no-this-alias":"off",
        "require-await":2,
        "require-atomic-updates":2,
        "no-promise-executor-return":2
    }
};
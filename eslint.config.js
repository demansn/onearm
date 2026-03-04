import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    js.configs.recommended,

    // Global ignores
    {
        ignores: [
            "node_modules/**",
            "build/**",
            "dist/**",
            "coverage/**",
            "scripts/**",
            "tools/**",
            "static/**",
            "**/*.min.js",
        ],
    },

    // Main config
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
        },

        rules: {
            // Possible errors
            "no-console": "off",
            "no-debugger": "warn",
            "no-constant-condition": ["error", { checkLoops: false }],
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-loss-of-precision": "error",
            "no-promise-executor-return": "error",
            "no-template-curly-in-string": "warn",
            "no-unreachable-loop": "warn",

            // Best practices
            "curly": ["warn", "multi-line", "consistent"],
            "default-case-last": "error",
            "dot-notation": "warn",
            "eqeqeq": ["error", "smart"],
            "no-caller": "error",
            "no-eval": "error",
            "no-extend-native": "error",
            "no-extra-bind": "warn",
            "no-implied-eval": "error",
            "no-iterator": "error",
            "no-labels": "error",
            "no-lone-blocks": "warn",
            "no-new": "warn",
            "no-new-func": "error",
            "no-new-wrappers": "error",
            "no-proto": "error",
            "no-return-assign": ["error", "except-parens"],
            "no-self-compare": "error",
            "no-sequences": "error",
            "no-throw-literal": "error",
            "no-unused-expressions": ["error", {
                allowShortCircuit: true,
                allowTernary: true,
                allowTaggedTemplates: true,
            }],
            "no-useless-call": "warn",
            "no-useless-concat": "warn",
            "no-useless-return": "warn",

            // Variables
            "no-unused-vars": ["warn", {
                args: "after-used",
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
                destructuredArrayIgnorePattern: "^_",
                ignoreRestSiblings: true,
            }],
            "no-shadow": "warn",
            "no-use-before-define": ["error", {
                functions: false,
                classes: false,
                variables: true,
            }],

            // ES6+
            "no-var": "error",
            "prefer-const": ["warn", { destructuring: "all" }],
            "prefer-arrow-callback": ["warn", { allowNamedFunctions: true }],
            "prefer-rest-params": "warn",
            "prefer-spread": "warn",
            "no-useless-constructor": "warn",
            "no-useless-rename": "warn",
            "no-duplicate-imports": ["warn", { includeExports: true }],
            "object-shorthand": ["warn", "always", { avoidQuotes: true }],

            // Style (not handled by Prettier)
            "new-cap": ["warn", {
                newIsCap: true,
                capIsNew: false,
                properties: true,
            }],
            "no-lonely-if": "warn",
            "no-unneeded-ternary": "warn",
            "prefer-object-spread": "warn",
            "spaced-comment": ["warn", "always", {
                line: { markers: ["/"] },
                block: { markers: ["!"], balanced: true },
            }],
        },
    },

    // Config/script files (Node env)
    {
        files: ["scripts/**/*.js", "tools/**/*.js", "bin/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },

    // Prettier compat (must be last)
    eslintConfigPrettier,
];

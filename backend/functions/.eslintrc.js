module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    mocha: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    // Removed type-aware rules to prevent deployment issues
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"], // Single tsconfig reference
    sourceType: "module",
    tsconfigRootDir: __dirname,
    ecmaVersion: 2022,
  },
  ignorePatterns: [
    "/lib/**/*",
    "/generated/**/*",
    "*.js",
    "*.config.js",
    "**/*.d.ts", // Ignore type declaration files
  ],
  plugins: [
    "@typescript-eslint",
    "import",
    // Removed tsdoc plugin to prevent deployment errors
  ],
  rules: {
    quotes: [
      "error",
      "double",
      {
        avoidEscape: true,
        allowTemplateLiterals: true,
      },
    ],
    "import/no-unresolved": "off",
    "import/namespace": "off", // Disable problematic rule
    "import/no-duplicates": "off", // Disable problematic rule
    indent: [
      "error",
      2,
      {
        SwitchCase: 1,
        ignoredNodes: ["PropertyDefinition"],
      },
    ],
    "object-curly-spacing": ["error", "always"],
    "max-len": [
      "error",
      {
        code: 120,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off", // More flexible for Cloud Functions
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "require-jsdoc": "off",
    "eol-last": ["error", "always"],
    "comma-dangle": ["error", "only-multiline"],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: "./tsconfig.json", // Explicit project reference
      },
      node: {
        extensions: [".ts", ".tsx"],
        tryExtensions: [".ts", ".tsx", ".js", ".jsx"],
      },
    },
  },
  overrides: [
    {
      files: ["*.ts"],
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off", // For Firebase handler functions
      },
    },
  ],
};

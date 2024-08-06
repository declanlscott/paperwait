/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:drizzle/recommended",
    "prettier",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "sst-env.d.ts"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "drizzle"],
  rules: {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",

    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: { attributes: false },
      },
    ],
    // Removes eslint errors in `sst-env.d.ts`
    "@typescript-eslint/ban-tslint-comment": "off",

    "@typescript-eslint/only-throw-error": "off",
  },
};

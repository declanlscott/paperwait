/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "@paperwait/eslint-config/astro.cjs",
    "@paperwait/eslint-config/react.cjs",
  ],
  parserOptions: {
    project: true,
  },
  overrides: [
    {
      files: ["*.astro"],
      parser: "astro-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".astro"],
      },
    },
  ],
};

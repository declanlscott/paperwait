/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "./base.cjs",
    "plugin:react-hooks/recommended",
    "plugin:@tanstack/eslint-plugin-query/recommended",
  ],
  env: {
    browser: true,
    es2020: true,
  },
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": "warn",
  },
};

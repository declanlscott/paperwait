/** @type {import("@ianvs/prettier-plugin-sort-imports")} */
export default {
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
    "@pandabox/prettier-plugin",
    "prettier-plugin-astro",
  ],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
  importOrder: [
    "<BUILTIN_MODULES>",
    "",
    "^react",
    "<THIRD_PARTY_MODULES>",
    "",
    "^[~]",
    "^[.]",
    "",
    "<TYPES>",
    "<TYPES>^[~]",
    "<TYPES>^[.]",
  ],
};

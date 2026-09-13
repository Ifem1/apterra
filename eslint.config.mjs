import js from "@eslint/js";

export default [
  {
    ignores: [".next/**", "node_modules/**", "artifacts/**", ".tooling/**"],
  },
  {
    files: ["scripts/**/*.mjs"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
];

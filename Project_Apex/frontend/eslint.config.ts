import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist", "node_modules", "**/*.md", "**/*.json", "**/*.json5"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "off", // Allow empty interfaces for type extensions
      "@typescript-eslint/no-unused-expressions": "off", // Allow unused expressions in some contexts
      "@typescript-eslint/ban-ts-comment": ["error", {
        "ts-expect-error": "allow-with-description",
        "ts-ignore": true,
        "ts-nocheck": "allow-with-description",
        "minimumDescriptionLength": 3
      }],
      "no-empty": ["error", { "allowEmptyCatch": true }], // Allow empty catch blocks
      "no-case-declarations": "error",
    },
  },
];

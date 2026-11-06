import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintReact from "@eslint-react/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    ".agents/**",
    ".claude/**",
    ".codex/**",
  ]),

  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      nextPlugin.configs["core-web-vitals"],
    ],
  },

  {
    files: ["**/*.{jsx,tsx}"],
    extends: [
      eslintReact.configs["recommended-typescript"],
    ],
  },
]);
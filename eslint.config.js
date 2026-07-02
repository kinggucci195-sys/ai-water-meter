import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "release/**", "**/node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        chrome: "readonly",
        document: "readonly",
        HTMLElement: "readonly",
        Location: "readonly",
        MutationObserver: "readonly",
        window: "readonly"
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "no-undef": "off",
      "no-console": ["error", { allow: ["warn", "error"] }]
    }
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly"
      }
    },
    rules: {
      "no-console": "off"
    }
  }
);

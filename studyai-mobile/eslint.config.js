// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores  } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores([
    ".agents/",
    ".claude/",
    ".codex/",
    ".expo/",
    "dist/",
    "coverage/",
  ]),
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);

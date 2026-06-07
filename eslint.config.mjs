import pluginSecurityRules from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["firestore.rules"],
    plugins: {
      "@firebase/security-rules": pluginSecurityRules,
    },
    languageOptions: {
      parser: pluginSecurityRules.parser,
    },
    rules: {
      "@firebase/security-rules/no-open-reads": "error",
      "@firebase/security-rules/no-open-writes": "error",
      "@firebase/security-rules/no-redundant-matches": "warn",
    },
  },
];

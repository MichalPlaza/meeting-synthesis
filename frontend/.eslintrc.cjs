// frontend/.eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended", // Zalecane reguły dla TypeScript
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // BARDZIEJ RYGORYSTYCZNE, wymaga konfiguracji parserOptions.project
    "plugin:react/recommended", // Zalecane reguły dla React
    "plugin:react/jsx-runtime", // Dla nowego JSX Transform (React 17+)
    "plugin:react-hooks/recommended", // Reguły dla React Hooks
    "plugin:jsx-a11y/recommended", // Reguły dostępności dla JSX
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"], // Ścieżki do twoich tsconfig
    //tsconfigRootDir: __dirname, // Potrzebne, jeśli tsconfig.json nie jest w tym samym katalogu co .eslintrc.cjs
  },
  plugins: [
    "react-refresh",
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
  ],
  settings: {
    react: {
      version: "detect", // Automatycznie wykrywaj wersję React
    },
  },
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    // Możesz dodać lub nadpisać reguły tutaj
    // np. '@typescript-eslint/no-unused-vars': 'warn',
    // 'react/prop-types': 'off', // Wyłącz, jeśli używasz TypeScript dla typowania propsów
  },
  ignorePatterns: ["dist", ".eslintrc.cjs", "vite.config.js"], // Ignoruj pliki/katalogi
};

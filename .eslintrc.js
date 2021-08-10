module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "arrow-body-style": "error",
    "curly": "error",
    "eqeqeq": ["error", "smart"],
    "new-parens": "error",
    "no-caller": "error",
    "no-case-declarations": "error",
    "no-cond-assign": "error",
    "no-debugger": "error",
    "no-else-return": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-inner-declarations": "error",
    "no-labels": ["error", { allowLoop: true, allowSwitch: true }],
    "no-new-func": "error",
    "no-new-wrappers": "error",
    "no-redeclare": "error",
    "no-return-await": "error",
    "no-unsafe-finally": "error",
    "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-const": ["error", { destructuring: "all" }],
    "prefer-exponentiation-operator": "error",
    "prettier/prettier": "error",
    "radix": "error"
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "@typescript-eslint/explicit-function-return-type": ["error", { allowExpressions: true }],
        "@typescript-eslint/naming-convention": ["error", { selector: ["class", "interface"], format: ["PascalCase"] }],
        "@typescript-eslint/no-redeclare": ["error"],
        "@typescript-eslint/no-require-imports": ["error"],
        "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "no-redeclare": "error",
        "no-unused-expressions": "error"
      }
    }
  ]
};

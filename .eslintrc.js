module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "jsapi", "jsdoc", "prettier"],
  rules: {
    "arrow-body-style": "error",
    "curly": "error",
    "eqeqeq": ["error", "smart"],
    "jsapi/no-empty-catch": "error",
    "jsdoc/check-alignment": "error",
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
        // turn on when this can replace TSLint's `typedef` rule
        // https://github.com/typescript-eslint/typescript-eslint/issues/2035
        "@typescript-eslint/explicit-function-return-type": ["off", { allowExpressions: true }],
        "@typescript-eslint/naming-convention": ["error", { selector: ["class", "interface"], format: ["PascalCase"] }],
        "@typescript-eslint/no-redeclare": ["off"], // turn on when this doesn't error on mixins
        "@typescript-eslint/no-require-imports": ["error"],
        "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
        "@typescript-eslint/prefer-namespace-keyword": "error",
        "no-redeclare": "off",
        "no-unused-expressions": "off"
      }
    }
  ]
};

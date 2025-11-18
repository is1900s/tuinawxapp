module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'prettier'],
  env: {
    es6: true,
    node: true,
    jest: true
  },
  globals: {
    wx: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    App: 'readonly',
    Behavior: 'readonly'
  },
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
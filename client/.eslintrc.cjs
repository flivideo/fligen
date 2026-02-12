module.exports = {
  extends: ['../.eslintrc.cjs', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  plugins: ['react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/react-in-jsx-scope': 'off', // Not needed in React 19
    'react/prop-types': 'off', // Using TypeScript
  },
  env: {
    browser: true,
    es2022: true,
  },
};

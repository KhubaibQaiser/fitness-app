/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'all',
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '^@gymos/(.*)$', '^[./]'],
};

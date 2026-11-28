/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Tamagui 3 ships some ESM as .mjs (e.g. @tamagui/style-grammar), which jest-expo's transform skips.
  transform: { '^.+\\.mjs$': 'babel-jest' },
  // pnpm nests packages under .pnpm/*/node_modules — allow transforming RN/Expo.
  // standard-navigation: ESM-only dependency of expo-router 58 (jest-expo 58's own list has it).
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/.+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|solito|tamagui|@tamagui/.*|@testing-library/react-native|standard-navigation))',
  ],
};

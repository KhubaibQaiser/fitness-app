/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // pnpm nests packages under .pnpm/*/node_modules — allow transforming RN/Expo.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm/.+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|solito|tamagui|@tamagui/.*|@testing-library/react-native))',
  ],
};

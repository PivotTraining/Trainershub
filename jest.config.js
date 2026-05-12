/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Limit coverage to modules that actually have unit tests. UI screens and
  // react-query hooks are exercised by Maestro E2E, not Jest, so including
  // them here would tank the coverage threshold for no signal.
  collectCoverageFrom: [
    'lib/validators/**/*.ts',
    'lib/useFilteredClients.ts',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo|@expo-google-fonts|react-clone-referenced-element|@react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};

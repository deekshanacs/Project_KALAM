/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@tms/shared$': '<rootDir>/../shared/src/types/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/types/**',
  ],
  coverageThreshold: {
    global: { lines: 70, functions: 70, branches: 60 },
  },
  verbose: true,
};

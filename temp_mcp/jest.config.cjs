module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\.(ts|tsx|js)$': 'ts-jest'
  },
  transformIgnorePatterns: ["/node_modules/(?!chalk)/"],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^pg$': '<rootDir>/__mocks__/pg.js',
    '^\\./errors\\.js$': '<rootDir>/src/tools/errors.ts'
  },
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      tsconfig: {
        allowJs: true
      }
    }
  },
  globalSetup: './jestGlobalSetup.js',
}; 
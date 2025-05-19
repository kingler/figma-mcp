module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  transformIgnorePatterns: ["/node_modules/(?!chalk)/"],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^pg$': '<rootDir>/__mocks__/pg.js'
  },
  // Uncomment the next line if you need to treat TS files as ES modules
  // extensionsToTreatAsEsm: ['.ts'],
}; 
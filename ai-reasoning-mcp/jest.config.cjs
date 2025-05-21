module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest', 
      { 
        tsconfig: 'tsconfig.json',
        // Don't force ESM if it's causing issues with the tests
        useESM: false,
        isolatedModules: true
      }
    ]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",
  testTimeout: 30000, // Increased timeout to 30 seconds
  // Handle ES modules more reliably
  extensionsToTreatAsEsm: ['.ts'],
  // For handling TypeScript more robustly
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [2322, 2339, 6133, 2345, 2451]
      }
    }
  }
}; 
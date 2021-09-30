const path = require('path');

const SCOPE = process.env.SCOPE;

const config = {
  rootDir: path.resolve(__dirname),
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testEnvironment: 'node',
  testRegex: 'test.ts$',
  coverageDirectory: './coverage/',
  setupFiles: [],
  coveragePathIgnorePatterns: [
    'dist',
    '@integration',
    '\\.test-(util|setup)\\.ts$',
    '\\.test\\.ts$',
    'integration\\.ts$',
  ],
  collectCoverageFrom: ['packages/**/*.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      tsconfig: path.join(path.dirname(__filename), './tsconfig.test.json'),
      diagnostics: {
        ignoreCodes: [2300],
      },
    },
  },
};

if (SCOPE === 'integration') {
  config.testRegex = 'integration.test.ts$';
  console.info('RUNNING INTEGRATION TESTS');
}

if (SCOPE === 'unit') {
  config.testRegex = '^((?!integration).)*.test.ts$';
  console.info('RUNNING UNIT TESTS');
}

module.exports = config;

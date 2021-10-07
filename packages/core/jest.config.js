const config = require('../../jest.config');
module.exports = {
  ...config,
  modulePaths: ['<rootDir>/packages/core'],
  collectCoverageFrom: ['<rootDir>/packages/core/**/*.ts'],
};

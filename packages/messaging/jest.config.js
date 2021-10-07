const config = require('../../jest.config');
module.exports = {
  ...config,
  roots: ['<rootDir>/packages/messaging'],
  collectCoverageFrom: ['<rootDir>/packages/messaging/**/*.ts'],
};

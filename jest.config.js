module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/testUtils/jest.setup.js'],
  clearMocks: true,
  collectCoverageFrom: ['app/src/**/*.js', '!app/src/docs/openapi.js', '!app/src/scripts/**'],
  coveragePathIgnorePatterns: ['/node_modules/'],
};

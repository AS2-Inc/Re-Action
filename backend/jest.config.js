export default {
  testEnvironment: "node",
  transform: {},
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/test/**/*.test.js"],
  collectCoverageFrom: ["app/**/*.js", "!app/models/**", "!**/node_modules/**"],
  coverageDirectory: "coverage",
  verbose: true,
  setupFilesAfterEnv: [],
  globals: {},
  moduleFileExtensions: ["js", "json", "node"],
};

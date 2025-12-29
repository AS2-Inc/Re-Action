# Backend Tests

This directory contains Jest tests for the Re-Action backend API.

## Running Tests

To run all tests:
```bash
npm test
```

To run a specific test file:
```bash
npm test -- neighborhood.test.js
```

To run tests with coverage:
```bash
npm test -- --coverage
```

## Test Structure

### neighborhood.test.js

Tests for the neighborhood API endpoints (`/api/v1/neighborhood`).

**Endpoints tested:**
- `GET /api/v1/neighborhood` - List all neighborhoods
- `GET /api/v1/neighborhood/:id` - Get neighborhood by ID

**Test coverage includes:**
- ✅ Successful responses with correct data
- ✅ Empty result handling
- ✅ 404 errors for not found resources
- ✅ 500 errors for database failures
- ✅ Invalid ID format handling
- ✅ Route pattern validation
- ✅ Response format validation (JSON content-type)
- ✅ Error response structure validation

## Dependencies

- **jest**: Testing framework
- **supertest**: HTTP assertion library for API testing
- **@jest/globals**: ES modules support for Jest

## Configuration

Jest configuration is in [jest.config.js](../jest.config.js).

Key settings:
- `testEnvironment: "node"` - Run in Node.js environment
- `NODE_OPTIONS=--experimental-vm-modules` - Enable ES modules support
- ES modules with `.js` extension support

## Writing New Tests

1. Create a new test file in the `test/` directory with `.test.js` extension
2. Import required dependencies:
   ```javascript
   import { jest } from "@jest/globals";
   import request from "supertest";
   import app from "../app/app.js";
   ```
3. Mock any database models needed
4. Write test cases using `describe` and `it` blocks
5. Run tests with `npm test`

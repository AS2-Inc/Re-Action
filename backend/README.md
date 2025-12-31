# Re:Action Backend

The backend API for Re:Action, a neighborhood-based gamification platform that encourages community engagement through tasks, rewards, and badges.

## Table of Contents

- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Scripts](#scripts)


## Getting Started

### Prerequisites

- Node.js >= 25.0.0
- MongoDB instance (local or cloud)
- npm or yarn

### Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000` (or your configured PORT).

## API Documentation

Interactive API documentation is available via Swagger UI once the server is running:

- **Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **OpenAPI Spec**: [oas3.yml](./oas3.yml)

## Testing

The project uses Jest and Supertest for testing.

### Run Tests

```bash
# Run all tests (includes linting and formatting checks)
npm test

# Run only test suites (skip linting)
npm run test:only

# Run tests with coverage
npm run test:only -- --coverage
```

### Test Coverage

Coverage reports are generated in the `coverage/` directory:
- `lcov-report/index.html`: HTML coverage report
- `coverage-final.json`: JSON coverage data
- `lcov.info`: LCOV format for CI tools

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run tests, linting, and formatting checks |
| `npm run test:only` | Run tests only |
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Fix linting errors automatically |
| `npm run format` | Format code with Biome |
| `npm run format:check` | Check code formatting |

## Development Guidelines

### Code Quality

This project uses [Biome](https://biomejs.dev/) for consistent code quality:
- Automatic formatting
- Linting rules enforcement
- Import organization

Always run linting and formatting before committing:
```bash
npm run lint:fix
npm run format
```

### Error Handling

Global error handling is implemented via the `error_handler` middleware. All errors are caught and formatted consistently.

### Authentication

Protected routes use the `token_checker` middleware. Include JWT token in request headers:
```
Authorization: Bearer <your_jwt_token>
```
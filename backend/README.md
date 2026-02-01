# Re:Action Backend

The backend API for Re:Action, a neighborhood-based gamification platform. This project provides a RESTful API built with Node.js and Express, connected to a MongoDB database.

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [API Documentation](#api-documentation)

## Architecture

This project follows a **Layered Architecture** pattern to ensure separation of concerns:

1.  **Routers** (`app/routers/`): Handle HTTP requests, validate input, and route to the appropriate service. They define the API endpoints.
2.  **Services** (`app/services/`): Contain the core business logic. They interact with data models and other services. They are reusable and framework-agnostic where possible.
3.  **Models** (`app/models/`): Define the MongoDB data schemas using Mongoose.
4.  **Middleware** (`app/middleware/`): Handle cross-cutting concerns like authentication (`token_checker`) and error handling (`error_handler`).

### Key Technologies

-   **Runtime**: Node.js (>= 25.0.0)
-   **Framework**: Express.js
-   **Database**: MongoDB with Mongoose ODM
-   **Authentication**: JSON Web Tokens (JWT)
-   **Testing**: Jest and Supertest
-   **Code Quality**: Biome (Linting & Formatting)

## Project Structure

```
backend/
├── app/
│   ├── config/         # Configuration files (DB connection, etc.)
│   ├── middleware/     # Custom Express middleware
│   ├── models/         # Mongoose schemas and models
│   ├── routers/        # API route definitions
│   ├── services/       # Business logic layer
│   └── utils/          # Utility functions
├── test/               # Integration and unit tests
├── index.js            # Application entry point
├── oas3.yml            # OpenAPI Specification
└── package.json        # Dependencies and scripts
```

## Getting Started

### Prerequisites
-   Node.js (v25+)
-   npm
-   MongoDB instance (local or Atlas)

### Installation

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Setup:**
    ```bash
    cp .env.example .env
    ```
    Update `.env` with your specific configuration (see [Configuration](#configuration)).

3.  **Start Development Server:**
    ```bash
    npm run dev
    ```
    The server will start on port 5000 (default) with hot-reloading enabled.

## Configuration

The application is configured via environment variables.

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `PORT` | API server port | No | `5000` |
| `DB_URL` | MongoDB connection string | Yes | - |
| `NODE_ENV` | Environment (`development`/`production`) | No | `development` |
| `SUPER_SECRET` | Secret key for signing JWTs | Yes | - |
| `ADMIN_EMAIL` | Email for the initial admin account | Yes | - |
| `ADMIN_PASSWORD` | Password for the initial admin account | Yes | - |
| `SMTP_HOST` | SMTP server host | Yes | - |
| `SMTP_PORT` | SMTP server port | Yes | - |
| `SMTP_SECURE` | Use SSL/TLS for SMTP | Yes | - |
| `SMTP_USER` | SMTP username | Yes | - |
| `SMTP_PASS` | SMTP password | Yes | - |
| `SMTP_FROM` | Email address for outgoing mails | Yes | - |

## Development

### Code Quality

We use [Biome](https://biomejs.dev/) for fast linting and formatting.

-   **Check Format**: `npm run format:check`
-   **Fix Format**: `npm run format`
-   **Lint**: `npm run lint`
-   **Fix Lint**: `npm run lint:fix`


## Testing

We use **Jest** as the test runner and **Supertest** for API integration testing.

-   **Run all tests**: `npm test` (includes linting)
-   **Run tests only**: `npm run test:only`
-   **With Coverage**: `npm run test:only -- --coverage`

Tests are located in the `test/` directory.

## API Documentation

-   **Swagger UI**: Available at `/api-docs` when the server is running (e.g., `http://localhost:5000/api-docs`).
-   **Spec File**: The OpenAPI 3.0 specification is located at `oas3.yml`.
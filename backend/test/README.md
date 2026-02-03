# Backend Tests

This directory contains comprehensive Jest-based API integration tests for the Re:Action backend application.

## Test Files

### [`user.test.js`](file:///home/david/Re-Action/backend/test/routers/user.test.js)

**Endpoints tested:**
- `POST /api/v1/users/register` - User registration with validation
- `POST /api/v1/users/login` - Authentication with JWT
- `GET /api/v1/users/me` - Dashboard data for authenticated users
- `GET /api/v1/users/activate` - Email activation flow
- `POST /api/v1/users/change-password` - Password updates
- `POST /api/v1/users/forgot-password` - Password reset initiation

---

### [`task_flow.test.js`](file:///home/david/Re-Action/backend/test/routers/task_flow.test.js)

**Endpoints tested:**
- `GET /api/v1/tasks` - Retrieve user-specific tasks (daily/weekly/monthly/on-demand)
- `POST /api/v1/tasks/submit` - Submit task completion with proof verification

---

### [`neighborhood.test.js`](file:///home/david/Re-Action/backend/test/routers/neighborhood.test.js)

**Endpoints tested:**
- `GET /api/v1/neighborhood` - List all neighborhoods
- `GET /api/v1/neighborhood/:id` - Get specific neighborhood details

---

### [`reward.test.js`](file:///home/david/Re-Action/backend/test/routers/reward.test.js)

**Endpoints tested:**
- `GET /api/v1/rewards` - List active rewards
- `POST /api/v1/rewards/:id/redeem` - Redeem a reward with points

---

### [`operators.test.js`](file:///home/david/Re-Action/backend/test/routers/operators.test.js)

**Endpoints tested:**
- `POST /api/v1/operators/register` - Admin registers new operator
- `POST /api/v1/operators/activate` - Operator activation
- `POST /api/v1/operators/login` - Operator login
- `GET /api/v1/operators/me` - Operator dashboard

---

### [`google_auth.test.js`](file:///home/david/Re-Action/backend/test/routers/google_auth.test.js)

**Endpoints tested:**
- `POST /api/v1/users/auth/google` - Google Login/Registration

---

## Running Tests

### Run all tests with linting and formatting
```bash
npm test
```

### Run only tests (skip linting)
```bash
npm run test:only
```

### Run specific test file
```bash
npm run test:only -- test/routers/user.test.js
```

### Run with coverage
```bash
npm run test:only -- --coverage
```
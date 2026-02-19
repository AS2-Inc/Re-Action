# Re:Action

A gamification platform for neighborhood engagement that rewards citizens for completing environmental and community tasks.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)

## ✨ Features

### For Citizens

- 🔐 **Authentication**: Email/password or Google OAuth login
- 📍 **Neighborhood Selection**: Choose your neighborhood during registration
- ✅ **Task Completion**: Complete tasks with different verification methods:
  - 📸 Photo submission with operator review
  - 📱 GPS location verification
  - 📝 Quiz-based challenges
  - 🔲 QR code scanning
- 🏆 **Gamification**: Earn points, badges, and climb the leaderboard
- 🎁 **Rewards**: Redeem accumulated points for rewards
- 🔔 **Notifications**: Receive updates about new tasks and events
- 📊 **Dashboard**: Track your progress, badges, and statistics

### For Operators

- 🛠️ **Task Management**: Create and manage tasks from templates
- ✔️ **Submission Review**: Review and approve/reject photo submissions
- 🎁 **Reward Management**: Create rewards and manage redemptions
- 📈 **Analytics**: View neighborhood statistics and engagement
- 👥 **Operator Management**: Admin can register new operators

## 🚀 Tech Stack

### Backend

- **Runtime**: Node.js (>= 25.0.0)
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Google OAuth 2.0
- **Email**: Nodemailer (SMTP)
- **Scheduling**: node-cron for recurring tasks
- **File Upload**: Multer
- **Testing**: Jest + Supertest + mongodb-memory-server
- **API Documentation**: OpenAPI 3.0 + Swagger UI

### Frontend

- **Framework**: Vue.js 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: TailwindCSS + DaisyUI
- **Routing**: Vue Router
- **QR Scanner**: html5-qrcode

### Code Quality

- **Linting & Formatting**: Biome

## 📁 Project Structure

```config
Re-action/
├── backend/                 # Node.js/Express API server
│   ├── app/
│   │   ├── config/         # Database and app configuration
│   │   ├── controllers/    # Request/response handlers
│   │   ├── middleware/     # Express middleware (auth, validation, etc.)
│   │   ├── models/         # Mongoose schemas and models
│   │   ├── routers/        # API route definitions
│   │   ├── services/       # Business logic layer
│   │   └── utils/          # Helper functions (geo, security, etc.)
│   ├── scripts/            # Database seeding scripts
│   ├── test/               # Integration and unit tests
│   ├── uploads/            # User-uploaded files
│   ├── .env.example        # Backend environment variables template
│   ├── oas3.yml            # OpenAPI specification
│   └── package.json
│
├── frontend/               # Vue.js SPA
│   ├── src/
│   │   ├── assets/        # CSS and static assets
│   │   ├── components/    # Reusable Vue components
│   │   ├── router/        # Vue Router configuration
│   │   ├── services/      # API client
│   │   └── views/         # Page components
│   ├── public/            # Static files
│   ├── .env.example       # Frontend environment variables template
│   └── package.json
│
├── biome.json             # Biome configuration
└── README.md              # This file
```

## 🏁 Getting Started

### Prerequisites

- Node.js >= 25.0.0 (or >= 22.12.0)
- MongoDB instance (local or cloud)
- SMTP server for emails (Gmail, SendGrid, etc.)
- Google Cloud Console project (for OAuth)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/AS2-Inc/Re-Action.git
   cd Re-action
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install
   
   # Create .env file from example
   cp .env.example .env
   # Edit .env with your configuration (see backend/.env.example for details)
   
   # Seed neighborhoods and task templates
   node scripts/seed_neighborhoods.js
   node scripts/seed_task_templates.js
   ```

3. **Frontend Setup**

   ```bash
   cd ../frontend
   npm install
   
   # Create .env file from example
   cp .env.example .env
   # Edit .env with your configuration (see frontend/.env.example for details)
   ```

### Running the Application

1. **Start Backend** (from `backend/` directory)

   ```bash
   npm run dev    # Development with auto-reload
   # or
   npm start      # Production mode
   ```

   API will be available at `http://localhost:5000`
   Swagger docs at `http://localhost:5000/api-docs`

2. **Start Frontend** (from `frontend/` directory)

   ```bash
   npm run dev    # Development with hot-reload
   ```

   App will be available at `http://localhost:5173`

## 💻 Development

### Formatting and Linting

This project uses [Biome](https://biomejs.dev/) for linting and formatting.

**Available Scripts** (run in root, backend, or frontend directory):

```bash
npm run format      # Format code
npm run lint        # Check for linting errors
npm run lint:fix    # Fix linting errors
npm run check       # Check linting, format, and organize imports
npm run check:fix   # Fix all automatically
npm run ci          # CI mode (fails on errors)
```

### Backend Development

- **API Documentation**: Available at `/api-docs` when server is running
- **Database Models**: Defined in `backend/app/models/`
- **Business Logic**: Implemented in `backend/app/services/`
- **Middleware**: Authentication, validation, error handling in `backend/app/middleware/`

### Frontend Development

- **Component Development**: Reusable components in `src/components/`
- **API Integration**: API client in `src/services/api.js`
- **Routing**: Configured in `src/router/index.js`
- **Styling**: TailwindCSS + DaisyUI components

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run integration tests only
npm run test:integration

# Run unit tests only
npm run test:unit
```

Tests use:

- **Jest** as test runner
- **Supertest** for HTTP assertions
- **mongodb-memory-server** for in-memory database

Test structure:

- `test/integration/`: API endpoint tests
- `test/unit/`: Unit tests for controllers, middleware, services

## 🚢 Deployment

### Backend Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure production MongoDB connection
3. Set production `FRONTEND_URL` and `PUBLIC_BASE_URL`
4. Build frontend: `npm run build:frontend` (from backend directory)
5. Start server: `npm start`

### Frontend Deployment

1. Update `.env.production` with production API URL
2. Build for production: `npm run build`
3. Deploy `dist/` folder to your hosting service

### Environment Variables

See detailed configuration:

- Backend: [backend/.env.example](backend/.env.example)
- Frontend: [frontend/.env.example](frontend/.env.example)

## 🔗 Links

- [Repository](https://github.com/AS2-Inc/Re-Action)
- [Issues](https://github.com/AS2-Inc/Re-Action/issues)
- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)

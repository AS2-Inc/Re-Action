import { jest } from "@jest/globals";
import * as db from "../db_helper.js";

// Mock Email and Badge services to avoid external dependencies
jest.unstable_mockModule("../../app/services/email_service.js", () => ({
  default: {
    send_activation_email: jest.fn().mockResolvedValue(true),
    send_password_reset_email: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule("../../app/services/badge_service.js", () => ({
  default: {
    on_points_updated: jest.fn().mockResolvedValue([]),
    on_task_completed: jest.fn().mockResolvedValue([]),
    on_streak_updated: jest.fn().mockResolvedValue([]),
    on_environmental_stats_updated: jest.fn().mockResolvedValue([]),
    _get_all_badges: jest.fn().mockResolvedValue([]),
    initialize_badges: jest.fn().mockResolvedValue(),
  },
}));

// Import app and models (dynamic imports not strictly needed if not mocking them, but keeping for consistency with existing structure or changing to static if possible)
// Using static imports for simplicity now that we aren't mocking the modules themselves
const request = (await import("supertest")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../app/app.js")).default;
const User = (await import("../../app/models/user.js")).default;
const bcrypt = (await import("bcrypt")).default; // We might want to use real bcrypt or keep it real. Using real is better for integration.

// We will NOT mock bcrypt globally anymore, let's test with real hashing for accuracy,
// or if performance is an issue, we can mock it strictly.
// For "integration" tests on DB, real hashing is safer but slower.
// Let's decide to USE REAL BCYPT to catch actual issues, but maybe lower rounds if possible?
// Actually, for unit tests, mocking bcrypt is fine, but we are moving to integration.
// Let's remove bcrypt mocks to be safe.

describe("User API Endpoints", () => {
  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret-key";
  });

  afterEach(async () => {
    await db.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.close();
  });

  // Helper to create a user and return token
  const createTestUser = async (userData) => {
    // Hash password if present
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const user = new User(userData);
    await user.save();
    return user;
  };

  const generateToken = (user) => {
    return jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

  describe("POST /api/v1/users/login", () => {
    it("should login successfully with valid credentials", async () => {
      // Create user in DB
      await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "password123!A!A",
        role: "citizen",
        age: 25,
        is_active: true,
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "password123!A!A",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("email", "user@example.com");
      expect(response.body).toHaveProperty("id");
    });

    it("should return 404 when user is not found", async () => {
      const response = await request(app).post("/api/v1/users/login").send({
        email: "nonexistent@example.com",
        password: "password123!A!A",
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "User not found");
    });

    it("should return 401 when password is incorrect", async () => {
      await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "password123!A!A",
        role: "citizen",
        age: 25,
        is_active: true,
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "wrongpassword!A!A",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Wrong password");
    });

    it("should return 403 when account is not activated", async () => {
      await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "password123!A!A",
        role: "citizen",
        age: 25,
        is_active: false,
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "password123!A!A",
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Account not activated");
    });
  });

  describe("POST /api/v1/users/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(201);

      const user = await User.findOne({ email: "john@example.com" });
      expect(user).toBeTruthy();
      expect(user.name).toBe("John");
    });

    it("should register a new user with neighborhood", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
        neighborhood_id: "60d5ecb8b487343638842525", // Valid Mongo ID format needed
        age: 30,
      });

      expect(response.status).toBe(201);
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when age is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when surname is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when email is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when password is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 409 when email already exists", async () => {
      await createTestUser({
        name: "Existing",
        surname: "User",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
        role: "citizen",
      });

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "Email already exists");
    });

    it("should return 400 when email format is invalid", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "invalid-email",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid email format");
    });

    it("should return 400 when password has no uppercase", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Password is too weak");
    });

    it("should return 400 when password has no number", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "Password!",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Password is too weak");
    });

    it("should return 400 when password has no special character", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "Password123",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Password is too weak");
    });

    // Database error is hard to mock with real DB unless we drop connection or spy on save
    // We can skip this test or try to mock the prototype.save ONLY for this test
    it("should return 400 when database error occurs", async () => {
      jest
        .spyOn(User.prototype, "save")
        .mockRejectedValueOnce(new Error("DB Error"));
      // Suppress console.error for this expected error
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Error creating user");

      consoleSpy.mockRestore();
    });
  });

  // Operator creation endpoint removed from users.js
  // describe("POST /api/v1/users/operator", () => { ... });

  describe("GET /api/v1/users/me", () => {
    it("should return user dashboard data when authenticated", async () => {
      const user = await createTestUser({
        name: "John",
        surname: "Doe",
        email: "user@example.com",
        password: "password123!A!A",
        role: "citizen",
        age: 25,
        points: 150,
        level: "Cittadino Base",
        streak: 5,
      });

      const token = generateToken(user);

      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", token);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "John");
      expect(response.body).toHaveProperty("surname", "Doe");
    });

    it("should return 401 when token is missing", async () => {
      const response = await request(app).get("/api/v1/users/me");
      expect(response.status).toBe(401);
    });

    it("should return 404 when user is not found", async () => {
      // Create a token for a user that doesn't exist
      const token = jwt.sign(
        {
          email: "ghost@example.com",
          id: "60d5ecb8b487343638842525",
          role: "citizen",
        },
        process.env.SUPER_SECRET,
        { expiresIn: 86400 },
      );

      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", token);

      expect(response.status).toBe(404);
    });

    it("should return 403 when token is invalid", async () => {
      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", "invalid-token");

      expect(response.status).toBe(403);
    });

    it("should return operator dashboard data when authenticated as operator", async () => {
      const operator = await createTestUser({
        name: "Jane",
        surname: "Smith",
        email: "operator@example.com",
        password: "password123!A!A",
        role: "operator",
        age: 30,
      });

      const token = generateToken(operator);

      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", token);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Jane");
      expect(response.body).toHaveProperty("surname", "Smith");
    });
  });

  describe("GET /api/v1/users/activate", () => {
    it("should activate citizen account with valid token", async () => {
      const user = await createTestUser({
        name: "Inactive",
        surname: "User",
        email: "inactive@example.com",
        password: "password123!A!A",
        role: "citizen",
        is_active: false,
        activation_token: "valid-token",
        activation_token_expires: Date.now() + 10000,
      });

      const response = await request(app)
        .get("/api/v1/users/activate")
        .query({ token: "valid-token" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Account activated successfully. You can now log in.",
      );

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.is_active).toBe(true);
      expect(updatedUser.activation_token).toBeUndefined();
    });

    it("should return password setup info for operator activation", async () => {
      await createTestUser({
        name: "Inactive",
        surname: "Operator",
        email: "operator_inactive@example.com",
        password: "password123!A!A",
        role: "operator",
        is_active: false,
        activation_token: "operator-token",
        activation_token_expires: Date.now() + 10000,
      });

      const response = await request(app)
        .get("/api/v1/users/activate")
        .query({ token: "operator-token" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Account activated successfully. You can now log in.",
      );
    });

    it("should return 400 when token is missing", async () => {
      const response = await request(app).get("/api/v1/users/activate");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Token missing");
    });

    it("should return 400 when token is invalid", async () => {
      const response = await request(app)
        .get("/api/v1/users/activate")
        .query({ token: "invalid-token" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid or expired activation token",
      );
    });

    it("should return 400 when token is expired", async () => {
      await createTestUser({
        name: "Expired",
        surname: "User",
        email: "expired@example.com",
        password: "password123!A!A",
        role: "citizen",
        is_active: false,
        activation_token: "expired-token",
        activation_token_expires: Date.now() - 10000,
      });

      const response = await request(app)
        .get("/api/v1/users/activate")
        .query({ token: "expired-token" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid or expired activation token",
      );
    });
  });

  // set-password endpoint removed from users.js
  // describe("POST /api/v1/users/set-password", () => { ... });

  describe("POST /api/v1/users/change-password", () => {
    it("should change password successfully for authenticated user", async () => {
      const user = await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "oldpassword",
        role: "citizen",
        is_active: true,
      });

      const token = generateToken(user);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123!A!A!A",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Password changed successfully",
      );

      const updatedUser = await User.findById(user._id);
      // Since we use real bcrypt now, we can check if new password matches
      const isMatch = await bcrypt.compare(
        "newpassword123!A!A!A",
        updatedUser.password,
      );
      expect(isMatch).toBe(true);
    });

    it("should return 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/v1/users/change-password")
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123!A!A!A",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "No token provided.");
    });

    it("should return 400 when current_password is missing", async () => {
      const user = await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "oldpassword",
        role: "citizen",
        is_active: true,
      });
      const token = generateToken(user);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          new_password: "newpassword123!A!A!A",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    // NOTE: This test was previously testing specific "Missing required fields" for new_password too,
    // effectively duplicate of above but just for different field.
    // Generic validation middleware handles both.
    it("should return 400 when new_password is missing", async () => {
      const user = await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "oldpassword",
        role: "citizen",
        is_active: true,
      });
      const token = generateToken(user);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          current_password: "oldpassword",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 404 when user is not found", async () => {
      const token = jwt.sign(
        {
          email: "ghost@example.com",
          id: "60d5ecb8b487343638842525",
          role: "citizen",
        }, // random ID
        process.env.SUPER_SECRET,
        { expiresIn: 86400 },
      );

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123!A!A!A",
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "User not found");
    });

    it("should return 401 when current password is incorrect", async () => {
      const user = await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "oldpassword",
        role: "citizen",
        is_active: true,
      });
      const token = generateToken(user);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          current_password: "wrongpassword!A!A",
          new_password: "newpassword123!A!A!A",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "error",
        "Current password is incorrect",
      );
    });

    it("should return 400 when new password is too short", async () => {
      const user = await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "oldpassword",
        role: "citizen",
        is_active: true,
      });
      const token = generateToken(user);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          current_password: "oldpassword",
          new_password: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Password is too weak");
    });

    it("should return 400 when new password is same as current", async () => {
      const user = await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "StrongPassword1!",
        role: "citizen",
        is_active: true,
      });
      const token = generateToken(user);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", token)
        .send({
          current_password: "StrongPassword1!",
          new_password: "StrongPassword1!",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "New password must be different from current password",
      );
    });
  });

  describe("POST /api/v1/users/forgot-password", () => {
    it("should generate reset token for valid email", async () => {
      const user = await createTestUser({
        name: "Forgot",
        surname: "User",
        email: "forgot@example.com",
        password: "password123!A!A",
        role: "citizen",
        is_active: true,
      });

      const response = await request(app)
        .post("/api/v1/users/forgot-password")
        .send({
          email: "forgot@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "If an account with that email exists, a password reset link has been sent",
      );

      const updatedUser = await User.findById(user._id);
      expect(updatedUser.reset_password_token).toBeDefined();
      expect(updatedUser.reset_password_expires).toBeDefined();
    });

    it("should return success message even for non-existent email", async () => {
      const response = await request(app)
        .post("/api/v1/users/forgot-password")
        .send({
          email: "nonexistent@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "If an account with that email exists, a password reset link has been sent",
      );
      expect(response.body).not.toHaveProperty("token");
    });

    it("should return 400 when email is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/forgot-password")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });
  });

  describe("Response format validation", () => {
    it("should return JSON content type for login endpoint", async () => {
      await createTestUser({
        name: "Test",
        surname: "User",
        email: "user@example.com",
        password: "password123!A!A",
        role: "citizen",
        is_active: true,
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "password123!A!A",
      });

      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return JSON content type for register endpoint", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123!A!A",
        age: 30,
      });

      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return valid error JSON structure on errors", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
      });

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });
  });

  describe("Route validation", () => {
    it("should match correct route pattern for login", async () => {
      await createTestUser({
        name: "Test",
        surname: "User",
        email: "test@example.com",
        password: "password123!A!A", // Updated to meet complexity reqs for test user creation
        role: "citizen",
        active: true,
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "test@example.com",
        password: "password123!A!A",
      });

      expect(response.status).not.toBe(404);
    });

    it("should match correct route pattern for register", async () => {
      const response = await request(app)
        .post("/api/v1/users/register")
        .send({});

      expect(response.status).not.toBe(404);
    });

    it("should match correct route pattern for me endpoint", async () => {
      const response = await request(app).get("/api/v1/users/me");

      expect(response.status).not.toBe(404);
    });

    it("should return 404 for non-existent routes", async () => {
      const response = await request(app).get("/api/v1/users/invalid");

      expect(response.status).toBe(404);
    });
  });
});

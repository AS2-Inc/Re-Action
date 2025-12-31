import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app from "../app/app.js";
import User from "../app/models/user.js";
import Activity from "../app/models/activity.js";

// Mock the User model methods
const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockFindById = jest.fn();
const mockPopulate = jest.fn();
const mockCountDocuments = jest.fn();

User.findOne = mockFindOne;
User.findById = mockFindById;
Activity.countDocuments = mockCountDocuments;

describe("User API Endpoints", () => {
  let validToken;
  let adminToken;
  let operatorToken;

  beforeAll(() => {
    // Create valid tokens for testing
    process.env.SUPER_SECRET = "test-secret-key";

    validToken = jwt.sign(
      { email: "user@example.com", id: "user123", role: "citizen" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );

    adminToken = jwt.sign(
      { email: "admin@example.com", id: "admin123", role: "admin" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );

    operatorToken = jwt.sign(
      { email: "operator@example.com", id: "operator123", role: "operator" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOne.mockReset();
    mockSave.mockReset();
    mockFindById.mockReset();
    mockPopulate.mockReset();
    mockCountDocuments.mockReset();
  });

  afterAll(async () => {
    // Close database connections if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("POST /api/v1/users/login", () => {
    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        password: "password123",
        is_active: true,
        role: "citizen",
      };

      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("email", "user@example.com");
      expect(response.body).toHaveProperty("id", "user123");
      expect(response.body).toHaveProperty("self", "/api/v1/users/user123");
      expect(mockFindOne).toHaveBeenCalledWith({ email: "user@example.com" });
    });

    it("should return 404 when user is not found", async () => {
      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "User not found");
    });

    it("should return 401 when password is incorrect", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        password: "password123",
        is_active: true,
      };

      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Wrong password");
    });

    it("should return 403 when account is not activated", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        password: "password123",
        is_active: false,
      };

      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "password123",
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Account not activated");
    });
  });

  describe("POST /api/v1/users/register", () => {
    it("should register a new user successfully", async () => {
      mockFindOne.mockResolvedValue(null);

      const mockUser = {
        _id: "newuser123",
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        save: jest.fn().mockResolvedValue(true),
      };

      User.prototype.save = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(mockFindOne).toHaveBeenCalledWith({ email: "john@example.com" });
    });

    it("should register a new user with neighborhood", async () => {
      mockFindOne.mockResolvedValue(null);

      const mockUser = {
        _id: "newuser123",
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        neighborhood_id: "neighborhood123",
        save: jest.fn().mockResolvedValue(true),
      };

      User.prototype.save = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123",
        neighborhood_id: "neighborhood123",
      });

      expect(response.status).toBe(201);
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        surname: "Doe",
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when surname is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when email is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when password is missing", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 409 when email already exists", async () => {
      const existingUser = {
        _id: "existing123",
        email: "john@example.com",
      };

      mockFindOne.mockResolvedValue(existingUser);

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "Email already exists");
    });

    it("should return 400 when email format is invalid", async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "invalid-email",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid email format");
    });

    it("should return 400 when database error occurs", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockFindOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockRejectedValue(new Error("DB Error"));

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Error creating user");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("POST /api/v1/users/operator", () => {
    it("should create operator account when admin is authenticated", async () => {
      mockFindOne.mockResolvedValue(null);

      const mockUser = {
        _id: "operator123",
        name: "Jane",
        surname: "Smith",
        email: "jane@example.com",
        role: "operator",
        save: jest.fn().mockResolvedValue(true),
      };

      User.prototype.save = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", adminToken)
        .send({
          name: "Jane",
          surname: "Smith",
          email: "jane@example.com",
        });

      expect(response.status).toBe(201);
      expect(mockFindOne).toHaveBeenCalledWith({ email: "jane@example.com" });
    });

    it("should return 403 when user is not an admin", async () => {
      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", validToken)
        .send({
          name: "Jane",
          surname: "Smith",
          email: "jane@example.com",
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "error",
        "Forbidden: Insufficient privileges",
      );
    });

    it("should return 403 when operator tries to create another operator", async () => {
      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", operatorToken)
        .send({
          name: "Jane",
          surname: "Smith",
          email: "jane@example.com",
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "error",
        "Forbidden: Insufficient privileges",
      );
    });

    it("should return 401 when token is missing", async () => {
      const response = await request(app).post("/api/v1/users/operator").send({
        name: "Jane",
        surname: "Smith",
        email: "jane@example.com",
      });

      expect(response.status).toBe(401);
    });

    it("should return 400 when name is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", adminToken)
        .send({
          surname: "Smith",
          email: "jane@example.com",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when surname is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", adminToken)
        .send({
          name: "Jane",
          email: "jane@example.com",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 400 when email is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", adminToken)
        .send({
          name: "Jane",
          surname: "Smith",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });

    it("should return 409 when email already exists", async () => {
      const existingUser = {
        _id: "existing123",
        email: "jane@example.com",
      };

      mockFindOne.mockResolvedValue(existingUser);

      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", adminToken)
        .send({
          name: "Jane",
          surname: "Smith",
          email: "jane@example.com",
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "Email already exists");
    });

    it("should return 400 when email format is invalid", async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/users/operator")
        .set("x-access-token", adminToken)
        .send({
          name: "Jane",
          surname: "Smith",
          email: "invalid-email",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid email format");
    });
  });

  describe("GET /api/v1/users/me", () => {
    it("should return user dashboard data when authenticated", async () => {
      const mockUser = {
        _id: "user123",
        first_name: "John",
        surname: "Doe",
        role: "citizen",
        points: 150,
        level: "Cittadino Base",
        streak: 5,
        badges_id: [],
        ambient: {
          co2_saved: 0,
          waste_recycled: 0,
          km_green: 0,
        },
        neighborhood_id: {
          _id: "neighborhood123",
          name: "Green Valley",
        },
      };

      mockPopulate.mockResolvedValue(mockUser);
      mockFindById.mockReturnValue({ populate: mockPopulate });
      mockCountDocuments.mockResolvedValue(10);

      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", validToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "John Doe");
      expect(response.body).toHaveProperty("points", 150);
      expect(response.body).toHaveProperty("streak", 5);
      expect(response.body).toHaveProperty("neighborhood_id");
      expect(response.body).toHaveProperty("tasks_completed", 10);
      expect(mockFindById).toHaveBeenCalledWith("user123");
    });

    it("should return 401 when token is missing", async () => {
      const response = await request(app).get("/api/v1/users/me");

      expect(response.status).toBe(401);
    });

    it("should return 404 when user is not found", async () => {
      mockPopulate.mockResolvedValue(null);
      mockFindById.mockReturnValue({ populate: mockPopulate });

      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", validToken);

      expect(response.status).toBe(404);
    });

    it("should return 403 when token is invalid", async () => {
      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", "invalid-token");

      expect(response.status).toBe(403);
    });

    it("should return operator dashboard data when authenticated as operator", async () => {
      const mockOperator = {
        _id: "operator123",
        first_name: "Jane",
        surname: "Smith",
        points: 0,
        streak: 0,
        neighborhood_id: null,
        tasks_completed: [],
        role: "operator",
      };

      mockPopulate.mockResolvedValue(mockOperator);
      mockFindById.mockReturnValue({ populate: mockPopulate });

      const response = await request(app)
        .get("/api/v1/users/me")
        .set("x-access-token", operatorToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Jane Smith");
      expect(response.body).toHaveProperty("role", "operator");
      expect(mockFindById).toHaveBeenCalledWith("operator123");
    });
  });

  describe("GET /api/v1/users/activate", () => {
    it("should activate citizen account with valid token", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        role: "citizen",
        active: false,
        activationToken: "valid-token",
        activationTokenExpires: Date.now() + 10000,
        save: jest.fn().mockResolvedValue(true),
      };

      mockFindOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/v1/users/activate")
        .query({ token: "valid-token" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Account activated successfully. You can now log in.",
      );
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should return password setup info for operator activation", async () => {
      const mockUser = {
        _id: "operator123",
        email: "operator@example.com",
        role: "operator",
        active: false,
        activationToken: "operator-token",
        activationTokenExpires: Date.now() + 10000,
      };

      mockFindOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .get("/api/v1/users/activate")
        .query({ token: "operator-token" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Please set your password",
      );
      expect(response.body).toHaveProperty("token", "operator-token");
      expect(response.body).toHaveProperty("requires_password_setup", true);
    });

    it("should return 400 when token is missing", async () => {
      const response = await request(app).get("/api/v1/users/activate");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Token missing");
    });

    it("should return 400 when token is invalid", async () => {
      mockFindOne.mockResolvedValue(null);

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
      mockFindOne.mockResolvedValue(null);

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

  describe("POST /api/v1/users/set-password", () => {
    it("should set password for operator successfully", async () => {
      const mockUser = {
        _id: "operator123",
        email: "operator@example.com",
        role: "operator",
        active: false,
        activationToken: "operator-token",
        activationTokenExpires: Date.now() + 10000,
        save: jest.fn().mockResolvedValue(true),
      };

      mockFindOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/set-password")
        .send({
          token: "operator-token",
          password: "newpassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Password set successfully. You can now log in.",
      );
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should return 400 when token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/set-password")
        .send({
          password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Token and password are required",
      );
    });

    it("should return 400 when password is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/set-password")
        .send({
          token: "operator-token",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Token and password are required",
      );
    });

    it("should return 400 when token is invalid", async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/users/set-password")
        .send({
          token: "invalid-token",
          password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid or expired activation token",
      );
    });

    it("should return 403 when user is not an operator", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        role: "citizen",
        activationToken: "citizen-token",
        activationTokenExpires: Date.now() + 10000,
      };

      mockFindOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/set-password")
        .send({
          token: "citizen-token",
          password: "newpassword123",
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "error",
        "This endpoint is only for operators",
      );
    });

    it("should return 400 when token is expired", async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/users/set-password")
        .send({
          token: "expired-token",
          password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid or expired activation token",
      );
    });
  });

  describe("POST /api/v1/users/change-password", () => {
    it("should change password successfully for authenticated user", async () => {
      const mockUser = {
        _id: "user123",
        password: "oldpassword",
        save: jest.fn().mockResolvedValue(true),
      };

      mockFindById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Password changed successfully",
      );
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.password).toBe("newpassword123");
    });

    it("should return 401 when no token is provided", async () => {
      const response = await request(app)
        .post("/api/v1/users/change-password")
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "No token provided.");
    });

    it("should return 400 when current_password is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          new_password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Current password and new password are required",
      );
    });

    it("should return 400 when new_password is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          current_password: "oldpassword",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Current password and new password are required",
      );
    });

    it("should return 404 when user is not found", async () => {
      mockFindById.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          current_password: "oldpassword",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "User not found");
    });

    it("should return 401 when current password is incorrect", async () => {
      const mockUser = {
        _id: "user123",
        password: "oldpassword",
      };

      mockFindById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          current_password: "wrongpassword",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "error",
        "Current password is incorrect",
      );
    });

    it("should return 400 when new password is too short", async () => {
      const mockUser = {
        _id: "user123",
        password: "oldpassword",
      };

      mockFindById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          current_password: "oldpassword",
          new_password: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "New password must be at least 6 characters long",
      );
    });

    it("should return 400 when new password is same as current", async () => {
      const mockUser = {
        _id: "user123",
        password: "oldpassword",
      };

      mockFindById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/change-password")
        .set("x-access-token", validToken)
        .send({
          current_password: "oldpassword",
          new_password: "oldpassword",
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
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        save: jest.fn().mockResolvedValue(true),
      };

      mockFindOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/forgot-password")
        .send({
          email: "user@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "If an account with that email exists, a password reset link has been sent",
      );
      expect(response.body).toHaveProperty("token");
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.reset_password_token).toBeDefined();
      expect(mockUser.reset_password_expires).toBeDefined();
    });

    it("should return success message even for non-existent email", async () => {
      mockFindOne.mockResolvedValue(null);

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
      expect(response.body).toHaveProperty("error", "Email is required");
    });
  });

  describe("POST /api/v1/users/reset-password", () => {
    it("should reset password successfully with valid token", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        reset_password_token: "valid-reset-token",
        reset_password_expires: Date.now() + 10000,
        save: jest.fn().mockResolvedValue(true),
      };

      mockFindOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          token: "valid-reset-token",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Password reset successfully. You can now log in.",
      );
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.password).toBe("newpassword123");
      expect(mockUser.reset_password_token).toBeUndefined();
      expect(mockUser.reset_password_expires).toBeUndefined();
    });

    it("should return 400 when token is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          new_password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Reset token and new password are required",
      );
    });

    it("should return 400 when new_password is missing", async () => {
      const response = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          token: "valid-reset-token",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Reset token and new password are required",
      );
    });

    it("should return 400 when new password is too short", async () => {
      const response = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          token: "valid-reset-token",
          new_password: "short",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Password must be at least 6 characters long",
      );
    });

    it("should return 400 when reset token is invalid", async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          token: "invalid-token",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid or expired reset token",
      );
    });

    it("should return 400 when reset token is expired", async () => {
      mockFindOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/users/reset-password")
        .send({
          token: "expired-token",
          new_password: "newpassword123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid or expired reset token",
      );
    });
  });

  describe("Response format validation", () => {
    it("should return JSON content type for login endpoint", async () => {
      const mockUser = {
        _id: "user123",
        email: "user@example.com",
        password: "password123",
        active: true,
        role: "citizen",
      };

      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "user@example.com",
        password: "password123",
      });

      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return JSON content type for register endpoint", async () => {
      mockFindOne.mockResolvedValue(null);
      User.prototype.save = jest.fn().mockResolvedValue(true);

      const response = await request(app).post("/api/v1/users/register").send({
        name: "John",
        surname: "Doe",
        email: "john@example.com",
        password: "password123",
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
      const mockUser = {
        _id: "user123",
        email: "test@example.com",
        password: "test",
        active: true,
        role: "citizen",
      };

      mockFindOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const response = await request(app).post("/api/v1/users/login").send({
        email: "test@example.com",
        password: "test",
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

import { jest } from "@jest/globals";
import * as db from "../db_helper.js";

// Mock EmailService
const mockSendActivationEmail = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule("../../app/services/email_service.js", () => ({
  default: {
    send_activation_email: mockSendActivationEmail,
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

const request = (await import("supertest")).default;
const app = (await import("../../app/app.js")).default;
const jwt = (await import("jsonwebtoken")).default;
const bcrypt = (await import("bcrypt")).default;
const Operator = (await import("../../app/models/operator.js")).default;

describe("Operator API", () => {
  let admin_token;
  const operator_password = "StrongPassword123!";

  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret";

    // Create Admin Token (Role admin is allowed to register operators)
    // In real app, we might need a real admin user in DB if middleware checks DB
    // But check_role middleware usually checks JWT payload.
    // Let's rely on JWT payload for role check based on previous tests.
    admin_token = jwt.sign(
      { email: "admin@test.com", id: "admin123", role: "admin" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  });

  afterEach(async () => {
    await db.clear();
    mockSendActivationEmail.mockClear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe("POST /api/v1/operators/register", () => {
    const operator_data = {
      name: "Op",
      surname: "Test",
      email: "op@test.com",
    };

    it("should allow admin to register a new operator", async () => {
      const response = await request(app)
        .post("/api/v1/operators/register")
        .set("x-access-token", admin_token)
        .send(operator_data);

      expect(response.status).toBe(201);
      expect(mockSendActivationEmail).toHaveBeenCalledWith(
        operator_data.email,
        expect.any(String),
      );

      const op = await Operator.findOne({ email: operator_data.email });
      expect(op).toBeTruthy();
      expect(op.activation_token).toBeTruthy();
      expect(op.role).toBe("operator");
    });

    it("should return 409 if email already exists", async () => {
      // Create existing operator
      const existing = new Operator({
        ...operator_data,
        password: "TempPassword123!",
        role: "operator",
      });
      await existing.save();

      const response = await request(app)
        .post("/api/v1/operators/register")
        .set("x-access-token", admin_token)
        .send(operator_data);

      expect(response.status).toBe(409);
    });

    it("should forbid non-admin from registering operator", async () => {
      const non_admin_token = jwt.sign(
        { email: "user@test.com", id: "user123", role: "operator" },
        process.env.SUPER_SECRET,
        { expiresIn: 86400 },
      );

      const response = await request(app)
        .post("/api/v1/operators/register")
        .set("x-access-token", non_admin_token)
        .send(operator_data);

      expect(response.status).toBe(403);
    });
  });

  describe("POST /api/v1/operators/activate", () => {
    let activation_token;
    let operator_id;

    beforeEach(async () => {
      const op = new Operator({
        name: "Op",
        surname: "Test",
        email: "activateme@test.com",
        password: "TempPassword123!", // Preliminary password
        role: "operator",
        activation_token: "valid-activation-token",
        activation_token_expires: Date.now() + 3600000,
      });
      await op.save();
      operator_id = op._id;
      activation_token = op.activation_token;
    });

    it("should activate operator with valid token and strong password", async () => {
      const response = await request(app)
        .post("/api/v1/operators/activate")
        .send({
          token: activation_token,
          password: "StrongPassword123!",
        });

      expect(response.status).toBe(200);

      const op = await Operator.findById(operator_id);
      expect(op.is_active).toBe(true);
      expect(op.activation_token).toBeUndefined(); // Or null/undefined depending on implementation

      // Check password is changed and hashed
      const isMatch = await bcrypt.compare("StrongPassword123!", op.password);
      expect(isMatch).toBe(true);
    });

    it("should fail with weak password", async () => {
      const response = await request(app)
        .post("/api/v1/operators/activate")
        .send({
          token: activation_token,
          password: "123",
        });

      expect(response.status).toBe(400); // Bad Request
      expect(response.body.error).toMatch(/weak/i);

      const op = await Operator.findById(operator_id);
      expect(op.is_active).toBe(false);
    });

    it("should fail if token invalid", async () => {
      const response = await request(app)
        .post("/api/v1/operators/activate")
        .send({
          token: "invalid-token",
          password: "StrongPassword123!",
        });

      expect(response.status).toBe(400); // Or 404 depending on implementation, test said 400
      // Previous test expected 400 for invalid token
    });
  });

  describe("POST /api/v1/operators/login", () => {
    let operator;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash(operator_password, 10);
      operator = new Operator({
        name: "Login",
        surname: "Op",
        email: "login@op.com",
        password: hashedPassword,
        role: "operator",
        is_active: true,
      });
      await operator.save();
    });

    it("should login with valid credentials", async () => {
      const response = await request(app).post("/api/v1/operators/login").send({
        email: operator.email,
        password: operator_password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
    });

    it("should fail with invalid credentials", async () => {
      const response = await request(app).post("/api/v1/operators/login").send({
        email: operator.email,
        password: "WrongPassword!",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/operators/me", () => {
    let op_token;
    let operator;

    beforeEach(async () => {
      operator = new Operator({
        name: "Me",
        surname: "Op",
        email: "me@op.com",
        password: "hashedpassword",
        role: "operator",
        is_active: true,
      });
      await operator.save();

      op_token = jwt.sign(
        { email: operator.email, id: operator._id, role: "operator" },
        process.env.SUPER_SECRET,
        { expiresIn: 86400 },
      );
    });

    it("should return operator details", async () => {
      const response = await request(app)
        .get("/api/v1/operators/me")
        .set("x-access-token", op_token);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Me");
      expect(response.body.email).toBe("me@op.com");
    });
  });
});

import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

// Mock EmailService
const mockSendActivationEmail = jest.fn().mockResolvedValue(true);
const mockSendOperatorActivationEmail = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    send_activation_email: mockSendActivationEmail,
    send_operator_activation_email: mockSendOperatorActivationEmail,
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

const request = (await import("supertest")).default;
const app = (await import("../../../app/app.js")).default;
const jwt = (await import("jsonwebtoken")).default;
const bcrypt = (await import("bcrypt")).default;
const Operator = (await import("../../../app/models/operator.js")).default;

describe("Operator API", () => {
  let admin_token;
  const operator_password = "StrongPassword123!";

  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret";
  });

  beforeEach(async () => {
    // Create Admin Token (Role admin is allowed to register operators)
    const admin = new Operator({
      name: "Admin",
      surname: "User",
      email: "admin@test.com",
      password: operator_password,
      role: "admin",
      is_active: true,
    });
    await admin.save();

    admin_token = jwt.sign(
      { email: admin.email, id: admin._id, role: admin.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  });

  afterEach(async () => {
    await db.clear();
    mockSendActivationEmail.mockClear();
    mockSendOperatorActivationEmail.mockClear();
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
      expect(mockSendOperatorActivationEmail).toHaveBeenCalledWith(
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
      activation_token = jwt.sign(
        { email: "activateme@test.com", purpose: "activation" },
        process.env.SUPER_SECRET,
        { expiresIn: "12h" },
      );
      const op = new Operator({
        name: "Op",
        surname: "Test",
        email: "activateme@test.com",
        role: "operator",
        activation_token: activation_token,
      });
      await op.save();
      operator_id = op._id;
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
      expect(op.activation_token).toBeUndefined();

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

      expect(response.status).toBe(400);
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
});

import { jest } from "@jest/globals";
import * as db from "../../db_helper.js";

// Define mock function outside so we can control it in tests
const verifyIdTokenMock = jest.fn();

// Define mock factory using the outer variable
jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

// Mock EmailService to avoid sending emails during tests
jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    send_activation_email: jest.fn().mockResolvedValue(true),
    send_password_reset_email: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

const request = (await import("supertest")).default;
const app = (await import("../../../app/app.js")).default;
const User = (await import("../../../app/models/user.js")).default;

describe("Google Authentication", () => {
  beforeAll(async () => {
    await db.connect();
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.SUPER_SECRET = "test-secret-key";
  });

  afterEach(async () => {
    await db.clear();
    verifyIdTokenMock.mockReset();
  });

  afterAll(async () => {
    await db.close();
  });

  test("POST /api/v1/users/auth/google should register a new user", async () => {
    // Mock successful Google verification
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "newuser@example.com",
        sub: "1234567890",
        given_name: "New",
        family_name: "User",
      }),
    });

    const res = await request(app)
      .post("/api/v1/users/auth/google")
      .send({ credential: "valid_google_token" });

    expect(res.statusCode).toEqual(200);
    // Token is now in cookie, not body
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/token=/);
    expect(res.body.email).toEqual("newuser@example.com");

    const user = await User.findOne({ email: "newuser@example.com" });
    expect(user).toBeTruthy();
    expect(user.auth_provider).toBe("google");
    // expect(user.role).toBe("citizen"); // Role field removed from schema
  });

  test("POST /api/v1/users/auth/google should log in existing Google user", async () => {
    // Create existing user
    const existingUser = new User({
      email: "existing@example.com",
      auth_provider: "google",
      role: "citizen",
      is_active: true,
      name: "Existing",
      surname: "User",
    });
    await existingUser.save();

    // Mock successful Google verification
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "existing@example.com",
        sub: "1234567890",
        given_name: "Existing",
        family_name: "User",
      }),
    });

    const res = await request(app)
      .post("/api/v1/users/auth/google")
      .send({ credential: "valid_google_token" });

    expect(res.statusCode).toEqual(200);
    // Token is now in cookie, not body
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/token=/);
    expect(res.body.email).toEqual("existing@example.com");
    expect(res.body.id).toEqual(existingUser._id.toString());
  });

  test("POST /api/v1/users/auth/google should handle invalid token", async () => {
    // Mock failed Google verification
    verifyIdTokenMock.mockRejectedValue(new Error("Invalid token"));

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const res = await request(app)
      .post("/api/v1/users/auth/google")
      .send({ credential: "invalid_token" });

    expect(res.statusCode).toEqual(401);
    expect(res.body.error).toEqual("Invalid Google token");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test("POST /api/v1/users/auth/google should require credential", async () => {
    const res = await request(app).post("/api/v1/users/auth/google").send({}); // No credential

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual("Missing required fields");
  });
});

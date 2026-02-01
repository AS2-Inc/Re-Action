import { jest } from "@jest/globals";

// Define mock function outside so we can control it in tests
const verifyIdTokenMock = jest.fn();

// Define mock factory using the outer variable
jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

// Import modules dynamically
const { default: request } = await import("supertest");
const { default: app } = await import("../app/app.js");
const { default: User } = await import("../app/models/user.js");

describe("Google Authentication", () => {
  let mockFindOne;
  let mockSave;

  beforeAll(() => {
    // Setup Env Vars
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.SUPER_SECRET = "test-secret-key";

    // We need to mock User.findOne and User.prototype.save
    mockFindOne = jest.fn();
    mockSave = jest.fn();

    User.findOne = mockFindOne;
    User.prototype.save = mockSave;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    verifyIdTokenMock.mockReset();
    mockFindOne.mockReset();
    mockSave.mockReset();
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

    // Mock User not found (so it registers)
    mockFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockSave.mockResolvedValue({
      _id: "new_user_id",
      email: "newuser@example.com",
      auth_provider: "google",
      role: "citizen",
    });

    const res = await request(app)
      .post("/api/v1/users/auth/google")
      .send({ credential: "valid_google_token" });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toEqual("newuser@example.com");

    // Verify save was called
    expect(mockSave).toHaveBeenCalled();
  });

  test("POST /api/v1/users/auth/google should log in existing Google user", async () => {
    // Mock successful Google verification
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "existing@example.com",
        sub: "1234567890",
        given_name: "Existing",
        family_name: "User",
      }),
    });

    // Mock User found
    const existingUser = {
      _id: "existing_id",
      email: "existing@example.com",
      auth_provider: "google",
      role: "citizen",
      is_active: true,
    };

    mockFindOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existingUser),
    });

    const res = await request(app)
      .post("/api/v1/users/auth/google")
      .send({ credential: "valid_google_token" });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toEqual("existing@example.com");
    expect(res.body.id).toEqual("existing_id");
  });

  test("POST /api/v1/users/auth/google should handle invalid token", async () => {
    // Mock failed Google verification
    verifyIdTokenMock.mockRejectedValue(new Error("Invalid token"));

    const res = await request(app)
      .post("/api/v1/users/auth/google")
      .send({ credential: "invalid_token" });

    expect(res.statusCode).toEqual(401);
    expect(res.body.error).toEqual("Invalid Google token");
  });

  test("POST /api/v1/users/auth/google should require credential", async () => {
    const res = await request(app).post("/api/v1/users/auth/google").send({}); // No credential

    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual("Missing Google token");
  });
});

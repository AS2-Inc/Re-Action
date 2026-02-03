import { jest } from "@jest/globals";

// Mock Mongoose connection state
const mockMongoose = {
  connection: {
    readyState: 1, // Connected
  },
};
jest.unstable_mockModule("mongoose", () => ({
  default: mockMongoose,
  mongoose: mockMongoose,
}));

// Mock Models
const mockFindById = jest.fn();
const mockOperator = {
  findById: mockFindById,
};
const mockUser = {
  findById: mockFindById,
};

jest.unstable_mockModule("../../../app/models/operator.js", () => ({
  default: mockOperator,
}));
jest.unstable_mockModule("../../../app/models/user.js", () => ({
  default: mockUser,
}));

const check_role = (await import("../../../app/middleware/role_checker.js"))
  .default;

describe("RoleChecker Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { logged_user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    mockFindById.mockReset();
    mockMongoose.connection.readyState = 1;
  });

  it("should call next() if user has allowed role and exists/active", async () => {
    req.logged_user = { id: "admin_id", role: "admin" };
    mockFindById.mockResolvedValue({ is_active: true }); // Mock active user found

    const middleware = check_role(["admin", "operator"]);
    await middleware(req, res, next);

    expect(mockOperator.findById).toHaveBeenCalledWith("admin_id");
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if no logged_user", async () => {
    const middleware = check_role(["admin"]);
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user role is not allowed", async () => {
    req.logged_user = { id: "user_id", role: "citizen" };
    const middleware = check_role(["admin"]);
    await middleware(req, res, next);
    // Note: implementation might return 403 immediately before checking DB?
    // Checking logic: yes, if !roles.includes(userRole), it returns 403.
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 503 if DB not connected", async () => {
    mockMongoose.connection.readyState = 0;
    req.logged_user = { id: "admin_id", role: "admin" };
    const middleware = check_role(["admin"]);
    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("should return 401 if user found but inactive", async () => {
    req.logged_user = { id: "admin_id", role: "admin" };
    mockFindById.mockResolvedValue({ is_active: false });

    const middleware = check_role(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/Access revoked/),
      }),
    );
  });

  it("should return 401 if user not found in DB", async () => {
    req.logged_user = { id: "admin_id", role: "admin" };
    mockFindById.mockResolvedValue(null);

    const middleware = check_role(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

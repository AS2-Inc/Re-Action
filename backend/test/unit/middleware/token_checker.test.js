import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import token_checker from "../../../app/middleware/token_checker.js";

describe("token_checker middleware", () => {
  const originalSecret = process.env.SUPER_SECRET;

  beforeAll(() => {
    process.env.SUPER_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.SUPER_SECRET = originalSecret;
  });

  const createRes = () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    return res;
  };

  it("should return 401 when no token is provided", () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    token_checker(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: "No token provided." });
    expect(next).not.toHaveBeenCalled();
  });

  it("should authenticate with x-access-token header", () => {
    const payload = { id: "user1", email: "test@example.com" };
    const token = jwt.sign(payload, process.env.SUPER_SECRET, {
      expiresIn: 60,
    });

    const req = { headers: { "x-access-token": token } };
    const res = createRes();
    const next = jest.fn();

    token_checker(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.logged_user).toMatchObject(payload);
  });

  it("should return 403 when token is invalid", () => {
    const req = {
      headers: { "x-access-token": "invalid.token.value" },
    };
    const res = createRes();
    const next = jest.fn();

    token_checker(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith({
      error: "Failed to authenticate token.",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

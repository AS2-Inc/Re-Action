import { jest } from "@jest/globals";
import check_role from "../../app/middleware/role_checker.js";

describe("RoleChecker Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { logged_user: null };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should call next() if user has allowed role", () => {
    req.logged_user = { role: "admin" };
    const middleware = check_role(["admin", "operator"]);
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if no logged_user", () => {
    const middleware = check_role(["admin"]);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user role is not allowed", () => {
    req.logged_user = { role: "citizen" };
    const middleware = check_role(["admin"]);
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});

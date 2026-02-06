import { jest } from "@jest/globals";
import error_handler from "../../../app/middleware/error_handler.js";

describe("error_handler middleware", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  const createRes = () => {
    const res = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    return res;
  };

  it("should default to 500 when no statusCode is set", () => {
    const res = createRes();
    const err = new Error("Something went wrong");
    process.env.NODE_ENV = "development";

    error_handler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Something went wrong",
        stack: expect.any(String),
      }),
    );
  });

  it("should respect an existing non-200 res.statusCode", () => {
    const res = createRes();
    res.statusCode = 404;
    const err = new Error("Not found");
    process.env.NODE_ENV = "development";

    error_handler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Not found",
      }),
    );
  });

  it("should omit stack trace in production", () => {
    const res = createRes();
    const err = new Error("Prod error");
    process.env.NODE_ENV = "production";

    error_handler(err, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Prod error",
        stack: undefined,
      }),
    );
  });
});

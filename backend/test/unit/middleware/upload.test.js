import { jest } from "@jest/globals";

const mockDiskStorage = jest.fn();
const mockMulter = jest.fn().mockReturnValue({ single: jest.fn() });
mockMulter.diskStorage = mockDiskStorage;

jest.unstable_mockModule("multer", () => ({
  default: mockMulter,
}));

const mockMkdirSync = jest.fn();
const mockExistsSync = jest.fn().mockReturnValue(true);
jest.unstable_mockModule("node:fs", () => ({
  default: {
    mkdirSync: mockMkdirSync,
    existsSync: mockExistsSync,
  },
}));

// Import the module AFTER mocks are set up to trigger execution
await import("../../../app/middleware/upload.js");

describe("Upload Middleware Configuration", () => {
  it("should configure multer with file filter and limits", () => {
    expect(mockMulter).toHaveBeenCalledWith(
      expect.objectContaining({
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: expect.any(Function),
      }),
    );
  });

  it("should ensure uploads directory exists", () => {
    // init logic ran on import
    expect(mockExistsSync).toHaveBeenCalledWith("uploads");
    // if returns false, it should call mkdirSync. We returned true.
  });

  describe("fileFilter", () => {
    let fileFilter;
    beforeAll(() => {
      const config = mockMulter.mock.calls[0][0];
      fileFilter = config.fileFilter;
    });

    it("should accept image files", () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: "image/jpeg" }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it("should reject non-image files", () => {
      const cb = jest.fn();
      fileFilter({}, { mimetype: "application/pdf" }, cb);
      expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });
});

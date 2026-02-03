import { jest } from "@jest/globals";
// import { upload } from '../../app/middleware/upload.js'; // REMOVED to allow mocking

// We can test the fileFilter function specifically used by multer
// Since `upload` is a multer instance, we can inspect its configuration if exposed, or test the logic by extracting it?
// Usually, we can't easily extract config from multer instance.
// But we exported `const file_filter`? No, it's not exported.
// We only exported `upload`.
// However, we can TRY to mock multer and verify it was called with correct config?
// But `upload.js` creates the instance at top level.

// Alternative: Test that it rejects non-image files via integration?
// Or we can mock `multer` module to define `diskStorage` and just test passed functions.

// Since `upload.js` executes code on import (fs.mkdirSync), we should mock `fs` too.

const mockDiskStorage = jest.fn();
const mockMulter = jest.fn().mockReturnValue({ single: jest.fn() });
mockMulter.diskStorage = mockDiskStorage;

jest.unstable_mockModule("multer", () => ({
  default: mockMulter,
}));

const mockMkdirSync = jest.fn();
const mockExistsSync = jest.fn().mockReturnValue(true); // Don't try create dir
jest.unstable_mockModule("node:fs", () => ({
  default: {
    mkdirSync: mockMkdirSync,
    existsSync: mockExistsSync,
  },
}));

// Import the module AFTER mocks are set up to trigger execution
await import("../../app/middleware/upload.js");

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

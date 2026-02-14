import { jest } from "@jest/globals";

// Define mocks
const mockUserFindOne = jest.fn();
const mockUserFindById = jest.fn();
const mockUserSave = jest.fn();
const mockBadgeFind = jest.fn();
const mockEmailSend = jest.fn();
const mockHash = jest.fn();
const mockIsValid = jest.fn();
const mockIsWeak = jest.fn();
const mockJwtSign = jest.fn();
const mockVerifyIdToken = jest.fn();

// Mock dependencies
const MockUser = jest.fn(() => ({ save: mockUserSave }));
MockUser.findOne = mockUserFindOne;
MockUser.findById = mockUserFindById;

const MockBadge = {
  find: mockBadgeFind,
};

jest.unstable_mockModule("../../../app/models/user.js", () => ({
  default: MockUser,
}));
jest.unstable_mockModule("../../../app/models/badge.js", () => ({
  default: MockBadge,
}));

jest.unstable_mockModule("../../../app/services/email_service.js", () => ({
  default: {
    send_activation_email: mockEmailSend,
    send_password_reset_email: mockEmailSend,
  },
}));

jest.unstable_mockModule("../../../app/utils/security.js", () => ({
  hash_password: mockHash,
  is_password_valid: mockIsValid,
  is_password_weak: mockIsWeak,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: mockJwtSign,
  },
}));

jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// Import Module Under Test
const UserService = await import("../../../app/services/user_service.js");

describe("UserService (Unit)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.SUPER_SECRET = "test-secret";
    process.env.GOOGLE_CLIENT_ID = "google-client-id";

    // Default mock implementations
    mockUserFindOne.mockReturnValue({ exec: async () => null }); // Default not found
    mockHash.mockResolvedValue("hashed_password");
    mockIsValid.mockResolvedValue(true);
    mockIsWeak.mockReturnValue(false);
    mockJwtSign.mockReturnValue("mock-token");
  });

  describe("login", () => {
    it("should return token for valid credentials", async () => {
      const mockUser = {
        _id: "user-1",
        email: "test@example.com",
        password: "hashed_password",
        is_active: true,
        role: "citizen",
      };
      mockUserFindOne.mockReturnValue({ exec: async () => mockUser });

      const result = await UserService.login("test@example.com", "password");

      expect(result.token).toBe("mock-token");
      expect(result.email).toBe("test@example.com");
      expect(mockIsValid).toHaveBeenCalledWith("password", "hashed_password");
    });

    it("should throw if user not found", async () => {
      mockUserFindOne.mockReturnValue({ exec: async () => null });
      await expect(UserService.login("test@example.com", "pw")).rejects.toThrow(
        "User not found",
      );
    });

    it("should throw if password invalid", async () => {
      mockUserFindOne.mockReturnValue({
        exec: async () => ({ password: "hash", is_active: true }),
      });
      mockIsValid.mockResolvedValue(false);

      await expect(UserService.login("test@example.com", "pw")).rejects.toThrow(
        "Wrong password",
      );
    });

    it("should throw if account inactive", async () => {
      mockUserFindOne.mockReturnValue({
        exec: async () => ({ password: "hash", is_active: false }),
      });
      await expect(UserService.login("test@example.com", "pw")).rejects.toThrow(
        "Account not activated",
      );
    });
  });

  describe("register", () => {
    it("should register a new user", async () => {
      mockUserFindOne.mockResolvedValue(null); // No existing user

      const userData = {
        name: "John",
        surname: "Doe",
        email: "new@example.com",
        password: "StrongPassword1!",
        age: 25,
      };

      await UserService.register(userData);

      expect(MockUser).toHaveBeenCalled();
      // Check constructor args?
      const args = MockUser.mock.calls[0][0];
      expect(args.email).toBe("new@example.com");
      expect(args.password).toBe("hashed_password");
      expect(mockUserSave).toHaveBeenCalled();
      // expect(mockEmailSend).toHaveBeenCalled(); // TODO in code
    });

    it("should throw if email exists", async () => {
      mockUserFindOne.mockResolvedValue({ _id: "existing" });
      await expect(
        UserService.register({ email: "exist@e.com" }),
      ).rejects.toThrow("Email already exists");
    });

    it("should throw if password weak", async () => {
      mockUserFindOne.mockResolvedValue(null);
      mockIsWeak.mockReturnValue(true);
      await expect(
        UserService.register({ email: "new@e.com", password: "weak" }),
      ).rejects.toThrow("Password is too weak");
    });
  });

  describe("change_password", () => {
    it("should change password", async () => {
      const mockUser = {
        _id: "user-1",
        password: "old_hash",
        save: mockUserSave,
      };
      mockUserFindById.mockResolvedValue(mockUser);

      await UserService.change_password("user-1", "old", "new");

      expect(mockIsValid).toHaveBeenCalledWith("old", "old_hash");
      expect(mockHash).toHaveBeenCalledWith("new");
      expect(mockUserSave).toHaveBeenCalled();
      expect(mockUser.password).toBe("hashed_password");
    });
  });

  // Check google_auth briefly
  describe("google_auth", () => {
    it("should login existing google user", async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: "google@e.com",
          given_name: "G",
          family_name: "U",
        }),
      });

      mockUserFindOne.mockReturnValue({
        exec: async () => ({
          _id: "user-g",
          email: "google@e.com",
        }),
      });

      const result = await UserService.google_auth("token");
      expect(result.token).toBe("mock-token");
    });
  });
});

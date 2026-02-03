import { jest } from "@jest/globals";
import EmailService from "../../app/services/email_service.js";

describe("EmailService", () => {
  let sendMailMock;

  beforeEach(() => {
    // Mock the transporter's sendMail method
    sendMailMock = jest
      .fn()
      .mockResolvedValue({ messageId: "test-message-id" });
    EmailService.transporter = {
      sendMail: sendMailMock,
    };
    // Spy on console.error to keep output clean during expected errors
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("send_email", () => {
    it("should send an email successfully", async () => {
      const to = "test@example.com";
      const subject = "Test Subject";
      const html = "<p>Test Body</p>";

      const result = await EmailService.send_email(to, subject, html);

      expect(sendMailMock).toHaveBeenCalledWith({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html,
      });
      expect(result).toHaveProperty("messageId", "test-message-id");
    });

    it("should handle errors gracefully", async () => {
      sendMailMock.mockRejectedValue(new Error("SMTP Error"));

      const result = await EmailService.send_email(
        "test@example.com",
        "Subject",
        "Body",
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("send_activation_email", () => {
    it("should send an activation email with correct link", async () => {
      const email = "user@example.com";
      const token = "activation-token-123";

      await EmailService.send_activation_email(email, token);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const callArgs = sendMailMock.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toBe("Attiva il tuo account Re:Action");
      expect(callArgs.html).toContain("activation-token-123");
      expect(callArgs.html).toContain(
        "/users/activate?token=activation-token-123",
      );
    });
  });

  describe("send_password_reset_email", () => {
    it("should send a password reset email with correct link", async () => {
      const email = "user@example.com";
      const token = "reset-token-456";

      await EmailService.send_password_reset_email(email, token);

      expect(sendMailMock).toHaveBeenCalledTimes(1);
      const callArgs = sendMailMock.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
      expect(callArgs.subject).toBe("Re:Action - Recupero Password");
      expect(callArgs.html).toContain("reset-token-456");
      expect(callArgs.html).toContain(
        "/users/reset-password?token=reset-token-456",
      );
    });
  });
});

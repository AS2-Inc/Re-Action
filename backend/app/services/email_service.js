import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.init_transporter();
    this.base_url = "http://localhost:5005/api/v1";
  }

  async init_transporter() {
    // Determine which transport to use based on environment
    // Use real SMTP in production
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send_email(to, subject, html) {
    if (!this.transporter) await this.init_transporter();

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: to,
        subject: subject,
        html: html,
      });

      console.log(`📧 Email sent: ${info.messageId}`);

      return info;
    } catch (error) {
      console.error("❌ Error sending email:", error);
      // Don't throw to prevent crashing the response flow, just log
      return null;
    }
  }

  async send_activation_email(email, token) {
    const link = `${this.base_url}/users/activate?token=${token}`;
    const html = `
      <h1>Benvenuto in Re:Action!</h1>
      <p>Grazie per esserti registrato. Per attivare il tuo account, clicca sul link seguente:</p>
      <a href="${link}">Attiva Account</a>
      <p>Il link scadrà tra 12 ore.</p>
    `;
    return this.send_email(email, "Attiva il tuo account Re:Action", html);
  }

  async send_password_reset_email(email, token) {
    const link = `${this.base_url}/users/reset-password?token=${token}`;
    const html = `
      <h1>Recupero Password</h1>
      <p>Hai richiesto il reset della password. Clicca sul link seguente per procedere:</p>
      <a href="${link}">Reset Password</a>
      <p>Il link scadrà tra 1 ora.</p>
      <p>Se non hai richiesto tu il reset, ignora questa email.</p>
    `;
    return this.send_email(email, "Re:Action - Recupero Password", html);
  }
}

export default new EmailService();

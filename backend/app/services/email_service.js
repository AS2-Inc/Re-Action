import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.init_transporter();
    const port = process.env.PORT || 5000;
    this.base_url =
      process.env.BACKEND_BASE_URL || `http://localhost:${port}/api/v1`;
    this.frontend_url =
      process.env.FRONTEND_BASE_URL || "http://localhost:5173";
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
      connectionTimeout: 5000, // 5 seconds
      socketTimeout: 15000, // 15 seconds
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

      console.log(`📧 Email sent: ${html}`);

      return { success: true, info };
    } catch (error) {
      console.error("❌ Error sending email:", error);
      // Don't throw to prevent crashing the response flow, just log
      return { success: false, error };
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

  async send_operator_activation_email(email, token) {
    const link = `${this.frontend_url}/operator/activate?token=${token}`;
    const html = `
      <h1>Benvenuto in Re:Action!</h1>
      <p>Sei stato registrato come operatore. Per attivare il tuo account e impostare la password, clicca sul link seguente:</p>
      <a href="${link}">Attiva Account Operatore</a>
      <p>Il link scadrà tra 12 ore.</p>
    `;
    return this.send_email(
      email,
      "Re:Action - Attivazione Account Operatore",
      html,
    );
  }

  async send_password_reset_email(email, token, type = "user") {
    const link = `${this.frontend_url}/reset-password?token=${token}&type=${type}`;
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

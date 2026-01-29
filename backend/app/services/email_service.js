import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
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

  async sendEmail(to, subject, html) {
    if (!this.transporter) await this.initTransporter();

    try {
      const info = await this.transporter.sendMail({
        from: '"Re:Action Team" <no-reply@reaction.com>',
        to: to,
        subject: subject,
        html: html,
      });

      console.log(`📧 Email sent: ${info.messageId}`);

      // If using Ethereal, log the preview URL
      if (nodemailer.getTestMessageUrl(info)) {
        console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }

      return info;
    } catch (error) {
      console.error("❌ Error sending email:", error);
      // Don't throw to prevent crashing the response flow, just log
      return null;
    }
  }

  async sendActivationEmail(email, token) {
    const link = `http://localhost:5173/activate?token=${token}`; // TODO: Use env var for frontend URL
    const html = `
      <h1>Benvenuto in Re:Action!</h1>
      <p>Grazie per esserti registrato. Per attivare il tuo account, clicca sul link seguente:</p>
      <a href="${link}">Attiva Account</a>
      <p>Il link scadrà tra 12 ore.</p>
    `;
    return this.sendEmail(email, "Attiva il tuo account Re:Action", html);
  }

  async sendPasswordResetEmail(email, token) {
    const link = `http://localhost:5173/reset-password?token=${token}`;
    const html = `
      <h1>Recupero Password</h1>
      <p>Hai richiesto il reset della password. Clicca sul link seguente per procedere:</p>
      <a href="${link}">Reset Password</a>
      <p>Il link scadrà tra 1 ora.</p>
      <p>Se non hai richiesto tu il reset, ignora questa email.</p>
    `;
    return this.sendEmail(email, "Re:Action - Recupero Password", html);
  }
}

export default new EmailService();

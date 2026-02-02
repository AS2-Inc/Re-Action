/**
 * Middleware to validate that required fields are present in req.body.
 * @param {string[]} fields - Array of required field names
 */
export const validate_required = (fields) => {
  return (req, res, next) => {
    // If multipart/form-data, logic might differ if not parsed yet,
    // but assuming express.json/urlencoded or multer ran before this.
    // Multer populates req.body for text fields.

    for (const field of fields) {
      if (!req.body[field]) {
        // Special messaging for login
        if (
          fields.includes("email") &&
          fields.includes("password") &&
          fields.length === 2
        ) {
          return res.status(400).json({ error: "Missing email or password" });
        }
        return res.status(400).json({ error: "Missing required fields" });
      }
    }
    next();
  };
};

// Regex for basic email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validate_email_format = (req, res, next) => {
  if (req.body.email && !EMAIL_REGEX.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  next();
};

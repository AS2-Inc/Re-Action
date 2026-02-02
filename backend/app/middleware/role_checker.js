/**
 * Middleware checks if the user has the required role.
 * @param {string[]} allowed_roles - Array of allowed roles (e.g., ['admin', 'operator'])
 */
const check_role = (allowed_roles) => {
  return (req, res, next) => {
    if (!req.logged_user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowed_roles.includes(req.logged_user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    next();
  };
};

export default check_role;

// https://github.com/unitn-software-engineering/EasyLib/blob/master/app/tokenChecker.js
import jwt from "jsonwebtoken";

const tokenChecker = (req, res, next) => {
  // check header or url parameters or post parameters for token
  var token = req.headers["x-access-token"];

  // if there is no token
  if (!token) {
    return res.status(401).send({ error: "No token provided." });
  }

  // decode token, verifies secret and checks exp
  jwt.verify(token, process.env.SUPER_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: "Failed to authenticate token." });
    } else {
      // if everything is good, save to request for use in other routes
      req.loggedUser = decoded;
      next();
    }
  });
};

export default tokenChecker;

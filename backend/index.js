import bcrypt from "bcrypt";
import { mongoose } from "mongoose";
import app from "./app/app.js";
import Operator from "./app/models/operator.js";
import scheduler from "./app/services/scheduler.js";
import badgeService from "./app/services/badge_service.js";

const port = process.env.PORT || 8080;

app.locals.db = mongoose
  .connect(process.env.DB_URL)
  .then(async () => {
    console.log("Connected to Database");

    // Create Admin User if not exists from env variables
    const admin_email = process.env.ADMIN_EMAIL;
    const admin_password = process.env.ADMIN_PASSWORD;

    if (admin_email && admin_password) {
      const admin = await Operator.findOne({ email: admin_email });
      if (!admin) {
        await Operator.create({
          name: "Admin",
          surname: "User",
          email: admin_email,
          password: bcrypt.hashSync(admin_password, 10),
          role: "admin",
          is_active: true,
        });
        console.log("Admin user created");
      }
    }

    // Initialize Scheduler
    scheduler.init();

    // Initialize Badge Service
    badgeService.initializeDefaultBadges();

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to database", err);
  });

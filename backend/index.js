import { mongoose } from "mongoose";
import app from "./app/app.js";
import User from "./app/models/user.js";
import { startTaskScheduler } from "./app/services/task_scheduler.js";
import badgeService from "./app/services/badge_service.js";

const port = process.env.PORT || 8080;

app.locals.db = mongoose
  .connect(process.env.DB_URL)
  .then(async () => {
    console.log("Connected to Database");

    // Initialize default badges (RF4)
    await badgeService.initializeDefaultBadges();

    // Start task scheduler (RF6)
    startTaskScheduler();

    // Create Admin User if not exists from env variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        await User.create({
          name: "Admin",
          surname: "User",
          email: adminEmail,
          password: adminPassword,
          role: "admin",
          active: true,
        });
        console.log("Admin user created");
      }
    }

    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to database", err);
  });

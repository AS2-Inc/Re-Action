import express from "express";
import users from "./users.js";
import neighborhood from "./neighborhood.js";
import tasks from "./task.js";
import rewards from "./rewards.js";
import operators from "./operators.js";
import notifications from "./notifications.js";

const router = express.Router();

router.use("/users", users);
router.use("/neighborhood", neighborhood);
router.use("/tasks", tasks);
router.use("/rewards", rewards);
router.use("/operators", operators);
router.use("/notifications", notifications);

export default router;

import express from "express";
import neighborhood from "./neighborhood.js";
import notifications from "./notifications.js";
import operators from "./operators.js";
import quiz from "./quiz.js";
import rewards from "./rewards.js";
import stats from "./stats.js";
import tasks from "./task.js";
import users from "./users.js";

const router = express.Router();

router.use("/users", users);
router.use("/neighborhood", neighborhood);
router.use("/tasks", tasks);
router.use("/quizzes", quiz);
router.use("/rewards", rewards);
router.use("/operators", operators);
router.use("/notifications", notifications);
router.use("/stats", stats);

export default router;

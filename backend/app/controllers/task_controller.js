import * as TaskService from "../services/task_service.js";

export const get_user_tasks = async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.logged_user.role !== "citizen") {
    return res.status(403).json({ error: "Unauthorized: Citizens only" });
  }

  try {
    const tasks = await TaskService.get_user_tasks(req.logged_user.id);
    res.status(200).json(tasks);
  } catch (error) {
    if (error.message === "User not found") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const submit_task = async (req, res) => {
  if (!req.logged_user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.logged_user.role !== "citizen") {
    return res.status(403).json({ error: "Unauthorized: Citizens only" });
  }

  try {
    const task_id = req.body.task_id;
    let proof = {};

    // Handle Proof data
    // If it's multipart/form-data, non-file fields are in req.body
    if (req.body.proof) {
      // Try parsing if it came as a JSON string (common in some clients sending multipart)
      try {
        proof =
          typeof req.body.proof === "string"
            ? JSON.parse(req.body.proof)
            : req.body.proof;
      } catch (_e) {
        proof = req.body.proof;
      }
    }

    // Attach photo if present
    if (req.file) {
      proof.photo_url = `/uploads/${req.file.filename}`;
    }

    const result = await TaskService.submit_task(
      req.logged_user.id,
      task_id,
      proof,
    );
    res.status(200).json(result);
  } catch (error) {
    // If validation fails
    if (
      error.message === "Verification failed" ||
      error.message.includes("Distance") ||
      error.message.includes("QR Code") ||
      error.message.includes("Quiz") ||
      error.message.includes("Photo") ||
      error.message.includes("Missing")
    ) {
      return res.status(400).json({ error: error.message });
    } else if (
      error.message === "Task not found" ||
      error.message === "Quiz not found" ||
      error.message === "Task not assigned or expired"
    ) {
      // Added "Task not assigned or expired" to 404/400? Original router comments were vague, but logic in service throws it.
      // Let's treat "Task not assigned" as 400 or 403? Original router didn't catch it explicitly but service now throws it.
      // I'll return 400 for consistency with "Validation failed" flow or 404 if not found.
      // "Task not assigned or expired" implies user shouldn't be doing it.
      return res.status(400).json({ error: error.message });
    }
    console.error("Error submitting task:", error);
    res.status(500).json({ error: `Failed to submit task: ${error.message}` });
  }
};

export const create_task = async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized: Operators only" });
  }
  // TODO: add validation
  try {
    const task = await TaskService.create_task(req.body);
    res.location(`/api/v1/tasks/${task.id}`).status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const get_submissions = async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const filter = {};
  if (req.body?.status) filter.status = req.body.status;

  try {
    const submissions = await TaskService.get_submissions(filter);
    res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const verify_submission = async (req, res) => {
  if (req.logged_user.role !== "operator" && req.logged_user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!req.body.verdict) {
    return res.status(400).json({ error: "Verdict required" });
  }

  try {
    const result = await TaskService.verify_submission(
      req.params.id,
      req.body.verdict,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error.message === "Submission not found") {
      return res.status(404).json({ error: error.message });
    } else if (
      error.message === "Submission is already processed" ||
      error.message.includes("Invalid verdict")
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error verifying submission:", error);
    res.status(500).json({ error: "Failed to verify submission" });
  }
};

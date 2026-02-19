import ServiceError from "../errors/service_error.js";
import * as TaskService from "../services/task_service.js";

export const get_user_tasks = async (req, res) => {
  try {
    const tasks = await TaskService.get_user_tasks(req.logged_user.id);
    res.status(200).json(tasks);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const submit_task = async (req, res) => {
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
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error submitting task:", error);
    res.status(500).json({ error: "Failed to submit task" });
  }
};

export const create_task = async (req, res) => {
  try {
    const task = await TaskService.create_task(req.body);
    res.location(`/api/v1/tasks/${task.id}`).status(201).json(task);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const get_submissions = async (req, res) => {
  const filter = {};
  if (req.body?.status) filter.status = req.body.status;

  try {
    const submissions = await TaskService.get_submissions(filter);
    res.status(200).json(submissions);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const verify_submission = async (req, res) => {
  try {
    const result = await TaskService.verify_submission(
      req.params.id,
      req.body.verdict,
    );
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error verifying submission:", error);
    res.status(500).json({ error: "Failed to verify submission" });
  }
};

export const get_task = async (req, res) => {
  try {
    const task = await TaskService.get_task(req.params.id);
    res.status(200).json(task);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
};

export const update_task = async (req, res) => {
  try {
    const updates = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      difficulty: req.body.difficulty,
      frequency: req.body.frequency,
      verification_method: req.body.verification_method,
      base_points: req.body.base_points,
      is_active: req.body.is_active,
      neighborhood_id: req.body.neighborhood_id || null,
      impact_metrics: req.body.impact_metrics,
      verification_criteria: req.body.verification_criteria,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });

    const task = await TaskService.update_task(req.params.id, updates);
    res.status(200).json(task);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

export const delete_task = async (req, res) => {
  try {
    await TaskService.delete_task(req.params.id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

export const get_all_tasks = async (_req, res) => {
  try {
    const tasks = await TaskService.get_all_tasks();
    res.status(200).json(tasks);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

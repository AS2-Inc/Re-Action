import * as db from "../../db_helper.js";

const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const Operator = (await import("../../../app/models/operator.js")).default;
const Task = (await import("../../../app/models/task.js")).default;
const TaskTemplate = (await import("../../../app/models/task_template.js"))
  .default;
const TaskTemplateService = (
  await import("../../../app/services/task_template_service.js")
).default;

describe("Task Templates API (RF11)", () => {
  let operatorToken;
  let template;

  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret";

    // Initialize default templates
    await TaskTemplateService.initialize_default_templates();
  });

  afterEach(async () => {
    await db.clear();
    await TaskTemplateService.initialize_default_templates(); // Re-seed
  });

  afterAll(async () => {
    await db.close();
  });

  const createOperator = async () => {
    const op = new Operator({
      name: "Template",
      surname: "Master",
      email: "template@op.com",
      password: "hashedpassword",
      role: "operator",
      is_active: true,
    });
    await op.save();
    return jwt.sign(
      { email: op.email, id: op._id, role: op.role },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  };

  beforeEach(async () => {
    operatorToken = await createOperator();
    template = await TaskTemplate.findOne({ name: "Daily Walk" });
  });

  describe("GET /api/v1/tasks/templates", () => {
    it("should list available templates", async () => {
      const res = await request(app)
        .get("/api/v1/tasks/templates")
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const names = res.body.map((t) => t.name);
      expect(names).toContain("Daily Walk");
    });
  });

  describe("GET /api/v1/tasks/templates/:id", () => {
    it("should return template details", async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/templates/${template._id}`)
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Daily Walk");
      expect(res.body.configurable_fields).toBeDefined();
    });

    it("should return 404 for non-existent template", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/tasks/templates/${fakeId}`)
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/v1/tasks/from-template", () => {
    it("should create a task from template", async () => {
      const taskData = {
        template_id: template._id,
        title: "My Daily Walk",
        description: "Walk in the park",
        min_distance_meters: 2000, // Configurable field
      };

      const res = await request(app)
        .post("/api/v1/tasks/from-template")
        .set("x-access-token", operatorToken)
        .send(taskData);

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("My Daily Walk");
      expect(res.body.category).toBe("Mobility"); // Inherited from template
      expect(res.body.verification_criteria.min_distance_meters).toBe(2000);

      // Verify task is saved in DB
      const savedTask = await Task.findById(res.body._id);
      expect(savedTask).toBeDefined();
      expect(savedTask.template_id.toString()).toBe(template._id.toString());
    });

    it("should validate required configurable fields", async () => {
      // "Daily Walk" requires "min_distance_meters"
      const taskData = {
        template_id: template._id,
        title: "Invalid Walk",
        description: "Missing distance",
      };

      const res = await request(app)
        .post("/api/v1/tasks/from-template")
        .set("x-access-token", operatorToken)
        .send(taskData);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Required field missing");
    });

    it("should validate points range", async () => {
      // "Daily Walk" range is 5-30
      const taskData = {
        template_id: template._id,
        title: "Huge Points Walk",
        description: "Walk",
        min_distance_meters: 1000,
        base_points: 1000,
      };

      const res = await request(app)
        .post("/api/v1/tasks/from-template")
        .set("x-access-token", operatorToken)
        .send(taskData);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Points must be between");
    });
  });
});

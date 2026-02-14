import * as db from "../../db_helper.js";

const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../../../app/app.js")).default;
const Operator = (await import("../../../app/models/operator.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Neighborhood = (await import("../../../app/models/neighborhood.js"))
  .default;
const Task = (await import("../../../app/models/task.js")).default;
const Submission = (await import("../../../app/models/submission.js")).default;

describe("Operator Dashboard API (RF10)", () => {
  let operatorToken;
  let neighborhood;
  let task;

  beforeAll(async () => {
    await db.connect();
    process.env.SUPER_SECRET = "test-secret";
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const createOperator = async () => {
    const op = new Operator({
      name: "Dashboard",
      surname: "Master",
      email: "dashboard@op.com",
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

  const seedData = async () => {
    // 1. Create Neighborhood
    neighborhood = await Neighborhood.create({
      name: "Green Valley",
      city: "EcoCity",
      description: "A green place",
      total_score: 100,
      ranking_position: 1,
      environmental_data: { co2: 50 },
    });

    // 2. Create User
    const user = await User.create({
      name: "Citizen",
      surname: "One",
      email: "citizen@test.com",
      password: "pass",
      role: "citizen",
      is_active: true,
      neighborhood_id: neighborhood._id,
    });

    // 3. Create Task
    task = await Task.create({
      title: "Recycle Paper",
      description: "Recycle old paper",
      category: "Waste",
      difficulty: "Low",
      base_points: 10,
      is_active: true,
      verification_method: "MANUAL_REPORT",
    });

    // 4. Create Submissions (Pending and Approved)
    await Submission.create({
      user_id: user._id,
      task_id: task._id,
      neighborhood_id: neighborhood._id,
      status: "PENDING",
      submitted_at: new Date(),
      proof: "image.jpg",
    });

    await Submission.create({
      user_id: user._id,
      task_id: task._id,
      neighborhood_id: neighborhood._id,
      status: "APPROVED",
      submitted_at: new Date(Date.now() - 86400000), // Yesterday
      completed_at: new Date(Date.now() - 86400000),
      points_awarded: 10,
      proof: "verified.jpg",
    });
  };

  beforeEach(async () => {
    operatorToken = await createOperator();
    await seedData();
  });

  describe("GET /api/v1/operators/dashboard", () => {
    it("should return dashboard overview stats", async () => {
      const res = await request(app)
        .get("/api/v1/operators/dashboard")
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.total_users).toBe(1);
      expect(res.body.stats.total_tasks).toBe(1);
      expect(res.body.stats.pending_submissions).toBe(1);
      expect(res.body.neighborhoods).toBeDefined();
      expect(res.body.recent_pending_submissions).toHaveLength(1);
    });
  });

  describe("GET /api/v1/operators/dashboard/neighborhoods", () => {
    it("should return neighborhood summaries", async () => {
      const res = await request(app)
        .get("/api/v1/operators/dashboard/neighborhoods")
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe("Green Valley");
      expect(res.body[0].user_count).toBeDefined();
    });
  });

  describe("GET /api/v1/operators/dashboard/neighborhoods/:id", () => {
    it("should return detailed neighborhood stats", async () => {
      const res = await request(app)
        .get(`/api/v1/operators/dashboard/neighborhoods/${neighborhood._id}`)
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(res.body.neighborhood).toBeDefined();
      expect(res.body.neighborhood.name).toBe("Green Valley");
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.total_users).toBe(1);
      expect(res.body.daily_activity).toBeDefined();
    });

    it("should return 404 for non-existent neighborhood", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/operators/dashboard/neighborhoods/${fakeId}`)
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/v1/operators/dashboard/environmental", () => {
    it("should return aggregated environmental indicators", async () => {
      const res = await request(app)
        .get("/api/v1/operators/dashboard/environmental")
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(res.body.overall).toBeDefined();
      expect(res.body.by_neighborhood).toBeDefined();
      expect(res.body.by_neighborhood).toHaveLength(1);
    });
  });

  describe("GET /api/v1/operators/reports/stats", () => {
    it("should generate stats report", async () => {
      const res = await request(app)
        .get("/api/v1/operators/reports/stats")
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      expect(res.body.period).toBeDefined();
      expect(res.body.data).toBeDefined();
      // "Green Valley" should appear in data
      expect(res.body.data["Green Valley"]).toBeDefined();
      expect(res.body.data["Green Valley"].total_points).toBe(10);
    });

    it("should respect date filters", async () => {
      // Future date range -> should return empty
      const futureStart = new Date();
      futureStart.setFullYear(futureStart.getFullYear() + 1);

      const res = await request(app)
        .get("/api/v1/operators/reports/stats")
        .query({ start_date: futureStart.toISOString() })
        .set("x-access-token", operatorToken);

      expect(res.status).toBe(200);
      // Data might be empty or neighborhood keys present but with 0 counts
      // The implementation iterates over submissions, so if no submissions match, data should be empty
      // BUT WAIT: The implementation iterates over aggregations of submissions.
      // If none match, aggregation returns empty array.
      // So report_data will be empty object {}.
      expect(Object.keys(res.body.data).length).toBe(0);
    });
  });
});

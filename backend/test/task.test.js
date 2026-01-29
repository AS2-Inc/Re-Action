import { jest } from "@jest/globals";

// Define mocks BEFORE importing the app
jest.unstable_mockModule("../app/services/email_service.js", () => ({
  default: {
    sendActivationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.unstable_mockModule("../app/services/badgeService.js", () => ({
  default: {
    onPointsUpdated: jest.fn().mockResolvedValue([]),
    onTaskCompleted: jest.fn().mockResolvedValue([]),
    onStreakUpdated: jest.fn().mockResolvedValue([]),
    onEnvironmentalStatsUpdated: jest.fn().mockResolvedValue([]),
    _getAllBadges: jest.fn().mockResolvedValue([]),
    initializeBadges: jest.fn().mockResolvedValue(),
  },
}));

// Now import the app and other dependencies
const request = (await import("supertest")).default;
const mongoose = (await import("mongoose")).default;
const jwt = (await import("jsonwebtoken")).default;
const app = (await import("../app/app.js")).default;
const Task = (await import("../app/models/task.js")).default;
const Activity = (await import("../app/models/activity.js")).default;
const User = (await import("../app/models/user.js")).default;
const Neighborhood = (await import("../app/models/neighborhood.js")).default;

// Mock the model methods
const mockTaskFindById = jest.fn();
const mockTaskFind = jest.fn();
const mockTaskSave = jest.fn();
const mockActivityFindOne = jest.fn();
const mockActivityFind = jest.fn();
const mockActivityFindById = jest.fn();
const mockActivitySave = jest.fn();
const mockUserFindById = jest.fn();
const mockUserSave = jest.fn();
const mockNeighborhoodFindById = jest.fn();
const mockNeighborhoodSave = jest.fn();

Task.findById = mockTaskFindById;
Task.find = mockTaskFind;
Activity.findOne = mockActivityFindOne;
Activity.find = mockActivityFind;
Activity.findById = mockActivityFindById;
User.findById = mockUserFindById;
Neighborhood.findById = mockNeighborhoodFindById;

describe("Task API Endpoints", () => {
  let citizenToken;
  let adminToken;
  let operatorToken;

  beforeAll(() => {
    // Create valid tokens for testing
    process.env.SUPER_SECRET = "test-secret-key";

    citizenToken = jwt.sign(
      { email: "citizen@example.com", id: "citizen123", role: "citizen" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );

    adminToken = jwt.sign(
      { email: "admin@example.com", id: "admin123", role: "admin" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );

    operatorToken = jwt.sign(
      { email: "operator@example.com", id: "operator123", role: "operator" },
      process.env.SUPER_SECRET,
      { expiresIn: 86400 },
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTaskFindById.mockReset();
    mockTaskFind.mockReset();
    mockTaskSave.mockReset();
    mockActivityFindOne.mockReset();
    mockActivityFind.mockReset();
    mockActivityFindById.mockReset();
    mockActivitySave.mockReset();
    mockUserFindById.mockReset();
    mockUserSave.mockReset();
    mockNeighborhoodFindById.mockReset();
    mockNeighborhoodSave.mockReset();
  });

  afterAll(async () => {
    // Close database connections if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe("GET /api/v1/tasks", () => {
    it("should return tasks for logged-in user with status 200", async () => {
      const mockUser = {
        _id: "citizen123",
        neighborhood_id: "neighborhood123",
        populate: jest.fn().mockResolvedValue({
          _id: "citizen123",
          neighborhood_id: "neighborhood123",
        }),
      };

      const mockTasks = [
        {
          _id: "task1",
          title: "Recycle Bottles",
          description: "Recycle 10 bottles",
          points: 50,
          neighborhood_id: "neighborhood123",
        },
        {
          _id: "task2",
          title: "Plant a Tree",
          description: "Plant one tree in your neighborhood",
          points: 100,
          neighborhood_id: null,
        },
      ];

      mockUserFindById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });
      mockTaskFind.mockResolvedValue(mockTasks);

      const response = await request(app)
        .get("/api/v1/tasks")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTasks);
      expect(mockUserFindById).toHaveBeenCalledWith("citizen123");
      expect(mockTaskFind).toHaveBeenCalledWith({
        $and: [
          {
            $or: [
              { neighborhood_id: "neighborhood123" },
              { neighborhood_id: null },
              { user_id: mockUser._id },
            ],
          },
          {
            $or: [{ expired: false }, { expired: { $exists: false } }],
          },
          { is_active: true },
        ],
      });
    });

    it("should return 401 when user is not logged in", async () => {
      const response = await request(app).get("/api/v1/tasks");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 404 when user is not found", async () => {
      mockUserFindById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .get("/api/v1/tasks")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "User not found");
    });
  });

  describe("POST /api/v1/tasks/create", () => {
    it("should create task when user is operator", async () => {
      const newTask = {
        title: "Clean Park",
        description: "Clean the local park",
        points: 75,
        verification_method: "manual",
      };

      const savedTask = {
        _id: "task123",
        ...newTask,
        id: "task123",
      };

      // Mock Task as a constructor that returns an object with save method
      jest.spyOn(Task.prototype, "save").mockResolvedValue(savedTask);

      const response = await request(app)
        .post("/api/v1/tasks/create")
        .set("x-access-token", operatorToken)
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.description).toBe(newTask.description);
      expect(response.header.location).toMatch(/\/api\/v1\/tasks\/.+/);
    });

    it("should create task when user is admin", async () => {
      const newTask = {
        title: "Clean Park",
        description: "Clean the local park",
        points: 75,
        verification_method: "manual",
      };

      const savedTask = {
        _id: "task123",
        ...newTask,
        id: "task123",
      };

      jest.spyOn(Task.prototype, "save").mockResolvedValue(savedTask);

      const response = await request(app)
        .post("/api/v1/tasks/create")
        .set("x-access-token", adminToken)
        .send(newTask);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(newTask.title);
      expect(response.body.description).toBe(newTask.description);
    });

    it("should return 403 when user is citizen", async () => {
      const newTask = {
        title: "Clean Park",
        description: "Clean the local park",
        points: 75,
      };

      const response = await request(app)
        .post("/api/v1/tasks/create")
        .set("x-access-token", citizenToken)
        .send(newTask);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "error",
        "Unauthorized: Operators only",
      );
    });

    it("should return 401 when no token is provided", async () => {
      const newTask = {
        title: "Clean Park",
        description: "Clean the local park",
        points: 75,
      };

      const response = await request(app)
        .post("/api/v1/tasks/create")
        .send(newTask);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/tasks/:id/submit", () => {
    it("should submit a manual task successfully", async () => {
      const mockTask = {
        _id: "task123",
        title: "Clean Park",
        base_points: 75,
        verification_method: "MANUAL_REPORT",
        repeatable: false,
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const savedActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "pending",
      };

      jest.spyOn(Activity.prototype, "save").mockResolvedValue(savedActivity);

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({ proof: { image: "base64string" } });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("submission_status", "PENDING");
      expect(mockTaskFindById).toHaveBeenCalledWith("task123");
    });

    it("should return 404 when task is not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/tasks/nonexistent/submit")
        .set("x-access-token", citizenToken)
        .send({ proof: {} });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Task not found");
    });

    it("should return 400 when non-repeatable task already completed", async () => {
      const mockTask = {
        _id: "task123",
        title: "Clean Park",
        base_points: 75,
        verification_method: "MANUAL_REPORT",
        repeatable: false,
      };

      const mockLastActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "approved",
        submitted_at: new Date(),
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockLastActivity),
      });

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({ proof: {} });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Task already completed or pending approval",
      );
    });

    it("should return 400 when repeatable task is in cooldown", async () => {
      const mockTask = {
        _id: "task123",
        title: "Clean Park",
        base_points: 75,
        verification_method: "MANUAL_REPORT",
        repeatable: true,
        cooldown_hours: 24,
      };

      const mockLastActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "approved",
        submitted_at: new Date(), // Just submitted
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockLastActivity),
      });

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({ proof: {} });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Task is in cooldown");
    });

    it("should auto-approve GPS task with valid location", async () => {
      const mockTask = {
        _id: "task123",
        title: "Visit Park",
        base_points: 50,
        verification_method: "GPS",
        repeatable: false,
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const mockUser = {
        _id: "citizen123",
        points: 100,
        tasks_completed: [],
        neighborhood_id: "neighborhood123",
        save: jest.fn().mockResolvedValue(this),
      };

      const mockNeighborhood = {
        _id: "neighborhood123",
        total_score: 500,
        save: jest.fn().mockResolvedValue(this),
      };

      mockUserFindById.mockResolvedValue(mockUser);
      mockNeighborhoodFindById.mockResolvedValue(mockNeighborhood);

      const savedActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "approved",
        completed_at: new Date(),
      };

      jest.spyOn(Activity.prototype, "save").mockResolvedValue(savedActivity);

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({
          evidence: { gps_location: { lat: 45.5152, lng: -122.6784 } },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("points_earned", 50);
      expect(response.body).toHaveProperty("submission_status", "APPROVED");
    });

    it("should update user ambient stats when task is approved", async () => {
      const mockTask = {
        _id: "task123",
        title: "Clean Park",
        base_points: 50,
        verification_method: "GPS",
        repeatable: false,
        impact_metrics: {
          co2_saved: 5,
          waste_recycled: 2,
          distance: 1,
        },
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const mockUser = {
        _id: "citizen123",
        points: 100,
        neighborhood_id: null,
        ambient: {
          co2_saved: 10,
          waste_recycled: 5,
          km_green: 2,
        },
        save: jest.fn().mockResolvedValue(this),
      };

      const mockNeighborhood = {
        _id: "neigh1",
        total_score: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserFindById.mockResolvedValue(mockUser);
      mockNeighborhoodFindById.mockResolvedValue(mockNeighborhood);

      const savedActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "approved",
      };
      jest.spyOn(Activity.prototype, "save").mockResolvedValue(savedActivity);

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({
          evidence: { gps_location: { lat: 0, lng: 0 } },
        });

      expect(response.status).toBe(200);
      expect(mockUser.ambient.co2_saved).toBe(15);
      expect(mockUser.ambient.waste_recycled).toBe(7);
      expect(mockUser.ambient.km_green).toBe(3);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should auto-reject GPS task without valid location", async () => {
      const mockTask = {
        _id: "task123",
        title: "Visit Park",
        base_points: 50,
        verification_method: "GPS",
        repeatable: false,
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const savedActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "rejected",
      };

      jest.spyOn(Activity.prototype, "save").mockResolvedValue(savedActivity);

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({ evidence: {} });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("submission_status", "REJECTED");
    });

    it("should auto-approve QR task with valid QR data", async () => {
      const mockTask = {
        _id: "task123",
        title: "Scan QR Code",
        base_points: 25,
        verification_method: "QR_SCAN",
        repeatable: false,
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockActivityFindOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const mockUser = {
        _id: "citizen123",
        points: 100,
        tasks_completed: [],
        neighborhood_id: null,
        save: jest.fn().mockResolvedValue(this),
      };

      mockUserFindById.mockResolvedValue(mockUser);

      const savedActivity = {
        _id: "activity123",
        user: "citizen123",
        task: "task123",
        status: "approved",
        completed_at: new Date(),
      };

      jest.spyOn(Activity.prototype, "save").mockResolvedValue(savedActivity);

      const response = await request(app)
        .post("/api/v1/tasks/task123/submit")
        .set("x-access-token", citizenToken)
        .send({ evidence: { qr_code_data: "VALID_QR_CODE" } });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("points_earned", 25);
      expect(response.body).toHaveProperty("submission_status", "APPROVED");
    });
  });

  describe("GET /api/v1/tasks/submissions", () => {
    it("should return submissions for operator", async () => {
      const mockSubmissions = [
        {
          _id: "submission1",
          status: "pending",
          user_id: { name: "John", surname: "Doe", email: "john@example.com" },
          task_id: { title: "Clean Park", points: 75 },
        },
        {
          _id: "submission2",
          status: "pending",
          user_id: {
            name: "Jane",
            surname: "Smith",
            email: "jane@example.com",
          },
          task_id: { title: "Plant Tree", points: 100 },
        },
      ];

      mockActivityFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSubmissions),
        }),
      });

      const response = await request(app)
        .get("/api/v1/tasks/submissions")
        .set("x-access-token", operatorToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubmissions);
    });

    it("should filter submissions by status", async () => {
      const mockSubmissions = [
        {
          _id: "submission1",
          status: "approved",
          user_id: { name: "John", surname: "Doe", email: "john@example.com" },
          task_id: { title: "Clean Park", points: 75 },
        },
      ];

      mockActivityFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSubmissions),
        }),
      });

      const response = await request(app)
        .get("/api/v1/tasks/submissions?status=approved")
        .set("x-access-token", operatorToken);

      expect(response.status).toBe(200);
      expect(mockActivityFind).toHaveBeenCalledWith({ status: "approved" });
    });

    it("should return 403 when user is citizen", async () => {
      const response = await request(app)
        .get("/api/v1/tasks/submissions")
        .set("x-access-token", citizenToken);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should allow admin to view submissions", async () => {
      const mockSubmissions = [];

      mockActivityFind.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockSubmissions),
        }),
      });

      const response = await request(app)
        .get("/api/v1/tasks/submissions")
        .set("x-access-token", adminToken);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/v1/tasks/submissions/:id/verify", () => {
    it("should approve submission and award points", async () => {
      const mockSubmission = {
        _id: "submission123",
        user_id: "citizen123",
        task_id: "task123",
        status: "PENDING",
        save: jest.fn().mockResolvedValue(this),
      };

      const mockUser = {
        _id: "citizen123",
        points: 100,
        tasks_completed: [],
        neighborhood_id: "neighborhood123",
        save: jest.fn().mockResolvedValue(this),
      };

      const mockTask = {
        _id: "task123",
        base_points: 75,
      };

      const mockNeighborhood = {
        _id: "neighborhood123",
        total_score: 500,
        save: jest.fn().mockResolvedValue(this),
      };

      mockActivityFindById.mockResolvedValue(mockSubmission);
      mockUserFindById.mockResolvedValue(mockUser);
      mockTaskFindById.mockResolvedValue(mockTask);
      mockNeighborhoodFindById.mockResolvedValue(mockNeighborhood);

      const response = await request(app)
        .post("/api/v1/tasks/submissions/submission123/verify")
        .set("x-access-token", operatorToken)
        .send({ verdict: "approved" });

      expect(response.status).toBe(200);
      expect(mockSubmission.status).toBe("APPROVED");
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should reject submission without awarding points", async () => {
      const mockSubmission = {
        _id: "submission123",
        user_id: "citizen123",
        task_id: "task123",
        status: "PENDING",
        save: jest.fn().mockResolvedValue(this),
      };

      mockActivityFindById.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .post("/api/v1/tasks/submissions/submission123/verify")
        .set("x-access-token", operatorToken)
        .send({ verdict: "rejected" });

      expect(response.status).toBe(200);
      expect(mockSubmission.status).toBe("REJECTED");
      expect(mockSubmission.save).toHaveBeenCalled();
      expect(mockUserFindById).not.toHaveBeenCalled();
    });

    it("should return 404 when submission is not found", async () => {
      mockActivityFindById.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/v1/tasks/submissions/nonexistent/verify")
        .set("x-access-token", operatorToken)
        .send({ verdict: "approved" });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Submission not found");
    });

    it("should return 400 when submission is already processed", async () => {
      const mockSubmission = {
        _id: "submission123",
        user_id: "citizen123",
        task_id: "task123",
        status: "APPROVED", // Already processed
      };

      mockActivityFindById.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .post("/api/v1/tasks/submissions/submission123/verify")
        .set("x-access-token", operatorToken)
        .send({ verdict: "approved" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Submission is already processed",
      );
    });

    it("should return 400 with invalid verdict", async () => {
      const mockSubmission = {
        _id: "submission123",
        status: "PENDING",
      };

      mockActivityFindById.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .post("/api/v1/tasks/submissions/submission123/verify")
        .set("x-access-token", operatorToken)
        .send({ verdict: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "error",
        "Invalid verdict. Use 'approved' or 'rejected'.",
      );
    });

    it("should return 403 when user is citizen", async () => {
      const response = await request(app)
        .post("/api/v1/tasks/submissions/submission123/verify")
        .set("x-access-token", citizenToken)
        .send({ verdict: "approved" });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Unauthorized");
    });

    it("should allow admin to verify submissions", async () => {
      const mockSubmission = {
        _id: "submission123",
        user_id: "citizen123",
        task_id: "task123",
        status: "PENDING",
        save: jest.fn().mockResolvedValue(this),
      };

      mockActivityFindById.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .post("/api/v1/tasks/submissions/submission123/verify")
        .set("x-access-token", adminToken)
        .send({ verdict: "rejected" });

      expect(response.status).toBe(200);
    });
  });
});

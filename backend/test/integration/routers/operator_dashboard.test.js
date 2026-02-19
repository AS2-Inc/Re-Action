import * as db from "../../db_helper.js";

const jwt = (await import("jsonwebtoken")).default;
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
      base_points: 100,
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
      verification_method: "PHOTO_UPLOAD",
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

  it("should have test setup ready", () => {
    expect(true).toBe(true);
  });
});

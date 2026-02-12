import { jest } from "@jest/globals";
import { connect, close, clear } from "../../db_helper.js";
import mongoose from "mongoose";

// We need to define mocks before importing modules if we use unstable_mockModule which is global
// But for integration tests we usually want real DB. 
// However, the test file imports modules dynamically which is good.

const TaskService = await import("../../../app/services/task_service.js");

const UserModule = await import("../../../app/models/user.js");
const User = UserModule.default;

const TaskModule = await import("../../../app/models/task.js");
const Task = TaskModule.default;

const UserTaskModule = await import("../../../app/models/user_task.js");
const UserTask = UserTaskModule.default;


describe("TaskService.replace_expired_tasks_for_all_users (RF6)", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await close();
  });

  it("should replace expired tasks with new ones of the same frequency", async () => {
    // 1. Create a user
    const user = await User.create({
      name: "Test",
      surname: "User",
      email: "test@example.com",
      password: "Password123!", // Dummy password
      is_active: true,
      age: 25,
      neighborhood_id: null // Global
    });

    // 2. Create tasks
    const task1 = await Task.create({
      title: "Task 1",
      description: "Desc 1",
      category: "Mobility",
      frequency: "daily",
      base_points: 10,
      is_active: true,
      verification_method: "GPS",
    });

    const task2 = await Task.create({
      title: "Task 2",
      description: "Desc 2",
      category: "Waste",
      frequency: "daily",
      base_points: 10,
      is_active: true,
      verification_method: "QUIZ",
    });

    // 3. Assign Task 1 to user and make it expired
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

    const userTask = await UserTask.create({
      user_id: user._id,
      task_id: task1._id,
      status: "ASSIGNED",
      expires_at: expiredDate,
    });

    // 4. Run replacement
    const results = await TaskService.replace_expired_tasks_for_all_users();

    // Debug output if fails
    if (results.errors.length > 0) {
      console.error(results.errors);
    }

    // 5. Assertions
    expect(results.processed).toBe(1);
    expect(results.replaced).toBe(1);

    // Check old assignment is EXPIRED
    const oldAssignment = await UserTask.findById(userTask._id);
    expect(oldAssignment.status).toBe("EXPIRED");

    // Check new assignment exists and is ASSIGNED
    const activeAssignments = await UserTask.find({
      user_id: user._id,
      status: "ASSIGNED",
    });

    expect(activeAssignments).toHaveLength(1);
    const newAssignment = activeAssignments[0];

    // Verify expiration date is in future
    expect(newAssignment.expires_at.getTime()).toBeGreaterThan(Date.now());
  });
});

import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../app/app.js";
import Quiz from "../../app/models/quiz.js";
import User from "../../app/models/user.js";
import * as db_helper from "../db_helper.js";

describe("Quiz API", () => {
  let user;
  let token;
  let quiz;

  beforeAll(async () => {
    process.env.SUPER_SECRET = "test_secret";
    await db_helper.connect();

    // Create a user and token
    user = new User({
      name: "Test User",
      email: "test@example.com",
      password: "password",
      role: "citizen",
    });
    await user.save();

    token = jwt.sign(
      { email: user.email, id: user._id, role: user.role },
      process.env.SUPER_SECRET || "test_secret",
      { expiresIn: "1h" },
    );

    // Create a quiz
    quiz = new Quiz({
      title: "Test Quiz",
      description: "A test quiz",
      questions: [
        {
          text: "Question 1",
          options: ["Option 1", "Option 2"],
          correct_option_index: 0,
        },
      ],
    });
    await quiz.save();
  });

  afterAll(async () => {
    await db_helper.clear();
    await db_helper.close();
  });

  test("GET /api/v1/quizzes/:id should return quiz details without correct answer", async () => {
    const response = await request(app)
      .get(`/api/v1/quizzes/${quiz._id}`)
      .set("x-access-token", token);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", quiz._id.toString());
    expect(response.body).toHaveProperty("title", "Test Quiz");
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.questions[0]).toHaveProperty("text", "Question 1");
    expect(response.body.questions[0].options).toEqual([
      "Option 1",
      "Option 2",
    ]);
    expect(response.body.questions[0]).not.toHaveProperty(
      "correct_option_index",
    );
  });

  test("GET /api/v1/quizzes/:id should return 404 for non-existent quiz", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/api/v1/quizzes/${fakeId}`)
      .set("x-access-token", token);

    expect(response.status).toBe(404);
  });
});

import * as db from "../../db_helper.js";

const request = (await import("supertest")).default;
const app = (await import("../../../app/app.js")).default;
const User = (await import("../../../app/models/user.js")).default;
const Neighborhood = (await import("../../../app/models/neighborhood.js"))
  .default;
const Task = (await import("../../../app/models/task.js")).default;
const Submission = (await import("../../../app/models/submission.js")).default;
const LeaderboardService = (
  await import("../../../app/services/leaderboard_service.js")
).default;

describe("Leaderboard API (RF17 + RF18)", () => {
  let neighborhood1, neighborhood2;
  let user1;

  beforeAll(async () => {
    await db.connect();
  });

  afterEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  const seedData = async () => {
    // Neighborhood 1: Higher base score but lower participation
    neighborhood1 = await Neighborhood.create({
      name: "High Base Score",
      city: "CityA",
      total_score: 1000,
      ranking_position: 2,
      environmental_data: { air_quality_index: 20 }, // Good air, low bonus
    });

    // Neighborhood 2: Lower base score but high participation via dynamic content
    neighborhood2 = await Neighborhood.create({
      name: "High Activity",
      city: "CityB",
      total_score: 500,
      ranking_position: 1,
      environmental_data: { air_quality_index: 80 }, // Bad air, high bonus potential
    });

    // 2 Active Users in Neighborhood 2
    user1 = await User.create({
      name: "Active1",
      surname: "User",
      email: "active1@test.com",
      is_active: true,
      neighborhood_id: neighborhood2._id,
      last_activity_date: new Date(),
    });

    // 1 Active Users in Neighborhood 1 out of 10 total (low participation)
    await User.create({
      name: "Main1",
      surname: "N1",
      email: "n1-u1@test.com",
      is_active: true,
      neighborhood_id: neighborhood1._id,
      last_activity_date: new Date(),
    });
    // Create inactive users for N1 to lower rate
    for (let i = 0; i < 9; i++) {
      await User.create({
        name: "Inactive",
        surname: `N1-${i}`,
        email: `n1-inactive-${i}@test.com`,
        is_active: true,
        neighborhood_id: neighborhood1._id,
        last_activity_date: new Date(0), // Old activity
      });
    }

    // Submissions for Delta improvement
    const task = await Task.create({
      title: "T",
      category: "Community",
      base_points: 10,
      verification_method: "MANUAL_REPORT",
    });

    // N2 gets massive recent points
    await Submission.create({
      user_id: user1._id,
      task_id: task._id,
      neighborhood_id: neighborhood2._id,
      status: "APPROVED",
      completed_at: new Date(),
      points_awarded: 100,
    });

    // N1 gets no recent points
  };

  beforeEach(async () => {
    await seedData();
  });

  describe("Scoring Logic (RF18)", () => {
    it("should calculate correct normalized scores", async () => {
      const score2 = await LeaderboardService.calculate_normalized_score(
        neighborhood2._id,
        "monthly",
      );

      // N2 Stats:
      // Base: 500
      // Participation: 100% (2 active / 2 total) -> Multiplier: 1 + (100/100)*0.5 = 1.5
      // Delta Bonus: 100 points * 0.1 = 10
      // Environmental Bonus: AQI 80 -> (80-50)*2 = 60
      // Total: 500 * 1.5 + 10 + 60 = 750 + 70 = 820

      expect(score2.participation_rate).toBe(100);
      expect(score2.delta).toBe(100);
      expect(score2.environmental_bonus).toBe(60);
      expect(score2.total).toBe(820);

      const score1 = await LeaderboardService.calculate_normalized_score(
        neighborhood1._id,
        "monthly",
      );
      // N1 Stats:
      // Base: 1000
      // Participation: 10% (1 active / 10 total) -> Multiplier: 1 + (10/100)*0.5 = 1.05
      // Delta Bonus: 0
      // Environmental Bonus: AQI 20 -> 0 (below 50)
      // Total: 1000 * 1.05 + 0 + 0 = 1050

      expect(score1.participation_rate).toBe(10);
      expect(score1.total).toBe(1050);
    });
  });

  describe("GET /api/v1/neighborhood/ranking", () => {
    it("should return rankings based on normalized score", async () => {
      const res = await request(app).get(
        "/api/v1/neighborhood/ranking?period=monthly",
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // N1 should be first (1050 vs 820)
      expect(res.body[0].neighborhood_id).toBe(neighborhood1._id.toString());
      expect(res.body[0].normalized_score).toBe(1050);
      expect(res.body[1].neighborhood_id).toBe(neighborhood2._id.toString());
      expect(res.body[1].normalized_score).toBe(820);
    });
  });
});

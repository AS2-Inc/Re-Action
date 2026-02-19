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
      base_points: 1000,
      ranking_position: 2,
      environmental_data: { air_quality_index: 20 }, // Good air, low bonus
    });

    // Neighborhood 2: Lower base score but high participation via dynamic content
    neighborhood2 = await Neighborhood.create({
      name: "High Activity",
      city: "CityB",
      base_points: 500,
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
      verification_method: "PHOTO_UPLOAD",
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
    it("should calculate correct normalized scores on-demand via get_leaderboard", async () => {
      const leaderboard = await LeaderboardService.get_leaderboard({
        period: "monthly",
      });

      const entry2 = leaderboard.find(
        (e) => e.neighborhood_id.toString() === neighborhood2._id.toString(),
      );
      const entry1 = leaderboard.find(
        (e) => e.neighborhood_id.toString() === neighborhood1._id.toString(),
      );

      // N2: base_points 500, high participation, recent activity
      expect(entry2.base_points).toBe(500);
      expect(entry2.participation_rate).toBe(100);
      expect(entry2.normalized_points).toBeGreaterThan(0);
      expect(entry2.environmental_data).toBeDefined();

      // N1: base_points 1000, low participation, no recent activity
      expect(entry1.base_points).toBe(1000);
      expect(entry1.participation_rate).toBe(10);
      expect(entry1.normalized_points).toBeGreaterThan(0);
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

      // N1 should be first (higher normalized_points)
      expect(res.body[0].neighborhood_id).toBe(neighborhood1._id.toString());
      expect(res.body[0].normalized_points).toBeGreaterThan(0);
      expect(res.body[1].neighborhood_id).toBe(neighborhood2._id.toString());
      expect(res.body[1].normalized_points).toBeGreaterThan(0);
    });
  });
});

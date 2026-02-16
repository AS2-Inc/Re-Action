import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { clear, close, connect } from "../../db_helper.js";

// Mock NotificationService
const mockNotifyAllUsers = jest.fn().mockResolvedValue([]);
const mockNotifyNeighborhoodEvent = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule(
  "../../../app/services/notification_service.js",
  () => ({
    default: {
      notify_all_users: mockNotifyAllUsers,
      notify_neighborhood_event: mockNotifyNeighborhoodEvent,
    },
  }),
);

const TaskTemplateService = (
  await import("../../../app/services/task_template_service.js")
).default;
const TaskTemplate = (await import("../../../app/models/task_template.js"))
  .default;

describe("TaskTemplateService Notification Triggers (RF5)", () => {
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

  it("should trigger notify_all_users when creating a global task", async () => {
    // 1. Create a template
    const template = await TaskTemplate.create({
      name: "Global Template",
      description: "Desc",
      category: "Mobility",
      verification_method: "GPS",
      default_difficulty: "Low",
      default_frequency: "daily",
      base_points_range: { min: 5, max: 10 },
      impact_metrics_schema: {},
      configurable_fields: [],
    });

    const operatorId = new mongoose.Types.ObjectId();

    // 2. Create task from template (Global)
    await TaskTemplateService.create_task_from_template(
      template._id,
      {
        title: "Global Task",
        description: "Do this",
        neighborhood_id: null,
      },
      operatorId,
    );

    // 3. Verify notification trigger
    expect(mockNotifyAllUsers).toHaveBeenCalledTimes(1);
    expect(mockNotifyAllUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Global Task",
        description: "Do this",
      }),
    );
    expect(mockNotifyNeighborhoodEvent).not.toHaveBeenCalled();
  });

  it("should trigger notify_neighborhood_event when creating a neighborhood task", async () => {
    // 1. Create a template
    const template = await TaskTemplate.create({
      name: "Local Template",
      description: "Desc",
      category: "Waste",
      verification_method: "GPS",
      default_difficulty: "Low",
      default_frequency: "daily",
      base_points_range: { min: 5, max: 10 },
      impact_metrics_schema: {},
      configurable_fields: [],
    });

    // 2. Create task from template (Neighborhood)
    const neighborhoodId = new mongoose.Types.ObjectId();
    const operatorId = new mongoose.Types.ObjectId();

    await TaskTemplateService.create_task_from_template(
      template._id,
      {
        title: "Local Task",
        description: "Do this locally",
        neighborhood_id: neighborhoodId,
      },
      operatorId,
    );

    // 3. Verify notification trigger
    expect(mockNotifyNeighborhoodEvent).toHaveBeenCalledTimes(1);
    // The service might pass neighborhoodId as string or ObjectId, let's verify loosely or match expected
    // Mongoose usually casts, so the service receives what we passed.
    expect(mockNotifyNeighborhoodEvent).toHaveBeenCalledWith(
      neighborhoodId,
      expect.objectContaining({
        title: "Local Task",
        description: "Do this locally",
      }),
    );
    expect(mockNotifyAllUsers).not.toHaveBeenCalled();
  });
});

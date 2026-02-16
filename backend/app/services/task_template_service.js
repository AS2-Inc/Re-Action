import Task from "../models/task.js";
import TaskTemplate from "../models/task_template.js";
import NotificationService from "./notification_service.js";

/**
 * Task Template Service (RF11)
 * Manages task templates and creates tasks from templates
 */
class TaskTemplateService {
  /**
   * Get all available templates
   * @param {boolean} active_only - If true, only return active templates
   * @returns {Promise<Array>} List of templates
   */
  async get_templates(active_only = true) {
    const filter = active_only ? { is_active: true } : {};
    return TaskTemplate.find(filter).sort({ category: 1, name: 1 });
  }

  /**
   * Get a template by ID
   * @param {string} template_id - Template ID
   * @returns {Promise<Object>} Template data
   */
  async get_template(template_id) {
    const template = await TaskTemplate.findById(template_id);
    if (!template) {
      throw new Error("Template not found");
    }
    return template;
  }

  /**
   * Create a new task from a template
   * @param {string} template_id - Template ID
   * @param {Object} task_data - Task data to override template defaults
   * @param {string} created_by - User ID of the operator creating the task
   * @returns {Promise<Object>} Created task
   */
  async create_task_from_template(template_id, task_data, created_by) {
    const template = await TaskTemplate.findById(template_id);
    if (!template) {
      throw new Error("Template not found");
    }

    if (!template.is_active) {
      throw new Error("Template is not active");
    }

    // Validate required configurable fields
    for (const field of template.configurable_fields) {
      if (field.required && !task_data[field.field_name]) {
        throw new Error(`Required field missing: ${field.field_name}`);
      }
    }

    // Validate points are within range
    const points = task_data.base_points || template.base_points_range.min;
    if (
      points < template.base_points_range.min ||
      points > template.base_points_range.max
    ) {
      throw new Error(
        `Points must be between ${template.base_points_range.min} and ${template.base_points_range.max}`,
      );
    }

    // Build impact metrics
    const impact_metrics = {};
    if (template.impact_metrics_schema.co2_saved && task_data.co2_saved) {
      impact_metrics.co2_saved = task_data.co2_saved;
    }
    if (
      template.impact_metrics_schema.waste_recycled &&
      task_data.waste_recycled
    ) {
      impact_metrics.waste_recycled = task_data.waste_recycled;
    }
    if (template.impact_metrics_schema.distance && task_data.distance) {
      impact_metrics.distance = task_data.distance;
    }
    if (template.impact_metrics_schema.time_spent && task_data.time_spent) {
      impact_metrics.time_spent = task_data.time_spent;
    }

    // Build verification criteria from configurable fields
    const verification_criteria = {};
    for (const field of template.configurable_fields) {
      if (task_data[field.field_name] !== undefined) {
        verification_criteria[field.field_name] = task_data[field.field_name];
      } else if (field.default_value !== undefined) {
        verification_criteria[field.field_name] = field.default_value;
      }
    }

    // Create the task
    const task = new Task({
      title: task_data.title,
      description: task_data.description,
      category: template.category,
      difficulty: task_data.difficulty || template.default_difficulty,
      frequency: task_data.frequency || template.default_frequency,
      base_points: points,
      verification_method: template.verification_method,
      verification_criteria,
      impact_metrics,
      neighborhood_id: task_data.neighborhood_id || null, // null = global task
      is_active: task_data.is_active !== undefined ? task_data.is_active : true,
      template_id: template._id,
      created_by,
    });

    await task.save();

    // Trigger Notification (RF5)
    // Only for "on_demand" or high priority tasks, or maybe all new tasks?
    // Let's assume manual creation from template implies an "event" or "challenge"
    // especially if it has a deadline or is special.
    // For now, we notify for ALL tasks created via template as they are likely "Special Events"
    try {
      if (task.neighborhood_id) {
        await NotificationService.notify_neighborhood_event(
          task.neighborhood_id,
          {
            title: task.title,
            description: task.description,
            date: new Date(),
            _id: task._id,
          },
        );
      } else {
        await NotificationService.notify_all_users({
          title: task.title,
          description: task.description,
          _id: task._id,
        });
      }
    } catch (error) {
      console.error("Error sending new task notifications:", error);
      // Don't fail the task creation if notification fails
    }

    return task;
  }

  /**
   * Create a new template (admin only)
   * @param {Object} template_data - Template data
   * @returns {Promise<Object>} Created template
   */
  async create_template(template_data) {
    const existing = await TaskTemplate.findOne({ name: template_data.name });
    if (existing) {
      throw new Error("Template with this name already exists");
    }

    const template = new TaskTemplate(template_data);
    await template.save();
    return template;
  }

  /**
   * Update a template (admin only)
   * @param {string} template_id - Template ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated template
   */
  async update_template(template_id, updates) {
    const template = await TaskTemplate.findByIdAndUpdate(
      template_id,
      { $set: updates },
      { new: true },
    );
    if (!template) {
      throw new Error("Template not found");
    }
    return template;
  }

  /**
   * Deactivate a template (soft delete)
   * @param {string} template_id - Template ID
   * @returns {Promise<Object>} Updated template
   */
  async deactivate_template(template_id) {
    return this.update_template(template_id, { is_active: false });
  }

  /**
   * Initialize default templates
   * Called during app startup to ensure basic templates exist
   */
  async initialize_default_templates() {
    const default_templates = [
      {
        name: "Daily Walk",
        description: "Track daily walking distance",
        category: "Mobility",
        verification_method: "GPS",
        default_difficulty: "Low",
        default_frequency: "daily",
        base_points_range: { min: 5, max: 30 },
        impact_metrics_schema: { co2_saved: true, distance: true },
        configurable_fields: [
          {
            field_name: "min_distance_meters",
            field_type: "number",
            description: "Minimum distance in meters",
            required: true,
            default_value: 1000,
            validation: { min: 100, max: 10000 },
          },
        ],
        example_title: "Walk 1km",
        example_description: "Walk at least 1 kilometer today",
      },
      {
        name: "Recycling Quiz",
        description: "Quiz about proper waste sorting",
        category: "Waste",
        verification_method: "QUIZ",
        default_difficulty: "Low",
        default_frequency: "weekly",
        base_points_range: { min: 10, max: 50 },
        impact_metrics_schema: { waste_recycled: true },
        configurable_fields: [
          {
            field_name: "min_score_percent",
            field_type: "number",
            description: "Minimum score percentage to pass",
            required: true,
            default_value: 70,
            validation: { min: 50, max: 100 },
          },
        ],
        example_title: "Recycling Pro Quiz",
        example_description: "Test your knowledge about recycling",
      },
      {
        name: "Park Visit",
        description: "Spend time in a public park",
        category: "Community",
        verification_method: "GPS",
        default_difficulty: "Low",
        default_frequency: "daily",
        base_points_range: { min: 10, max: 40 },
        impact_metrics_schema: { time_spent: true },
        configurable_fields: [
          {
            field_name: "min_time_minutes",
            field_type: "number",
            description: "Minimum time to spend in park (minutes)",
            required: true,
            default_value: 20,
            validation: { min: 5, max: 120 },
          },
          {
            field_name: "target_location",
            field_type: "location",
            description: "GPS coordinates of the park",
            required: true,
          },
        ],
        example_title: "Visit City Park",
        example_description: "Spend at least 20 minutes in the park",
      },
      {
        name: "Waste Report",
        description: "Report improperly disposed waste",
        category: "Waste",
        verification_method: "PHOTO_UPLOAD",
        default_difficulty: "Medium",
        default_frequency: "on_demand",
        base_points_range: { min: 20, max: 100 },
        impact_metrics_schema: { waste_recycled: true },
        configurable_fields: [
          {
            field_name: "requires_location",
            field_type: "boolean",
            description: "Require GPS location with photo",
            required: false,
            default_value: true,
          },
        ],
        example_title: "Report Illegal Dumping",
        example_description: "Take a photo of improperly disposed waste",
      },
    ];

    for (const template_data of default_templates) {
      const existing = await TaskTemplate.findOne({ name: template_data.name });
      if (!existing) {
        await TaskTemplate.create(template_data);
        console.log(`Created template: ${template_data.name}`);
      }
    }
  }
}

export default new TaskTemplateService();

import mongoose, { Schema } from "mongoose";

/**
 * Task Template Model (RF11)
 * Stores pre-defined templates that operators can use to create tasks
 */

const ConfigurableFieldSchema = new Schema({
  field_name: { type: String, required: true },
  field_type: {
    type: String,
    enum: ["string", "number", "boolean", "array", "location", "date"],
    required: true,
  },
  description: String,
  required: { type: Boolean, default: false },
  default_value: Schema.Types.Mixed,
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    options: [String], // For select fields
  },
});

const TaskTemplateSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ["Mobility", "Waste", "Community", "Education", "Other"],
    required: true,
  },
  verification_method: {
    type: String,
    enum: ["GPS", "QR_SCAN", "QUIZ", "PHOTO_UPLOAD"],
    required: true,
  },

  // Default values for the task
  default_difficulty: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },
  default_frequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "on_demand", "onetime"],
    default: "daily",
  },

  // Points configuration
  base_points_range: {
    min: { type: Number, default: 5 },
    max: { type: Number, default: 100 },
  },

  // Impact metrics configuration
  impact_metrics_schema: {
    co2_saved: { type: Boolean, default: false },
    waste_recycled: { type: Boolean, default: false },
    km_green: { type: Boolean, default: false },
  },

  // Fields that operators can configure when creating a task from this template
  configurable_fields: [ConfigurableFieldSchema],

  // Example data for preview
  example_title: String,
  example_description: String,

  // Metadata
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

TaskTemplateSchema.pre("save", function () {
  this.updated_at = new Date();
});

export default mongoose.model("TaskTemplate", TaskTemplateSchema);

import mongoose from "mongoose";
import TaskTemplate from "../app/models/task_template.js";
import dotenv from "dotenv";

dotenv.config();

const templates = [
    {
        name: "Walking Challenge",
        description: "Walk 5km to reduce carbon footprint.",
        category: "Mobility",
        verification_method: "GPS",
        default_difficulty: "Medium",
        default_frequency: "daily",
        base_points_range: { min: 50, max: 150 },
        impact_metrics_schema: {
            distance: true,
            co2_saved: true,
        },
        configurable_fields: [
            {
                field_name: "target_distance",
                field_type: "number",
                description: "Distance in km",
                required: true,
                default_value: 5,
                validation: { min: 1 },
            },
        ],
        example_title: "Walk 5km today",
        example_description: "Take a walk instead of driving.",
    },
    {
        name: "Park Cleanup",
        description: "Clean up a local park and take a photo.",
        category: "Waste",
        verification_method: "PHOTO_UPLOAD",
        default_difficulty: "Medium",
        default_frequency: "on_demand",
        base_points_range: { min: 100, max: 200 },
        impact_metrics_schema: {
            waste_recycled: true,
            time_spent: true,
        },
        configurable_fields: [
            {
                field_name: "park_name",
                field_type: "string",
                description: "Name of the park",
                required: true,
            },
        ],
        example_title: "Clean Central Park",
        example_description: "Help keep our parks clean by picking up litter.",
    },
    {
        name: "Community Meeting",
        description: "Attend a community meeting.",
        category: "Community",
        verification_method: "QR_SCAN",
        default_difficulty: "Low",
        default_frequency: "monthly",
        base_points_range: { min: 30, max: 80 },
        impact_metrics_schema: {
            time_spent: true,
        },
        configurable_fields: [
            {
                field_name: "location",
                field_type: "string",
                description: "Meeting location",
                required: true,
            },
        ],
        example_title: "Monthly Town Hall",
        example_description: "Join us for the monthly community meeting.",
    },
];

const seed = async () => {
    const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/re-action";

    try {
        await mongoose.connect(dbUrl);
        console.log("Connected to MongoDB at", dbUrl);

        for (const t of templates) {
            const existing = await TaskTemplate.findOne({ name: t.name });
            if (!existing) {
                await TaskTemplate.create(t);
                console.log(`Created template: ${t.name}`);
            } else {
                console.log(`Template already exists: ${t.name}`);
            }
        }

        console.log("Seeding complete.");
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seed();

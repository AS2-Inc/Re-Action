import dotenv from "dotenv";
import mongoose from "mongoose";
import Quiz from "../app/models/quiz.js";
import Task from "../app/models/task.js";

dotenv.config();

/**
 * Example Tasks for seeding
 * These tasks demonstrate different categories, verification methods, and difficulty levels
 */
const EXAMPLE_TASKS = [
  // Mobility Tasks
  {
    title: "Walk to Work Day",
    description: "Walk or cycle to work instead of driving",
    category: "Mobility",
    difficulty: "Low",
    base_points: 50,
    verification_method: "GPS",
    verification_criteria: {
      min_distance_meters: 1000,
      photo_description: "Optional photo of your commute",
    },
    impact_metrics: {
      co2_saved: 2.5,
      km_green: 1,
    },
    frequency: "daily",
    is_active: true,
  },
  {
    title: "5km Eco-Run Challenge",
    description:
      "Complete a 5km run or walk to stay healthy and reduce carbon emissions",
    category: "Mobility",
    difficulty: "Medium",
    base_points: 100,
    verification_method: "GPS",
    verification_criteria: {
      min_distance_meters: 5000,
      photo_description: "Photo of your completed run/walk",
    },
    impact_metrics: {
      co2_saved: 6,
      km_green: 5,
    },
    frequency: "weekly",
    is_active: true,
  },
  {
    title: "Bike to Destination",
    description: "Use your bike instead of a car for a 10km trip",
    category: "Mobility",
    difficulty: "High",
    base_points: 150,
    verification_method: "GPS",
    verification_criteria: {
      min_distance_meters: 10000,
      photo_description: "Photo with your bike at the destination",
    },
    impact_metrics: {
      co2_saved: 12,
      km_green: 10,
    },
    frequency: "on_demand",
    is_active: true,
  },

  // Waste Tasks
  {
    title: "Plastic-Free Day",
    description: "Avoid using single-use plastics for an entire day",
    category: "Waste",
    difficulty: "Medium",
    base_points: 75,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description: "Photo of your plastic-free lunch or shopping bags",
    },
    impact_metrics: {
      waste_recycled: 0.5,
    },
    frequency: "daily",
    is_active: true,
  },
  {
    title: "Park Cleanup Session",
    description: "Clean up litter in your local park or public space",
    category: "Waste",
    difficulty: "Medium",
    base_points: 120,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description: "Before and after photos of the cleaned area",
    },
    impact_metrics: {
      waste_recycled: 5,
    },
    frequency: "weekly",
    is_active: true,
  },
  {
    title: "Organize a Cleanup Drive",
    description: "Organize and lead a community cleanup event",
    category: "Waste",
    difficulty: "High",
    base_points: 250,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description:
        "Photos from the cleanup event with multiple participants",
    },
    impact_metrics: {
      waste_recycled: 20,
    },
    frequency: "on_demand",
    is_active: true,
  },

  // Community Tasks
  {
    title: "Share Your Sustainability Tips",
    description: "Write and share 3 sustainability tips with your community",
    category: "Community",
    difficulty: "Low",
    base_points: 50,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description: "Screenshot or photo of your shared tips",
    },
    impact_metrics: {},
    frequency: "weekly",
    is_active: true,
  },
  {
    title: "Attend Community Meeting",
    description:
      "Attend a local environmental or sustainability community meeting",
    category: "Community",
    difficulty: "Medium",
    base_points: 100,
    verification_method: "QR_SCAN",
    verification_criteria: {
      photo_description: "Scan the QR code at the meeting location",
    },
    impact_metrics: {},
    frequency: "on_demand",
    is_active: true,
  },
  {
    title: "Teach Others About Sustainability",
    description: "Teach a class or workshop on sustainable living practices",
    category: "Community",
    difficulty: "High",
    base_points: 200,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description: "Photos from your workshop or class with participants",
    },
    impact_metrics: {},
    frequency: "on_demand",
    is_active: true,
  },

  // Volunteering Tasks
  {
    title: "1 Hour Environmental Volunteer Work",
    description: "Volunteer for 1 hour with an environmental organization",
    category: "Volunteering",
    difficulty: "Low",
    base_points: 75,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description:
        "Photo with volunteer badge or at the organization location",
    },
    impact_metrics: {},
    frequency: "weekly",
    is_active: true,
  },
  {
    title: "Tree Planting Session",
    description: "Plant trees or help with reforestation efforts",
    category: "Volunteering",
    difficulty: "Medium",
    base_points: 150,
    verification_method: "PHOTO_UPLOAD",
    verification_criteria: {
      photo_description: "Photos of the planted trees",
    },
    impact_metrics: {
      co2_saved: 100,
    },
    frequency: "weekly",
    is_active: true,
  },
  {
    title: "Mentor a Sustainability Beginner",
    description:
      "Mentor someone new to sustainable living for at least 1 month",
    category: "Volunteering",
    difficulty: "High",
    base_points: 300,
    verification_method: "QUIZ",
    verification_criteria: {
      quiz_id: null, // Will be set dynamically from the quiz
    },
    impact_metrics: {},
    frequency: "monthly",
    is_active: true,
  },
];

const seed = async () => {
  const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/re-action";

  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB at", dbUrl);

    // Find the Sustainability Basics Quiz for quiz-based tasks
    const sustainabilityQuiz = await Quiz.findOne({
      title: "Sustainability Basics Quiz",
    });

    if (!sustainabilityQuiz) {
      console.warn(
        "⚠️  Warning: 'Sustainability Basics Quiz' not found. Please run seed_quizzes.js first.",
      );
      console.warn(
        "   Quiz-based tasks will be created but may need manual quiz_id assignment.",
      );
    } else {
      console.log(
        `✅ Found quiz: ${sustainabilityQuiz.title} (${sustainabilityQuiz._id})`,
      );
    }

    let created = 0;
    let updated = 0;

    for (const taskData of EXAMPLE_TASKS) {
      // If this is a quiz task and we have a quiz, set the quiz_id
      if (
        taskData.verification_method === "QUIZ" &&
        sustainabilityQuiz &&
        taskData.verification_criteria
      ) {
        taskData.verification_criteria.quiz_id = sustainabilityQuiz._id;
      }

      const existing = await Task.findOne({ title: taskData.title });

      if (!existing) {
        await Task.create(taskData);
        console.log(`✅ Created task: ${taskData.title}`);
        created++;
      } else {
        await Task.findOneAndUpdate({ title: taskData.title }, taskData, {
          new: true,
        });
        console.log(`🔄 Updated task: ${taskData.title}`);
        updated++;
      }
    }

    console.log(
      `\n✨ Task seeding complete. Created: ${created}, Updated: ${updated}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Task seeding failed:", err);
    process.exit(1);
  }
};

seed();

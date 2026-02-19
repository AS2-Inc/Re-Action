import dotenv from "dotenv";
import mongoose from "mongoose";
import Quiz from "../app/models/quiz.js";

dotenv.config();

/**
 * Example Quizzes for seeding
 * These quizzes can be used for task verification
 */
const EXAMPLE_QUIZZES = [
  {
    title: "Sustainability Basics Quiz",
    description:
      "Test your knowledge of basic sustainability concepts and practices",
    passing_score: 0.7,
    questions: [
      {
        text: "What percentage of household waste can typically be recycled or composted?",
        options: ["10-20%", "30-40%", "50-70%", "80-90%"],
        correct_option_index: 2,
      },
      {
        text: "Which of the following uses the LEAST water?",
        options: [
          "Taking a 10-minute shower",
          "Taking a 5-minute bath",
          "Running a dishwasher",
          "Watering the lawn for 10 minutes",
        ],
        correct_option_index: 2,
      },
      {
        text: "What is the most effective way to reduce your carbon footprint from food?",
        options: [
          "Eating locally grown food",
          "Reducing meat consumption",
          "Buying organic products",
          "Growing your own vegetables",
        ],
        correct_option_index: 1,
      },
      {
        text: "How long does it take for a plastic bottle to decompose in nature?",
        options: ["10 years", "50 years", "100 years", "450+ years"],
        correct_option_index: 3,
      },
      {
        text: "Which transportation method produces the LEAST CO2 per kilometer?",
        options: ["Electric car", "Bus", "Bicycle", "Train"],
        correct_option_index: 2,
      },
      {
        text: "What does 'Zero Waste' lifestyle aim to achieve?",
        options: [
          "Recycling everything",
          "Reducing waste to landfill as much as possible",
          "Not producing any trash at all",
          "Composting all organic waste",
        ],
        correct_option_index: 1,
      },
      {
        text: "Which of these actions saves the MOST energy at home?",
        options: [
          "Turning off lights when leaving a room",
          "Unplugging chargers when not in use",
          "Improving home insulation",
          "Using LED bulbs instead of incandescent",
        ],
        correct_option_index: 2,
      },
      {
        text: "What is greenwashing?",
        options: [
          "Washing clothes with eco-friendly detergent",
          "Cleaning with natural products",
          "Companies falsely claiming environmental benefits",
          "A method of cleaning solar panels",
        ],
        correct_option_index: 2,
      },
      {
        text: "Which renewable energy source is most widely used globally?",
        options: ["Solar", "Wind", "Hydroelectric", "Geothermal"],
        correct_option_index: 2,
      },
      {
        text: "What is the recommended action to reduce plastic waste?",
        options: [
          "Recycle all plastics",
          "Use biodegradable plastics",
          "Refuse, Reduce, Reuse, then Recycle",
          "Only buy recycled plastic products",
        ],
        correct_option_index: 2,
      },
    ],
  },
  {
    title: "Advanced Sustainability Knowledge",
    description:
      "A challenging quiz for experienced sustainability practitioners and mentors",
    passing_score: 0.8,
    questions: [
      {
        text: "What is the circular economy?",
        options: [
          "An economy based on renewable energy",
          "A system that eliminates waste through reuse and regeneration",
          "A trading system between circular regions",
          "An economy focused on recycling",
        ],
        correct_option_index: 1,
      },
      {
        text: "Which greenhouse gas has the highest global warming potential?",
        options: [
          "Carbon dioxide (CO2)",
          "Methane (CH4)",
          "Nitrous oxide (N2O)",
          "Sulfur hexafluoride (SF6)",
        ],
        correct_option_index: 3,
      },
      {
        text: "What is embodied carbon?",
        options: [
          "The carbon stored in trees and plants",
          "The carbon emitted during production and transport of goods",
          "Carbon that has been captured and stored",
          "The carbon in fossil fuels",
        ],
        correct_option_index: 1,
      },
      {
        text: "What percentage of global emissions come from the food system?",
        options: ["10-15%", "20-25%", "25-35%", "40-50%"],
        correct_option_index: 2,
      },
      {
        text: "Which practice is part of regenerative agriculture?",
        options: [
          "Monoculture farming",
          "Heavy use of synthetic fertilizers",
          "Cover cropping and no-till farming",
          "Maximizing crop yield per acre",
        ],
        correct_option_index: 2,
      },
    ],
  },
  {
    title: "Energy Efficiency Quiz",
    description: "Test your knowledge about energy conservation and efficiency",
    passing_score: 0.75,
    questions: [
      {
        text: "What is the most energy-efficient temperature for a refrigerator?",
        options: ["0-2°C", "3-5°C", "6-8°C", "9-11°C"],
        correct_option_index: 1,
      },
      {
        text: "How much energy do phantom loads (standby power) typically account for in a home?",
        options: ["Less than 1%", "5-10%", "15-20%", "More than 25%"],
        correct_option_index: 1,
      },
      {
        text: "What is the payback period for LED bulbs compared to incandescent?",
        options: ["1-3 months", "6-12 months", "2-3 years", "5 years or more"],
        correct_option_index: 1,
      },
      {
        text: "Which appliance typically uses the most energy in a household?",
        options: [
          "Refrigerator",
          "Washing machine",
          "Heating/Cooling system",
          "Television",
        ],
        correct_option_index: 2,
      },
      {
        text: "What does an Energy Star rating indicate?",
        options: [
          "The product uses renewable energy",
          "The product meets energy efficiency standards",
          "The product is solar powered",
          "The product has a warranty",
        ],
        correct_option_index: 1,
      },
    ],
  },
];

const seed = async () => {
  const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/re-action";

  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB at", dbUrl);

    let created = 0;
    let updated = 0;

    for (const quizData of EXAMPLE_QUIZZES) {
      const existing = await Quiz.findOne({ title: quizData.title });

      if (!existing) {
        await Quiz.create(quizData);
        console.log(`✅ Created quiz: ${quizData.title}`);
        created++;
      } else {
        await Quiz.findOneAndUpdate({ title: quizData.title }, quizData, {
          new: true,
        });
        console.log(`🔄 Updated quiz: ${quizData.title}`);
        updated++;
      }
    }

    console.log(
      `\n✨ Quiz seeding complete. Created: ${created}, Updated: ${updated}`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Quiz seeding failed:", err);
    process.exit(1);
  }
};

seed();

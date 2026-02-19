import dotenv from "dotenv";
import mongoose from "mongoose";
import Badge from "../app/models/badge.js";

dotenv.config();

/**
 * Badge Configuration - Inlined badge definitions for seeding
 */
const BADGE_CATEGORIES = {
  POINTS: "Points",
  TASKS: "Tasks",
  STREAK: "Streak",
  ENVIRONMENTAL: "Environmental",
  SPECIAL: "Special",
};

const BADGE_RARITIES = {
  COMMON: "Common",
  RARE: "Rare",
  EPIC: "Epic",
  LEGENDARY: "Legendary",
};

const TASK_CATEGORIES = {
  MOBILITY: "Mobility",
  WASTE: "Waste",
  COMMUNITY: "Community",
  VOLUNTEERING: "Volunteering",
};

const DEFAULT_BADGES = [
  // Task-based badges
  {
    name: "Primo Passo",
    description: "Completa il tuo primo task",
    icon: "👣",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { min_tasks_completed: 1 },
    rarity: BADGE_RARITIES.COMMON,
    display_order: 10,
  },
  {
    name: "Operatore di Successo",
    description: "Completa 10 task",
    icon: "💪",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { min_tasks_completed: 10 },
    rarity: BADGE_RARITIES.COMMON,
    display_order: 11,
  },
  {
    name: "Maestro delle Missioni",
    description: "Completa 50 task",
    icon: "🎯",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { min_tasks_completed: 50 },
    rarity: BADGE_RARITIES.EPIC,
    display_order: 12,
  },

  // Category-specific badges
  {
    name: "Mobilità Verde",
    description: "Completa 15 task di mobilità",
    icon: "🚴",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { tasks_by_category: { [TASK_CATEGORIES.MOBILITY]: 15 } },
    rarity: BADGE_RARITIES.RARE,
    display_order: 20,
  },
  {
    name: "Guardiano dei Rifiuti",
    description: "Completa 15 task sui rifiuti",
    icon: "♻️",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { tasks_by_category: { [TASK_CATEGORIES.WASTE]: 15 } },
    rarity: BADGE_RARITIES.RARE,
    display_order: 21,
  },
  {
    name: "Cuore della Comunità",
    description: "Completa 15 task comunitari",
    icon: "❤️",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { tasks_by_category: { [TASK_CATEGORIES.COMMUNITY]: 15 } },
    rarity: BADGE_RARITIES.RARE,
    display_order: 22,
  },
  {
    name: "Volontario d'Oro",
    description: "Completa 15 task di volontariato",
    icon: "🤝",
    category: BADGE_CATEGORIES.TASKS,
    requirements: { tasks_by_category: { [TASK_CATEGORIES.VOLUNTEERING]: 15 } },
    rarity: BADGE_RARITIES.RARE,
    display_order: 23,
  },

  // Streak badges
  {
    name: "Costanza Premiata",
    description: "Mantieni una streak di 7 giorni",
    icon: "🔥",
    category: BADGE_CATEGORIES.STREAK,
    requirements: { min_streak: 7 },
    rarity: BADGE_RARITIES.RARE,
    display_order: 30,
  },
  {
    name: "Determinazione Inossidabile",
    description: "Mantieni una streak di 30 giorni",
    icon: "💎",
    category: BADGE_CATEGORIES.STREAK,
    requirements: { min_streak: 30 },
    rarity: BADGE_RARITIES.EPIC,
    display_order: 31,
  },
  {
    name: "Leggenda Immortale",
    description: "Mantieni una streak di 100 giorni",
    icon: "🌟",
    category: BADGE_CATEGORIES.STREAK,
    requirements: { min_streak: 100 },
    rarity: BADGE_RARITIES.LEGENDARY,
    display_order: 32,
  },

  // Environmental impact badges
  {
    name: "Salvatore del Clima",
    description: "Risparmia 50 kg di CO2",
    icon: "🌍",
    category: BADGE_CATEGORIES.ENVIRONMENTAL,
    requirements: { min_co2_saved: 50 },
    rarity: BADGE_RARITIES.RARE,
    display_order: 40,
  },
  {
    name: "Campione del Riciclo",
    description: "Ricicla 100 kg di rifiuti",
    icon: "🌿",
    category: BADGE_CATEGORIES.ENVIRONMENTAL,
    requirements: { min_waste_recycled: 100 },
    rarity: BADGE_RARITIES.RARE,
    display_order: 41,
  },
  {
    name: "Maratoneta Verde",
    description: "Percorri 100 km con mobilità sostenibile",
    icon: "🚲",
    category: BADGE_CATEGORIES.ENVIRONMENTAL,
    requirements: { min_km_green: 100 },
    rarity: BADGE_RARITIES.EPIC,
    display_order: 42,
  },
];

const seed = async () => {
  const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/re-action";

  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB at", dbUrl);

    for (const badgeData of DEFAULT_BADGES) {
      const existing = await Badge.findOne({ name: badgeData.name });

      if (!existing) {
        await Badge.create(badgeData);
        console.log(`Created badge: ${badgeData.name}`);
      } else {
        await Badge.findOneAndUpdate({ name: badgeData.name }, badgeData, {
          new: true,
        });
        console.log(`Updated badge: ${badgeData.name}`);
      }
    }

    console.log("✅ Badge seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Badge seeding failed:", err);
    process.exit(1);
  }
};

seed();

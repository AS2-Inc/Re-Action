import dotenv from "dotenv";
import mongoose from "mongoose";
import Neighborhood from "../app/models/neighborhood.js";

dotenv.config();

const neighborhoods = [
  // Central
  { name: "Trento Centro", city: "Trento" },
  { name: "San Giuseppe", city: "Trento" },
  { name: "San Pio X", city: "Trento" },
  { name: "San Martino", city: "Trento" },
  { name: "Solteri - Centochiavi", city: "Trento" },
  { name: "Bolghera", city: "Trento" },
  { name: "Clarina", city: "Trento" },
  { name: "Cristo Re", city: "Trento" },
  { name: "Piedicastello", city: "Trento" },

  // North
  { name: "Gardolo", city: "Trento" },
  { name: "Meano", city: "Trento" },
  { name: "Melta", city: "Trento" },
  { name: "Roncafort", city: "Trento" },

  // South
  { name: "Mattarello", city: "Trento" },
  { name: "Ravina", city: "Trento" },
  { name: "Romagnano", city: "Trento" },
  { name: "Le Albere", city: "Trento" },

  // Hills/Mountain
  { name: "Povo", city: "Trento" },
  { name: "Villazzano", city: "Trento" },
  { name: "Martignano", city: "Trento" },
  { name: "Cognola", city: "Trento" },
  { name: "Sardagna", city: "Trento" },
  { name: "Sopramonte", city: "Trento" },
  { name: "Monte Bondone", city: "Trento" },
];

const buildDefaults = () => ({
  base_points: 0,
  normalized_points: 0,
  ranking_position: 0,
  last_ranking_update: null,
  environmental_data: {
    co2_saved: 0,
    waste_recycled: 0,
    km_green: 0,
    last_updated: new Date(),
  },
  active_goals: [],
});

const seed = async () => {
  const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/re-action";

  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB at", dbUrl);

    for (const n of neighborhoods) {
      const existing = await Neighborhood.findOne({
        name: n.name,
        city: n.city,
      });
      if (!existing) {
        await Neighborhood.create({
          ...n,
          ...buildDefaults(),
        });
        console.log(`Created neighborhood: ${n.name}`);
        continue;
      }

      const updates = {};
      const env = existing.environmental_data || {};
      const envUpdates = {
        co2_saved: env.co2_saved ?? 0,
        waste_recycled: env.waste_recycled ?? 0,
        km_green: env.km_green ?? 0,
        last_updated: env.last_updated ?? new Date(),
      };

      if (existing.base_points === undefined) updates.base_points = 0;
      if (existing.normalized_points === undefined)
        updates.normalized_points = 0;
      if (existing.ranking_position === undefined) updates.ranking_position = 0;
      if (existing.last_ranking_update === undefined)
        updates.last_ranking_update = null;

      if (
        !existing.environmental_data ||
        env.co2_saved === undefined ||
        env.waste_recycled === undefined ||
        env.km_green === undefined ||
        env.last_updated === undefined
      ) {
        updates.environmental_data = envUpdates;
      }

      if (!Array.isArray(existing.active_goals)) {
        updates.active_goals = [];
      }

      if (Object.keys(updates).length > 0) {
        await Neighborhood.updateOne({ _id: existing._id }, { $set: updates });
        console.log(`Updated neighborhood defaults: ${n.name}`);
      } else {
        console.log(`Neighborhood already exists: ${n.name}`);
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

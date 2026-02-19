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

const seed = async () => {
  const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/re-action";

  try {
    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB at", dbUrl);

    for (const n of neighborhoods) {
      const existing = await Neighborhood.findOne({ name: n.name });
      if (!existing) {
        await Neighborhood.create({
          ...n,
          base_points: 0,
          normalized_points: 0,
          ranking_position: 0,
          environmental_data: {
            co2_saved: 0,
            waste_recycled: 0,
            km_green: 0,
            last_updated: new Date(),
          },
        });
        console.log(`Created neighborhood: ${n.name}`);
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

import Badge from "../models/badge.js";
import User from "../models/user.js";
import Activity from "../models/activity.js";

// Badge Service - Manages automatic badge awarding based on user achievements
class BadgeService {
  /**
   * Initialize default badges in the database
   * Should be called once during application setup
   */
  async initializeDefaultBadges() {
    const defaultBadges = [
      // Points-based badges
      {
        name: "Nuovo Arrivato",
        description: "Guadagna i tuoi primi 100 punti",
        icon: "🌱",
        category: "Points",
        requirements: { min_points: 100 },
        rarity: "Common",
        display_order: 1,
      },
      {
        name: "Cittadino Attivo",
        description: "Accumula 500 punti",
        icon: "⭐",
        category: "Points",
        requirements: { min_points: 500 },
        rarity: "Common",
        display_order: 2,
      },
      {
        name: "Eroe Locale",
        description: "Raggiungi 1000 punti",
        icon: "🏆",
        category: "Points",
        requirements: { min_points: 1000 },
        rarity: "Rare",
        display_order: 3,
      },
      {
        name: "King della Sostenibilità",
        description:
          "Accumula 5000 punti e diventa un campione della sostenibilità",
        icon: "👑",
        category: "Points",
        requirements: { min_points: 5000 },
        rarity: "Legendary",
        display_order: 4,
      },

      // Task-based badges
      {
        name: "Primo Passo",
        description: "Completa il tuo primo task",
        icon: "👣",
        category: "Tasks",
        requirements: { min_tasks_completed: 1 },
        rarity: "Common",
        display_order: 10,
      },
      {
        name: "Operatore di Successo",
        description: "Completa 10 task",
        icon: "💪",
        category: "Tasks",
        requirements: { min_tasks_completed: 10 },
        rarity: "Common",
        display_order: 11,
      },
      {
        name: "Maestro delle Missioni",
        description: "Completa 50 task",
        icon: "🎯",
        category: "Tasks",
        requirements: { min_tasks_completed: 50 },
        rarity: "Epic",
        display_order: 12,
      },

      // Category-specific badges
      {
        name: "Mobilità Verde",
        description: "Completa 15 task di mobilità",
        icon: "🚴",
        category: "Tasks",
        requirements: { tasks_by_category: { Mobility: 15 } },
        rarity: "Rare",
        display_order: 20,
      },
      {
        name: "Guardiano dei Rifiuti",
        description: "Completa 15 task sui rifiuti",
        icon: "♻️",
        category: "Tasks",
        requirements: { tasks_by_category: { Waste: 15 } },
        rarity: "Rare",
        display_order: 21,
      },
      {
        name: "Cuore della Comunità",
        description: "Completa 15 task comunitari",
        icon: "❤️",
        category: "Tasks",
        requirements: { tasks_by_category: { Community: 15 } },
        rarity: "Rare",
        display_order: 22,
      },
      {
        name: "Volontario d'Oro",
        description: "Completa 15 task di volontariato",
        icon: "🤝",
        category: "Tasks",
        requirements: { tasks_by_category: { Volunteering: 15 } },
        rarity: "Rare",
        display_order: 23,
      },

      // Streak badges
      {
        name: "Costanza Premiata",
        description: "Mantieni una streak di 7 giorni",
        icon: "🔥",
        category: "Streak",
        requirements: { min_streak: 7 },
        rarity: "Rare",
        display_order: 30,
      },
      {
        name: "Determinazione Inossidabile",
        description: "Mantieni una streak di 30 giorni",
        icon: "💎",
        category: "Streak",
        requirements: { min_streak: 30 },
        rarity: "Epic",
        display_order: 31,
      },
      {
        name: "Leggenda Immortale",
        description: "Mantieni una streak di 100 giorni",
        icon: "🌟",
        category: "Streak",
        requirements: { min_streak: 100 },
        rarity: "Legendary",
        display_order: 32,
      },

      // Environmental impact badges
      {
        name: "Salvatore del Clima",
        description: "Risparmia 50 kg di CO2",
        icon: "🌍",
        category: "Environmental",
        requirements: { min_co2_saved: 50 },
        rarity: "Rare",
        display_order: 40,
      },
      {
        name: "Campione del Riciclo",
        description: "Ricicla 100 kg di rifiuti",
        icon: "🌿",
        category: "Environmental",
        requirements: { min_waste_recycled: 100 },
        rarity: "Rare",
        display_order: 41,
      },
      {
        name: "Maratoneta Verde",
        description: "Percorri 100 km con mobilità sostenibile",
        icon: "🚲",
        category: "Environmental",
        requirements: { min_km_green: 100 },
        rarity: "Epic",
        display_order: 42,
      },
    ];

    try {
      for (const badgeData of defaultBadges) {
        await Badge.findOneAndUpdate({ name: badgeData.name }, badgeData, {
          upsert: true,
          new: true,
        });
      }
      console.log("✅ Default badges initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing badges:", error);
    }
  }

  /**
   * Check and award badges to a user based on their current statistics
   * @param {string} userId - The user's MongoDB ID
   * @returns {Array} Array of newly awarded badges
   */
  async checkAndAwardBadges(userId) {
    try {
      const user = await User.findById(userId).populate("badges_id");
      if (!user) {
        throw new Error("User not found");
      }

      const allBadges = await Badge.find({});

      const userBadgeIds = user.badges_id.map((badge) =>
        typeof badge === "object" ? badge._id.toString() : badge.toString(),
      );

      const completedActivities = await Activity.find({
        user_id: userId,
        status: "APPROVED",
      }).populate("task_id");

      const tasksByCategory = {
        Mobility: 0,
        Waste: 0,
        Community: 0,
        Volunteering: 0,
      };

      completedActivities.forEach((activity) => {
        if (activity.task_id?.category) {
          tasksByCategory[activity.task_id.category] =
            (tasksByCategory[activity.task_id.category] || 0) + 1;
        }
      });

      const totalTasksCompleted = completedActivities.length;

      const newlyAwardedBadges = [];

      for (const badge of allBadges) {
        if (userBadgeIds.includes(badge._id.toString())) {
          continue;
        }

        let qualifies = true;
        const req = badge.requirements;

        if (req.min_points !== undefined && user.points < req.min_points) {
          qualifies = false;
        }

        if (
          req.min_tasks_completed !== undefined &&
          totalTasksCompleted < req.min_tasks_completed
        ) {
          qualifies = false;
        }

        if (req.tasks_by_category) {
          for (const [category, required] of Object.entries(
            req.tasks_by_category,
          )) {
            if (required && (tasksByCategory[category] || 0) < required) {
              qualifies = false;
              break;
            }
          }
        }

        if (req.min_streak !== undefined && user.streak < req.min_streak) {
          qualifies = false;
        }

        if (
          req.min_co2_saved !== undefined &&
          user.ambient.co2_saved < req.min_co2_saved
        ) {
          qualifies = false;
        }

        if (
          req.min_waste_recycled !== undefined &&
          user.ambient.waste_recycled < req.min_waste_recycled
        ) {
          qualifies = false;
        }

        if (
          req.min_km_green !== undefined &&
          user.ambient.km_green < req.min_km_green
        ) {
          qualifies = false;
        }

        // Award the badge if all requirements are met
        if (qualifies) {
          user.badges_id.push(badge._id);
          newlyAwardedBadges.push(badge);
          console.log(`🎖️ Badge "${badge.name}" awarded to user ${user.email}`);
        }
      }

      if (user.points >= 5000) {
        user.level = "King della Sostenibilità";
      } else if (user.points >= 1000) {
        user.level = "Eroe Locale";
      } else if (user.points >= 500) {
        user.level = "Cittadino Attivo";
      } else if (user.points >= 100) {
        user.level = "Nuovo Arrivato";
      } else {
        user.level = "Cittadino Base";
      }

      if (newlyAwardedBadges.length > 0) {
        await user.save();
      }

      return newlyAwardedBadges;
    } catch (error) {
      console.error("Error checking badges:", error);
      return [];
    }
  }

  /**
   * Get all badges with user's earned status
   * @param {string} userId - The user's MongoDB ID
   * @returns {Array} Array of all badges with earned flag
   */
  async getAllBadgesWithStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const allBadges = await Badge.find({}).sort({ display_order: 1 });
      const userBadgeIds = user.badges_id.map((id) => id.toString());

      return allBadges.map((badge) => ({
        ...badge.toObject(),
        earned: userBadgeIds.includes(badge._id.toString()),
      }));
    } catch (error) {
      console.error("Error getting badges:", error);
      return [];
    }
  }
}

export default new BadgeService();

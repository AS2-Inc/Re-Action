import mongoose, { Schema } from "mongoose";

const QuizSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  passing_score: { type: Number, default: 0.8 }, // Percentage required to pass (0.0 to 1.0)
  questions: [
    {
      text: { type: String, required: true },
      options: [{ type: String, required: true }],
      correct_option_index: { type: Number, required: true },
    },
  ],
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model("Quiz", QuizSchema);

import ServiceError from "../errors/service_error.js";
import Quiz from "../models/quiz.js";

export const get_quiz_by_id = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      throw new ServiceError("Quiz not found", 404);
    }

    const quiz_send_to = {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map((q) => ({
        text: q.text,
        options: q.options,
      })),
      created_at: quiz.created_at,
    };

    res.status(200).json(quiz_send_to);
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
};

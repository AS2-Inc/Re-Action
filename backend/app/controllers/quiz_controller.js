import ServiceError from "../errors/service_error.js";
import Quiz from "../models/quiz.js";

export const list_quizzes = async (_req, res) => {
  try {
    const quizzes = await Quiz.find({}, "title description created_at").sort({
      created_at: -1,
    });

    const result = quizzes.map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      created_at: quiz.created_at,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error listing quizzes:", error);
    res.status(500).json({ error: "Failed to list quizzes" });
  }
};

export const create_quiz = async (req, res) => {
  try {
    const { title, description, passing_score, questions } = req.body;

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      throw new ServiceError("Invalid quiz data", 400);
    }

    const score_source =
      passing_score === undefined || passing_score === null
        ? 0.8
        : passing_score;
    const normalized_score =
      score_source > 1 ? Number(score_source) / 100 : Number(score_source);
    if (Number.isNaN(normalized_score) || normalized_score <= 0) {
      throw new ServiceError("Invalid passing score", 400);
    }

    const normalized_questions = questions.map((q, index) => {
      if (!q?.text || !Array.isArray(q.options) || q.options.length < 2) {
        throw new ServiceError(`Invalid question at index ${index}`, 400);
      }
      const correct_index = Number(q.correct_option_index);
      if (
        Number.isNaN(correct_index) ||
        correct_index < 0 ||
        correct_index >= q.options.length
      ) {
        throw new ServiceError(
          `Invalid correct option index at question ${index}`,
          400,
        );
      }

      return {
        text: q.text,
        options: q.options,
        correct_option_index: correct_index,
      };
    });

    const quiz = new Quiz({
      title,
      description,
      passing_score: normalized_score,
      questions: normalized_questions,
    });

    await quiz.save();

    res.status(201).json({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      created_at: quiz.created_at,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error creating quiz:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
};

export const get_quiz_by_id = async (req, res) => {
  try {
    const quizId = req.params.id;

    // Validate quiz ID
    if (!quizId || quizId === "undefined" || quizId === "null") {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    const quiz = await Quiz.findById(quizId);
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
    // Handle Mongoose CastError (invalid ObjectId)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid quiz ID format" });
    }
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
};

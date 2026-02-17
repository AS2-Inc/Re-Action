import ServiceError from "../../errors/service_error.js";
import Quiz from "../../models/quiz.js";

export const verify = async (task, proof) => {
  if (!task.verification_criteria?.quiz_id) {
    throw new ServiceError("Task misconfiguration: No Quiz ID", 400);
  }
  const quiz = await Quiz.findById(task.verification_criteria.quiz_id);
  if (!quiz) {
    throw new ServiceError("Quiz not found", 404);
  }

  const user_answers = proof?.quiz_answers; // Array of option indices
  if (
    !user_answers ||
    !Array.isArray(user_answers) ||
    user_answers.length !== quiz.questions.length
  ) {
    throw new ServiceError("Incomplete or missing quiz answers", 400);
  }

  let correct_count = 0;
  quiz.questions.forEach((q, index) => {
    if (user_answers[index] === q.correct_option_index) {
      correct_count++;
    }
  });

  const score = correct_count / quiz.questions.length;
  // Enrich proof
  proof.quiz_score = score;

  if (score >= quiz.passing_score) {
    return { status: "APPROVED", enriched_proof: proof };
  } else {
    throw new ServiceError(
      `Quiz score ${(score * 100).toFixed(0)}% is below passing score ${(quiz.passing_score * 100).toFixed(0)}%`,
      400,
    );
  }
};

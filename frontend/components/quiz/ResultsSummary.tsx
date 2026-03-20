"use client";

/**
 * ResultsSummary — End-of-session results page displayed after completing all quiz questions.
 *
 * Shows a comprehensive breakdown of the user's performance:
 * 1. Score display with percentage and color-coded feedback
 * 2. Time taken and average time per question
 * 3. Score breakdown by difficulty level (easy/medium/hard)
 * 4. List of incorrectly answered questions with review links
 * 5. List of flagged/bookmarked questions with review links
 * 6. Navigation buttons to dashboard, topics, or full review
 */

import { useMemo } from "react";
import type { Question, QuestionState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

/**
 * Props for the ResultsSummary component.
 * Receives all quiz data needed to compute and display results.
 */
interface ResultsSummaryProps {
  /** Array of all questions in the quiz session */
  questions: Question[];
  /** Per-question state map with answers, flags, and submission results */
  questionStates: Map<number, QuestionState>;
  /** Timestamp (Date.now()) from when the quiz session started */
  sessionStartTime: number;
  /** Callback to navigate back to the main dashboard */
  onBackToDashboard: () => void;
  /** Callback to jump back to a specific question for review */
  onReviewQuestion: (index: number) => void;
}

/**
 * Format elapsed time in milliseconds to a human-readable string.
 * Returns "Xh Ym" for durations over an hour, otherwise "Xm Ys".
 *
 * @param ms - Elapsed time in milliseconds
 * @returns Formatted time string (e.g., "5m 32s" or "1h 15m")
 */
function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

/**
 * Determine the color class for the score percentage.
 * Green for >= 70%, yellow for 50-69%, red for < 50%.
 *
 * @param percentage - Score as a percentage (0-100)
 * @returns Tailwind color class string
 */
function getScoreColor(percentage: number): string {
  if (percentage >= 70) return "text-green-600";
  if (percentage >= 50) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Truncate a question stem to a maximum length for display in the review list.
 *
 * @param stem - The full question stem text
 * @param maxLength - Maximum characters to show (default 80)
 * @returns Truncated stem with "..." if shortened
 */
function truncateStem(stem: string, maxLength: number = 80): string {
  if (stem.length <= maxLength) return stem;
  return stem.slice(0, maxLength) + "...";
}

export default function ResultsSummary({
  questions,
  questionStates,
  sessionStartTime,
  onBackToDashboard,
  onReviewQuestion,
}: ResultsSummaryProps) {
  /**
   * Compute all results data in a single memo pass.
   * Calculates correct count, wrong answers list, flagged list,
   * difficulty breakdown, and time statistics.
   */
  const results = useMemo(() => {
    let correct = 0;
    const wrongAnswers: { index: number; question: Question; userAnswer: string; correctAnswer: string }[] = [];
    const flaggedQuestions: { index: number; question: Question }[] = [];
    /** Difficulty breakdown — maps difficulty level to { correct, total } counts */
    const difficultyMap = new Map<string, { correct: number; total: number }>();

    for (let i = 0; i < questions.length; i++) {
      const state = questionStates.get(i);
      const question = questions[i];

      // Track difficulty breakdown
      const difficulty = question.difficulty || "unknown";
      const existing = difficultyMap.get(difficulty) || { correct: 0, total: 0 };
      existing.total++;

      if (state?.submitResult) {
        if (state.submitResult.is_correct) {
          correct++;
          existing.correct++;
        } else {
          // Add to wrong answers list for review
          wrongAnswers.push({
            index: i,
            question,
            userAnswer: state.submitResult.selected_option_label,
            correctAnswer: state.submitResult.correct_option_label,
          });
        }
      }

      difficultyMap.set(difficulty, existing);

      // Track flagged questions separately
      if (state?.isFlagged) {
        flaggedQuestions.push({ index: i, question });
      }
    }

    // Calculate time statistics
    const elapsedMs = Date.now() - sessionStartTime;
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const avgSecondsPerQuestion = questions.length > 0
      ? Math.round(totalSeconds / questions.length)
      : 0;

    const percentage = questions.length > 0
      ? Math.round((correct / questions.length) * 100)
      : 0;

    return {
      correct,
      total: questions.length,
      percentage,
      wrongAnswers,
      flaggedQuestions,
      difficultyMap,
      elapsedMs,
      avgSecondsPerQuestion,
    };
  }, [questions, questionStates, sessionStartTime]);

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      {/* ===== Navy Header Bar ===== */}
      <div className="bg-blue-900 text-white rounded-lg p-4 text-center">
        <h2 className="text-2xl font-bold">Quiz Results</h2>
      </div>

      {/* ===== Score Section ===== */}
      {/* Large score display with percentage and color feedback */}
      <Card>
        <CardContent className="pt-6 text-center">
          {/* Large score fraction */}
          <div className={`text-5xl font-bold ${getScoreColor(results.percentage)}`}>
            {results.correct}/{results.total}
          </div>
          {/* Percentage below */}
          <div className={`text-2xl font-semibold mt-2 ${getScoreColor(results.percentage)}`}>
            {results.percentage}%
          </div>
          <p className="text-muted-foreground mt-2">Questions Answered Correctly</p>
        </CardContent>
      </Card>

      {/* ===== Time Section ===== */}
      {/* Elapsed time and average time per question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Taken</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              {/* Total elapsed time */}
              <span className="text-xl font-semibold">
                {formatElapsedTime(results.elapsedMs)}
              </span>
            </div>
            <div className="text-muted-foreground">
              {/* Average seconds per question */}
              {results.avgSecondsPerQuestion}s per question
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Score Breakdown by Difficulty ===== */}
      {/* Shows per-difficulty correct/total if difficulty data is available */}
      {results.difficultyMap.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Array.from(results.difficultyMap.entries()).map(([difficulty, stats]) => (
                <div
                  key={difficulty}
                  className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm"
                >
                  {/* Capitalize first letter of difficulty level */}
                  <span className="font-medium capitalize">{difficulty}:</span>
                  <span>
                    {stats.correct}/{stats.total}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Wrong Answers List ===== */}
      {/* Lists all incorrectly answered questions with review buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Questions to Review ({results.wrongAnswers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.wrongAnswers.length === 0 ? (
            /* Perfect score congratulations */
            <p className="text-green-600 font-medium">
              Perfect score! No questions to review.
            </p>
          ) : (
            <div className="space-y-3">
              {results.wrongAnswers.map(({ index, question, userAnswer, correctAnswer }) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                >
                  <div className="flex-1 mr-3">
                    {/* Question number and truncated stem */}
                    <div className="font-medium text-sm">
                      Q{index + 1}: {truncateStem(question.stem)}
                    </div>
                    {/* User's answer vs correct answer */}
                    <div className="text-xs text-muted-foreground mt-1">
                      Your answer: <span className="text-red-600 font-medium">{userAnswer}</span>
                      {" | "}
                      Correct: <span className="text-green-600 font-medium">{correctAnswer}</span>
                    </div>
                  </div>
                  {/* Review button — jumps back to this question */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReviewQuestion(index)}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Flagged Questions List ===== */}
      {/* Only shown if the user flagged any questions during the session */}
      {results.flaggedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Flagged for Review ({results.flaggedQuestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.flaggedQuestions.map(({ index, question }) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                >
                  <div className="flex-1 mr-3">
                    {/* Question number and truncated stem */}
                    <div className="font-medium text-sm">
                      Q{index + 1}: {truncateStem(question.stem)}
                    </div>
                  </div>
                  {/* Review button — jumps back to the flagged question */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReviewQuestion(index)}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Action Buttons ===== */}
      {/* Navigation options after reviewing results */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* Primary: return to dashboard */}
        <Button onClick={onBackToDashboard} className="bg-blue-900 hover:bg-blue-800">
          Back to Dashboard
        </Button>
        {/* Secondary: review all questions from the beginning */}
        <Button
          variant="outline"
          onClick={() => onReviewQuestion(0)}
        >
          Review All Questions
        </Button>
        {/* Secondary: try a different topic */}
        <Button
          variant="outline"
          onClick={() => { window.location.href = "/topics"; }}
        >
          Try Another Topic
        </Button>
      </div>
    </div>
  );
}

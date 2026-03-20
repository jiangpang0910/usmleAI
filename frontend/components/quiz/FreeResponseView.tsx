"use client";

/**
 * FreeResponseView -- Renders free-response USMLE questions.
 *
 * Displays a clinical vignette with a large textarea for the student to
 * write their clinical reasoning. On submission, the response is sent
 * to the Claude AI backend for evaluation, which returns a 0-10 score
 * with detailed constructive feedback.
 *
 * Features:
 * - Character count indicator
 * - Minimum 20-character requirement before submission
 * - Color-coded score display (green 8-10, yellow 5-7, red 0-4)
 * - Collapsible model answer section
 * - TeachingPanel for additional AI-powered feedback
 */

import { useState } from "react";
import type { Question, FreeResponseEvaluation } from "@/lib/types";
import { submitFreeResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TeachingPanel from "./TeachingPanel";
import { cn } from "@/lib/utils";

/**
 * Props for the FreeResponseView component.
 */
interface FreeResponseViewProps {
  /** The free-response question to render */
  question: Question;
  /** Callback invoked when the student completes this question */
  onComplete: () => void;
}

/** Minimum character count required before the response can be submitted */
const MIN_RESPONSE_LENGTH = 20;

/**
 * Get the Tailwind color class for a score value.
 * Maps score ranges to green (high), yellow (medium), or red (low).
 *
 * @param score - The evaluation score (0-10)
 * @returns Tailwind text color class string
 */
function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 5) return "text-amber-600";
  return "text-red-600";
}

/**
 * Get the Tailwind background color class for a score value.
 * Used for the score badge background.
 *
 * @param score - The evaluation score (0-10)
 * @returns Tailwind background color class string
 */
function getScoreBgColor(score: number): string {
  if (score >= 8) return "bg-green-50 border-green-200";
  if (score >= 5) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function FreeResponseView({
  question,
  onComplete,
}: FreeResponseViewProps) {
  /** The student's text area content */
  const [userResponse, setUserResponse] = useState("");
  /** AI evaluation result from Claude */
  const [evaluation, setEvaluation] = useState<FreeResponseEvaluation | null>(null);
  /** Whether a submission/evaluation is in progress */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Error message if the submission fails */
  const [error, setError] = useState<string | null>(null);
  /** Whether the model answer section is expanded */
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  /** Whether the response meets the minimum length requirement */
  const canSubmit = userResponse.trim().length >= MIN_RESPONSE_LENGTH;

  /** Whether the evaluation has been received */
  const isEvaluated = !!evaluation;

  /**
   * Submit the student's response to the backend for AI evaluation.
   * Sends the question ID and user response to the free-response endpoint.
   */
  async function handleSubmit() {
    if (!canSubmit || isSubmitting || isEvaluated) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitFreeResponse({
        question_id: question.id,
        user_response: userResponse.trim(),
      });
      setEvaluation(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to evaluate response"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== Question Stem ===== */}
      {/* Display the clinical vignette in large readable font */}
      <div className="prose prose-lg max-w-none">
        <p className="whitespace-pre-wrap">{question.stem}</p>
      </div>

      {/* ===== Response Textarea ===== */}
      {/* Large textarea for the student to type their clinical reasoning */}
      <div className="space-y-2">
        <textarea
          value={userResponse}
          onChange={(e) => setUserResponse(e.target.value)}
          placeholder="Type your clinical reasoning here..."
          rows={6}
          readOnly={isEvaluated}
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-sm leading-relaxed resize-y",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            isEvaluated
              ? "bg-gray-50 border-gray-200 cursor-default"
              : "border-gray-300"
          )}
        />
        {/* Character count indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {userResponse.length} character{userResponse.length !== 1 ? "s" : ""}
            {!canSubmit && userResponse.length > 0 && (
              <span className="text-amber-600 ml-1">
                (minimum {MIN_RESPONSE_LENGTH} characters)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ===== Error Display ===== */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">Error: {error}</p>
        </div>
      )}

      {/* ===== Loading State ===== */}
      {isSubmitting && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-700 animate-pulse">
            Evaluating your response...
          </p>
        </div>
      )}

      {/* ===== Evaluation Results ===== */}
      {/* Shown after Claude evaluates the student's response */}
      {evaluation && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Evaluation</CardTitle>
              {/* Score badge with color coding */}
              <div
                className={cn(
                  "px-4 py-2 rounded-lg border text-center",
                  getScoreBgColor(evaluation.score)
                )}
              >
                <span
                  className={cn(
                    "text-2xl font-bold",
                    getScoreColor(evaluation.score)
                  )}
                >
                  {evaluation.score}
                </span>
                <span className="text-sm text-muted-foreground">/10</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Claude's detailed feedback */}
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{evaluation.feedback}</p>
            </div>

            {/* Collapsible model answer section */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowModelAnswer(!showModelAnswer)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {showModelAnswer ? "Hide" : "Show"} Model Answer
                <span className="text-xs">
                  {showModelAnswer ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              {showModelAnswer && (
                <div className="mt-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {evaluation.model_answer}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Action Buttons ===== */}
      <div className="flex items-center justify-end gap-2">
        {!isEvaluated && (
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Evaluating..." : "Submit Response"}
          </Button>
        )}
        {isEvaluated && (
          <Button onClick={onComplete}>Next Question</Button>
        )}
      </div>

      {/* ===== Teaching Panel ===== */}
      {/* AI-powered explanation shown after evaluation */}
      <TeachingPanel
        questionId={question.id}
        userAnswerLabel=""
        isVisible={isEvaluated}
      />
    </div>
  );
}

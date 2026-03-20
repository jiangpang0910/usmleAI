"use client";

/**
 * SequentialCaseView -- Multi-part sequential case question component.
 *
 * Renders a USMLE-style sequential item set where each question builds
 * on the prior answer. Key behaviors:
 * - Only the current part is interactive; previous parts are locked
 * - A warning dialog appears before locking each answer (except the last)
 * - Previous parts are shown in a collapsed summary view with correct/incorrect indicators
 * - Progress indicator shows "Part X of Y"
 * - After the last part, shows teaching feedback and calls onCaseComplete
 */

import { useState } from "react";
import type { Question, AnswerSubmitResponse } from "@/lib/types";
import { submitAnswer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AnswerOption from "./AnswerOption";
import TeachingPanel from "./TeachingPanel";

/**
 * Props for the SequentialCaseView component.
 * Receives all questions in the case (ordered) and a callback for case completion.
 */
interface SequentialCaseViewProps {
  /** All parts of this sequential case, ordered by part number */
  questions: Question[];
  /** Called when the user has answered all parts of the case */
  onCaseComplete: () => void;
}

/**
 * Extract the shared clinical scenario from the case stem.
 * Removes the "[Case: ..., Part N of M]" prefix and returns the case ID.
 *
 * @param stem - The full question stem including the case prefix
 * @returns Object with caseId and the display stem text
 */
function parseCaseStem(stem: string): { caseId: string; displayStem: string } {
  // Match the "[Case: XXX, Part N of M]" prefix pattern
  const match = stem.match(/\[Case:\s*([^,]+),\s*Part\s+\d+\s+of\s+\d+\]/);
  const caseId = match ? match[1].trim() : "";
  // Remove the case prefix from the display stem for cleaner presentation
  const displayStem = stem.replace(/\[Case:[^\]]+\]\s*\n*/, "").trim();
  return { caseId, displayStem };
}

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated.
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum character length before truncation
 * @returns Truncated string with "..." suffix if needed
 */
function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export default function SequentialCaseView({
  questions,
  onCaseComplete,
}: SequentialCaseViewProps) {
  /** Index of the current active part (0-based) */
  const [currentPart, setCurrentPart] = useState(0);
  /** Map of part index to submission result -- tracks answers for completed parts */
  const [answers, setAnswers] = useState<Map<number, AnswerSubmitResponse>>(
    new Map()
  );
  /** Currently selected option label for the active part (e.g., "A") */
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  /** Whether an answer submission API call is in progress */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Whether the lock warning modal is being displayed */
  const [showWarning, setShowWarning] = useState(false);
  /** Whether the entire case has been completed (all parts answered) */
  const [caseCompleted, setCaseCompleted] = useState(false);

  /** The question object for the currently active part */
  const currentQuestion = questions[currentPart];
  /** Whether the current part has already been submitted */
  const isCurrentSubmitted = answers.has(currentPart);
  /** Whether this is the last part of the case */
  const isLastPart = currentPart === questions.length - 1;

  /**
   * Handle option selection for the current part.
   * Only allows selection if the part hasn't been submitted yet.
   *
   * @param label - The option label being selected (e.g., "A", "B")
   */
  function handleOptionSelect(label: string) {
    if (isCurrentSubmitted) return;
    setSelectedOption(label);
  }

  /**
   * Handle the submit button click.
   * For non-last parts, shows the lock warning first.
   * For the last part, submits directly without warning.
   */
  function handleSubmitClick() {
    if (!selectedOption || isSubmitting) return;

    if (!isLastPart) {
      // Show the lock warning before submitting non-final parts
      setShowWarning(true);
    } else {
      // Last part submits directly without warning
      performSubmit();
    }
  }

  /**
   * Confirm the lock warning and submit the answer.
   * Called when user clicks "Confirm" on the warning dialog.
   */
  function handleConfirmSubmit() {
    setShowWarning(false);
    performSubmit();
  }

  /**
   * Dismiss the lock warning without submitting.
   * User can change their selection after going back.
   */
  function handleGoBack() {
    setShowWarning(false);
  }

  /**
   * Perform the actual answer submission to the backend API.
   * Stores the result, advances to the next part (or completes the case).
   */
  async function performSubmit() {
    if (!selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Submit the answer to the backend
      const result = await submitAnswer({
        question_id: currentQuestion.id,
        selected_option_label: selectedOption,
      });

      // Store the submission result in the answers map
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentPart, result);
        return next;
      });

      if (isLastPart) {
        // Case is complete -- show teaching panel and notify parent
        setCaseCompleted(true);
      } else {
        // Advance to the next part and reset selection
        setCurrentPart((prev) => prev + 1);
        setSelectedOption(null);
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to submit answer"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== Case Progress Indicator ===== */}
      {/* Shows which part the user is on out of the total */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
          Sequential Case - Part {currentPart + 1} of {questions.length}
        </span>
        {/* Visual progress bar for case completion */}
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{
              width: `${((currentPart + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* ===== Previously Completed Parts (Locked Summary View) ===== */}
      {/* Each completed part is shown collapsed with answer result */}
      {Array.from(answers.entries()).map(([partIndex, result]) => {
        const partQuestion = questions[partIndex];
        const { displayStem } = parseCaseStem(partQuestion.stem);
        return (
          <div
            key={partIndex}
            className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-70"
          >
            {/* Part header with correct/incorrect indicator */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">
                Part {partIndex + 1} of {questions.length}
              </span>
              {/* Green check for correct, red X for incorrect */}
              {result.is_correct ? (
                <span className="text-green-600 text-sm font-bold">
                  &#10003; Correct
                </span>
              ) : (
                <span className="text-red-600 text-sm font-bold">
                  &#10007; Incorrect
                </span>
              )}
            </div>
            {/* Truncated stem text for quick reference */}
            <p className="text-sm text-gray-600">
              {truncateText(displayStem, 100)}
            </p>
            {/* Show what the user answered */}
            <p className="text-xs text-gray-500 mt-1">
              Your answer: {result.selected_option_label} —{" "}
              {result.correct_option_label !== result.selected_option_label && (
                <span>Correct: {result.correct_option_label}</span>
              )}
              {result.correct_option_label === result.selected_option_label && (
                <span>{result.correct_option_text}</span>
              )}
            </p>
          </div>
        );
      })}

      {/* ===== Current Active Part ===== */}
      {/* Full question stem and interactive answer options */}
      {!caseCompleted && (
        <>
          {/* Question stem (clinical vignette) for the current part */}
          <div className="prose prose-lg max-w-none">
            <p className="whitespace-pre-wrap">
              {parseCaseStem(currentQuestion.stem).displayStem}
            </p>
          </div>

          {/* Answer options for the current part */}
          <div className="space-y-3">
            {currentQuestion.answer_options.map((option) => {
              // Get per-option feedback if this part has been submitted
              const result = answers.get(currentPart);
              const optionFeedback = result?.options_feedback?.find(
                (f) => f.label === option.label
              );

              return (
                <AnswerOption
                  key={option.id}
                  label={option.label}
                  text={option.text}
                  isSelected={selectedOption === option.label}
                  isSubmitted={isCurrentSubmitted}
                  isCorrect={
                    isCurrentSubmitted
                      ? result?.correct_option_label === option.label
                      : false
                  }
                  isUserChoice={
                    isCurrentSubmitted
                      ? result?.selected_option_label === option.label
                      : false
                  }
                  onClick={() => handleOptionSelect(option.label)}
                  explanation={
                    isCurrentSubmitted
                      ? optionFeedback?.explanation ?? null
                      : null
                  }
                />
              );
            })}
          </div>

          {/* Submit button -- hidden if current part already submitted */}
          {!isCurrentSubmitted && (
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitClick}
                disabled={!selectedOption || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* ===== Lock Warning Modal ===== */}
      {/* Overlay warning before locking a non-final answer */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            {/* Warning icon and message */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Lock Answer?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You won&apos;t be able to change this answer. Are you sure?
            </p>
            {/* Confirm and Go Back action buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleGoBack}>
                Go Back
              </Button>
              <Button onClick={handleConfirmSubmit}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Case Complete: Teaching Panel for Last Part ===== */}
      {/* Shows AI teaching feedback after the final part is submitted */}
      {caseCompleted && (
        <>
          {/* Show the last part's result summary */}
          {answers.has(questions.length - 1) && (
            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">
                  Part {questions.length} of {questions.length} (Final)
                </span>
                {answers.get(questions.length - 1)!.is_correct ? (
                  <span className="text-green-600 text-sm font-bold">
                    &#10003; Correct
                  </span>
                ) : (
                  <span className="text-red-600 text-sm font-bold">
                    &#10007; Incorrect
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Your answer:{" "}
                {answers.get(questions.length - 1)!.selected_option_label} —{" "}
                Correct: {answers.get(questions.length - 1)!.correct_option_label}
              </p>
            </div>
          )}

          {/* AI-powered teaching panel for the final question */}
          <TeachingPanel
            questionId={questions[questions.length - 1].id}
            userAnswerLabel={
              answers.get(questions.length - 1)?.selected_option_label ?? ""
            }
            isVisible={true}
          />

          {/* Button to advance to the next question set or finish the quiz */}
          <div className="flex justify-end">
            <Button onClick={onCaseComplete}>Continue to Next</Button>
          </div>
        </>
      )}
    </div>
  );
}

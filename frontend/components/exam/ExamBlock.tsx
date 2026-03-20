"use client";

/**
 * ExamBlock -- Timed exam block question view with NO mid-block feedback.
 *
 * Key differences from QuestionView:
 * - NO feedback shown after selecting an answer (no green/red, no explanation)
 * - User clicks an option, it highlights with navy outline, but no correctness indication
 * - Clicking a different option changes selection freely
 * - Timer auto-submits when expired
 * - Question grid at bottom allows jumping to any question
 * - "End Block" button triggers manual submission with confirmation
 *
 * Uses ExamTimer's onTick callback to keep timerRemaining in sync so
 * time_spent_seconds is computed accurately on block submission.
 */

import { useState, useRef } from "react";
import type {
  ExamBlock as ExamBlockType,
  ExamBlockResult,
  SubmitExamBlockRequest,
} from "@/lib/types";
import { submitExamBlock } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ExamTimer from "./ExamTimer";

/**
 * Props for the ExamBlock component.
 */
interface ExamBlockProps {
  /** The exam block data containing questions and time limit */
  block: ExamBlockType;
  /** UUID of the exam session */
  sessionId: string;
  /** Block number (1-indexed, for display and API submission) */
  blockNumber: number;
  /** Callback when block is completed (submitted or timed out) */
  onBlockComplete: (result: ExamBlockResult) => void;
}

/**
 * ExamBlock component -- renders questions in a timed block with no feedback.
 * Manages answer selection, navigation, and block submission.
 */
export default function ExamBlock({
  block,
  sessionId,
  blockNumber,
  onBlockComplete,
}: ExamBlockProps) {
  /** Index of the currently displayed question (0-indexed) */
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  /** Map of question index to selected answer label (e.g., 0 -> "A") */
  const [selectedAnswers, setSelectedAnswers] = useState<Map<number, string>>(
    new Map()
  );

  /** Whether a block submission request is in progress */
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /** Whether the confirm dialog for ending the block is visible */
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  /** Remaining seconds on the timer, updated by ExamTimer's onTick callback.
   *  Used to compute time_spent_seconds = block.time_limit_seconds - timerRemaining */
  const [timerRemaining, setTimerRemaining] = useState<number>(
    block.time_limit_seconds
  );

  /** Ref to prevent double-submission on timer expiry */
  const submittedRef = useRef<boolean>(false);

  /** Current question being displayed */
  const currentQuestion = block.questions[currentIndex];

  /** Total number of questions in this block */
  const totalQuestions = block.questions.length;

  /** Count of answered questions */
  const answeredCount = selectedAnswers.size;

  /**
   * Handle answer option selection for the current question.
   * Updates the selectedAnswers map with the new selection.
   *
   * @param label - The answer option label ("A", "B", "C", etc.)
   */
  function handleSelectAnswer(label: string) {
    if (isSubmitting) return;
    setSelectedAnswers((prev) => {
      const next = new Map(prev);
      next.set(currentIndex, label);
      return next;
    });
  }

  /**
   * Navigate to the previous question.
   * Exam allows revisiting any question within a block.
   */
  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  /**
   * Navigate to the next question.
   */
  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  /**
   * Jump to a specific question by index.
   *
   * @param index - The question index to jump to (0-indexed)
   */
  function handleJumpToQuestion(index: number) {
    setCurrentIndex(index);
  }

  /**
   * Submit the block's answers to the backend for grading.
   * Builds the answers array from selectedAnswers map. Questions with no
   * selection have selected_option_label set to null (marked incorrect by backend).
   * Computes time_spent_seconds from the timer state.
   */
  async function handleSubmitBlock() {
    if (submittedRef.current || isSubmitting) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setShowConfirm(false);

    // Build answers array for all questions in the block
    const answers: SubmitExamBlockRequest["answers"] = block.questions.map(
      (q, idx) => ({
        question_id: q.id,
        selected_option_label: selectedAnswers.get(idx) ?? null,
        topic_id: q.topic_id,
        difficulty: q.difficulty,
      })
    );

    // Compute time spent: total time minus whatever remains on the timer
    const timeSpent = block.time_limit_seconds - timerRemaining;

    try {
      const result = await submitExamBlock({
        session_id: sessionId,
        block_number: blockNumber,
        answers,
        time_spent_seconds: timeSpent,
      });
      onBlockComplete(result);
    } catch (err) {
      // On error, allow retry by resetting submission guard
      submittedRef.current = false;
      setIsSubmitting(false);
      console.error("Failed to submit block:", err);
    }
  }

  /**
   * Handle timer expiry -- auto-submit the block.
   * At expiry, timerRemaining will be 0, so time_spent_seconds = block.time_limit_seconds.
   */
  function handleTimerExpire() {
    handleSubmitBlock();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Top Bar ===== */}
      {/* Block info, question counter, and timer */}
      <header className="bg-[hsl(217,71%,20%)] text-white py-3 px-6 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Block number label */}
          <span className="font-semibold text-lg">Block {blockNumber}</span>

          {/* Question counter */}
          <span className="text-sm text-blue-200">
            {currentIndex + 1} / {totalQuestions}
          </span>

          {/* Exam timer with onTick to keep timerRemaining in sync */}
          <ExamTimer
            totalSeconds={block.time_limit_seconds}
            onExpire={handleTimerExpire}
            onTick={(remaining) => setTimerRemaining(remaining)}
          />
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* ===== Question Stem ===== */}
        {/* Clinical vignette card -- same styling as QuestionView */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {currentQuestion.stem}
            </p>
          </CardContent>
        </Card>

        {/* ===== Answer Options ===== */}
        {/* Clickable cards for each option. Selected shows navy border + light blue bg.
            NO correct/incorrect highlighting -- exam mode has no feedback. */}
        <div className="space-y-3">
          {currentQuestion.answer_options.map((option) => {
            /** Whether this option is currently selected for this question */
            const isSelected = selectedAnswers.get(currentIndex) === option.label;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => handleSelectAnswer(option.label)}
                disabled={isSubmitting}
                className={`w-full text-left p-4 rounded-lg transition-colors ${
                  isSelected
                    ? "border-2 border-[hsl(217,71%,20%)] bg-blue-50"
                    : "border border-gray-200 hover:border-blue-400 cursor-pointer"
                } ${isSubmitting ? "cursor-default opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Option label badge (A, B, C, etc.) */}
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isSelected
                        ? "bg-[hsl(217,71%,20%)] text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {option.label}
                  </span>
                  {/* Option text */}
                  <p className="text-sm leading-relaxed flex-1">{option.text}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ===== Navigation Buttons ===== */}
        {/* Previous and Next buttons -- both always enabled within bounds.
            Exam allows revisiting any question within a block. */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0 || isSubmitting}
          >
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === totalQuestions - 1 || isSubmitting}
          >
            Next
          </Button>
        </div>

        {/* ===== Question Grid ===== */}
        {/* Small numbered boxes showing answered (filled navy) vs unanswered (outline).
            Clicking a number jumps to that question. */}
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Question Navigator ({answeredCount}/{totalQuestions} answered)
          </p>
          <div className="flex flex-wrap gap-1">
            {block.questions.map((_, idx) => {
              /** Whether this question has been answered */
              const isAnswered = selectedAnswers.has(idx);
              /** Whether this is the currently active question */
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJumpToQuestion(idx)}
                  disabled={isSubmitting}
                  className={`w-8 h-8 text-xs rounded flex items-center justify-center transition-colors ${
                    isCurrent
                      ? "ring-2 ring-blue-400"
                      : ""
                  } ${
                    isAnswered
                      ? "bg-[hsl(217,71%,20%)] text-white"
                      : "border border-gray-300 text-gray-600 hover:border-blue-400"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== End Block Button ===== */}
        {/* Opens confirm dialog before submitting */}
        {!showConfirm ? (
          <Button
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
          >
            End Block
          </Button>
        ) : (
          /* Confirmation dialog -- warns about unanswered questions */
          <Card className="border-red-200 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm font-medium">
                Submit this block? You answered {answeredCount} of{" "}
                {totalQuestions} questions.{" "}
                {answeredCount < totalQuestions && (
                  <span className="text-red-600">
                    Unanswered questions will be marked incorrect.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleSubmitBlock}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Confirm Submit"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

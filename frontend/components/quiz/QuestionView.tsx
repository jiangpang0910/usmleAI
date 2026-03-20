"use client";

/**
 * QuestionView — Main quiz question display component.
 *
 * Manages the full question-answering flow:
 * 1. Displays the clinical vignette (question stem) with optional inline images
 * 2. Renders answer options A-E as clickable cards
 * 3. Handles answer submission with green/red correctness highlighting
 * 4. Shows AI-powered teaching feedback after submission
 * 5. Provides navigation between questions with state persistence
 * 6. Includes a flag/bookmark button to mark questions for review
 * 7. Integrates a slide-out question grid for direct navigation
 * 8. Shows ResultsSummary page after completing all questions
 *
 * Tracks per-question state (answered, flagged, submission results) for use
 * by the QuestionGrid and ResultsSummary components.
 */

import { useState, useRef } from "react";
import type { Question, QuestionState } from "@/lib/types";
import { submitAnswer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AnswerOption from "./AnswerOption";
import TeachingPanel from "./TeachingPanel";
import QuestionGrid from "./QuestionGrid";
import ResultsSummary from "./ResultsSummary";
import SequentialCaseView from "./SequentialCaseView";
import DragDropView from "./DragDropView";
import AbstractView from "./AbstractView";
import FreeResponseView from "./FreeResponseView";

/**
 * Extract the case ID from a sequential question's stem.
 * Looks for the "[Case: XXX, Part N of M]" prefix pattern to group
 * sequential questions that belong to the same clinical case.
 *
 * @param stem - The question stem text
 * @returns The case ID string, or null if no case prefix found
 */
function extractCaseId(stem: string): string | null {
  const match = stem.match(/\[Case:\s*([^,]+),/);
  return match ? match[1].trim() : null;
}

/**
 * Group sequential questions by their shared case ID.
 * Returns the indices and questions for the case that the given index belongs to.
 *
 * @param questions - All questions in the quiz
 * @param startIndex - Index of a sequential question to find the case group for
 * @returns Object with caseQuestions array and the indices they occupy
 */
function getSequentialCaseGroup(
  questions: Question[],
  startIndex: number
): { caseQuestions: Question[]; indices: number[] } {
  const caseId = extractCaseId(questions[startIndex].stem);
  if (!caseId) return { caseQuestions: [questions[startIndex]], indices: [startIndex] };

  // Collect all questions in this case by matching case ID
  const caseQuestions: Question[] = [];
  const indices: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    if (
      questions[i].question_type === "sequential" &&
      extractCaseId(questions[i].stem) === caseId
    ) {
      caseQuestions.push(questions[i]);
      indices.push(i);
    }
  }
  return { caseQuestions, indices };
}

/**
 * Props for the QuestionView component.
 */
interface QuestionViewProps {
  /** Array of questions for this quiz session */
  questions: Question[];
}

export default function QuestionView({ questions }: QuestionViewProps) {
  /** Index of the currently displayed question (0-based) */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** Label of the currently selected option before submission (e.g., "A") */
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  /** Whether an answer submission is in progress */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Per-question state map — tracks answers, flags, and submission results */
  const [questionStates, setQuestionStates] = useState<
    Map<number, QuestionState>
  >(new Map());
  /** Whether the question grid drawer is open */
  const [isGridOpen, setIsGridOpen] = useState(false);
  /** Whether the quiz is complete and results should be shown */
  const [isComplete, setIsComplete] = useState(false);
  /** Timestamp of when the quiz session started — used for time tracking in results */
  const sessionStartTime = useRef(Date.now());

  /** The question currently being displayed */
  const currentQuestion = questions[currentIndex];

  // Guard: if questions haven't loaded yet, index is out of bounds, or data is incomplete
  if (!currentQuestion || !currentQuestion.stem || !currentQuestion.answer_options) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Loading question...</div>;
  }

  /** Get the state for the current question (if it has been answered) */
  const currentState = questionStates.get(currentIndex);

  /** Whether the current question has been submitted */
  const isSubmitted = !!currentState?.submitResult;

  /** Whether we're on the last question */
  const isLastQuestion = currentIndex === questions.length - 1;

  /** Whether the current question is flagged/bookmarked */
  const isFlagged = currentState?.isFlagged ?? false;

  /**
   * Handle answer option selection.
   * Only allows selection if the question hasn't been submitted yet.
   */
  function handleOptionSelect(label: string) {
    if (isSubmitted) return;
    setSelectedOption(label);
  }

  /**
   * Handle answer submission.
   * Calls the backend API and stores the result in questionStates.
   */
  async function handleSubmit() {
    if (!selectedOption || isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await submitAnswer({
        question_id: currentQuestion.id,
        selected_option_label: selectedOption,
      });

      // Store the submission result in the question states map
      setQuestionStates((prev) => {
        const next = new Map(prev);
        next.set(currentIndex, {
          status: "answered",
          isFlagged: prev.get(currentIndex)?.isFlagged ?? false,
          submitResult: result,
        });
        return next;
      });
    } catch (err) {
      // Show error as alert — could be improved with inline error display
      alert(
        err instanceof Error ? err.message : "Failed to submit answer"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Navigate to the next question.
   * Resets the selected option and loads any existing state for the next question.
   */
  function handleNext() {
    if (isLastQuestion) return;
    setCurrentIndex((prev) => prev + 1);
    // If next question was already answered, don't reset selected option
    const nextState = questionStates.get(currentIndex + 1);
    setSelectedOption(
      nextState?.submitResult?.selected_option_label ?? null
    );
  }

  /**
   * Navigate to the previous question.
   * Loads existing state if the question was previously answered.
   */
  function handlePrevious() {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
    // Restore the selected option from previous state
    const prevState = questionStates.get(currentIndex - 1);
    setSelectedOption(
      prevState?.submitResult?.selected_option_label ?? null
    );
  }

  /**
   * Toggle the flag/bookmark status for the current question.
   * Flagged questions appear with a yellow indicator in the question grid
   * and are listed separately in the results summary.
   */
  function handleToggleFlag() {
    setQuestionStates((prev) => {
      const next = new Map(prev);
      const existing = prev.get(currentIndex);
      next.set(currentIndex, {
        status: existing?.status ?? "unanswered",
        isFlagged: !(existing?.isFlagged ?? false),
        submitResult: existing?.submitResult ?? null,
      });
      return next;
    });
  }

  /**
   * Jump to a specific question by index.
   * Called from the QuestionGrid when a user clicks a question square.
   * If navigating away from results, clears the complete state.
   *
   * @param index - The 0-based question index to navigate to
   */
  function handleJumpTo(index: number) {
    if (index < 0 || index >= questions.length) return;
    // If we're viewing results and user jumps to review, exit results view
    setIsComplete(false);
    setCurrentIndex(index);
    // Restore the selected option if the question was already answered
    const targetState = questionStates.get(index);
    setSelectedOption(
      targetState?.submitResult?.selected_option_label ?? null
    );
  }

  /**
   * Mark the quiz as complete and show the results summary.
   * Called when the user clicks "Finish Quiz" after answering the last question.
   */
  function handleFinishQuiz() {
    setIsComplete(true);
  }

  /**
   * Navigate back to the dashboard.
   * Uses window.location for a full page navigation to clear quiz state.
   */
  function handleBackToDashboard() {
    window.location.href = "/";
  }

  /**
   * Render inline images from the question stem.
   * Supports markdown image syntax ![alt](url) and renders images
   * for X-rays, ECGs, pathology slides, etc.
   */
  function renderStemContent(stem: string | undefined) {
    if (!stem) return null;
    // Match markdown image patterns: ![alt text](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const parts: (string | { alt: string; url: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = imageRegex.exec(stem)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push(stem.slice(lastIndex, match.index));
      }
      // Add the image reference
      parts.push({ alt: match[1], url: match[2] });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text after the last image
    if (lastIndex < stem.length) {
      parts.push(stem.slice(lastIndex));
    }

    return (
      <div className="space-y-4">
        {parts.map((part, idx) => {
          if (typeof part === "string") {
            return (
              <p key={idx} className="whitespace-pre-wrap">
                {part}
              </p>
            );
          }
          // Render inline image with click-to-zoom (opens in new tab)
          return (
            <a
              key={idx}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={part.url}
                alt={part.alt}
                className="max-w-full rounded-lg border border-gray-200 cursor-zoom-in hover:shadow-md transition-shadow"
              />
            </a>
          );
        })}
      </div>
    );
  }

  // ===== Results Summary View =====
  // Shown after the user clicks "Finish Quiz" on the last question
  if (isComplete) {
    return (
      <>
        <ResultsSummary
          questions={questions}
          questionStates={questionStates}
          sessionStartTime={sessionStartTime.current}
          onBackToDashboard={handleBackToDashboard}
          onReviewQuestion={handleJumpTo}
        />
        {/* Keep the grid available even during results review */}
        <QuestionGrid
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          questionStates={questionStates}
          onJumpTo={handleJumpTo}
          isOpen={isGridOpen}
          onToggle={() => setIsGridOpen((prev) => !prev)}
        />
      </>
    );
  }

  // ===== Sequential Case Routing =====
  // If the current question is a sequential type, group all case parts
  // and render them using SequentialCaseView instead of the standard view.
  if (currentQuestion.question_type === "sequential") {
    const { caseQuestions, indices } = getSequentialCaseGroup(
      questions,
      currentIndex
    );

    /**
     * Handle sequential case completion.
     * Advances past all questions in the completed case to the next
     * non-sequential question (or the next case set).
     */
    const handleSequentialCaseComplete = () => {
      // Find the index after the last question in this case
      const lastCaseIndex = indices[indices.length - 1];
      if (lastCaseIndex < questions.length - 1) {
        // Move to the question after this case
        setCurrentIndex(lastCaseIndex + 1);
        setSelectedOption(null);
      } else {
        // This was the last case in the quiz -- show results
        setIsComplete(true);
      }
    };

    return (
      <div className="space-y-6">
        <SequentialCaseView
          questions={caseQuestions}
          onCaseComplete={handleSequentialCaseComplete}
        />
        {/* Keep the question grid available for navigation */}
        <QuestionGrid
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          questionStates={questionStates}
          onJumpTo={handleJumpTo}
          isOpen={isGridOpen}
          onToggle={() => setIsGridOpen((prev) => !prev)}
        />
      </div>
    );
  }

  // ===== Drag-and-Drop Question Routing =====
  // Delegates to DragDropView for drag-and-drop format questions
  if (currentQuestion.question_type === "drag_and_drop") {
    return (
      <div className="space-y-6">
        <DragDropView
          question={currentQuestion}
          onComplete={() => {
            if (isLastQuestion) {
              setIsComplete(true);
            } else {
              handleNext();
            }
          }}
        />
        <QuestionGrid
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          questionStates={questionStates}
          onJumpTo={handleJumpTo}
          isOpen={isGridOpen}
          onToggle={() => setIsGridOpen((prev) => !prev)}
        />
      </div>
    );
  }

  // ===== Abstract/Research Format Question Routing =====
  // Delegates to AbstractView for research abstract format questions
  if (currentQuestion.question_type === "abstract") {
    return (
      <div className="space-y-6">
        <AbstractView
          question={currentQuestion}
          onComplete={() => {
            if (isLastQuestion) {
              setIsComplete(true);
            } else {
              handleNext();
            }
          }}
        />
        <QuestionGrid
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          questionStates={questionStates}
          onJumpTo={handleJumpTo}
          isOpen={isGridOpen}
          onToggle={() => setIsGridOpen((prev) => !prev)}
        />
      </div>
    );
  }

  // ===== Free-Response Question Routing =====
  // Delegates to FreeResponseView for open-ended clinical reasoning questions
  if (currentQuestion.question_type === "free_response") {
    return (
      <div className="space-y-6">
        <FreeResponseView
          question={currentQuestion}
          onComplete={() => {
            if (isLastQuestion) {
              setIsComplete(true);
            } else {
              handleNext();
            }
          }}
        />
        <QuestionGrid
          totalQuestions={questions.length}
          currentIndex={currentIndex}
          questionStates={questionStates}
          onJumpTo={handleJumpTo}
          isOpen={isGridOpen}
          onToggle={() => setIsGridOpen((prev) => !prev)}
        />
      </div>
    );
  }

  // ===== Default: Single Best Answer (SBA) Rendering =====
  return (
    <div className="space-y-6">
      {/* ===== Progress Bar with Flag and Grid Toggle ===== */}
      {/* Shows current question number, flag button, and grid toggle */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Question counter */}
          <span className="font-medium">
            Question {currentIndex + 1} of {questions.length}
          </span>

          {/* Flag/bookmark toggle button */}
          <Button
            variant={isFlagged ? "default" : "ghost"}
            size="sm"
            onClick={handleToggleFlag}
            className={
              isFlagged
                ? "bg-yellow-500 hover:bg-yellow-600 text-white h-7 px-2"
                : "text-gray-400 hover:text-yellow-500 h-7 px-2"
            }
            aria-label={isFlagged ? "Remove flag" : "Flag for review"}
          >
            {/* Flag icon — filled when flagged, outline when not */}
            {isFlagged ? "\u2691" : "\u2690"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress indicator as a visual bar */}
          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          {/* Grid toggle button — opens the question navigator drawer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGridOpen((prev) => !prev)}
            className="h-7 px-2 text-gray-500 hover:text-blue-600"
            aria-label="Open question navigator"
          >
            {/* Grid icon (3x3 squares using Unicode) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </Button>
        </div>
      </div>

      {/* ===== Question Stem (Clinical Vignette) ===== */}
      {/* Displays the clinical scenario with support for inline images */}
      <div className="prose prose-lg max-w-none">
        {renderStemContent(currentQuestion.stem)}
      </div>

      {/* ===== Answer Options ===== */}
      {/* Renders each option as a clickable card with selection/correctness states */}
      <div className="space-y-3">
        {currentQuestion.answer_options.map((option) => {
          // Find per-option feedback if answer has been submitted
          const optionFeedback = currentState?.submitResult?.options_feedback?.find(
            (f) => f.label === option.label
          );

          return (
            <AnswerOption
              key={option.id}
              label={option.label}
              text={option.text}
              isSelected={selectedOption === option.label}
              isSubmitted={isSubmitted}
              isCorrect={
                isSubmitted
                  ? currentState?.submitResult?.correct_option_label ===
                    option.label
                  : false
              }
              isUserChoice={
                isSubmitted
                  ? currentState?.submitResult?.selected_option_label ===
                    option.label
                  : false
              }
              onClick={() => handleOptionSelect(option.label)}
              explanation={
                isSubmitted ? optionFeedback?.explanation ?? null : null
              }
            />
          );
        })}
      </div>

      {/* ===== Action Buttons ===== */}
      {/* Submit button (before answer) and navigation buttons (after answer) */}
      <div className="flex items-center justify-between">
        {/* Previous button — disabled on first question */}
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {/* Submit button — shown before answer is submitted */}
          {!isSubmitted && (
            <Button
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          )}

          {/* Next button — shown after answer is submitted (not on last question) */}
          {isSubmitted && !isLastQuestion && (
            <Button onClick={handleNext}>Next Question</Button>
          )}

          {/* Finish Quiz button — shown on last question after submission */}
          {isSubmitted && isLastQuestion && (
            <Button onClick={handleFinishQuiz}>
              Finish Quiz
            </Button>
          )}
        </div>
      </div>

      {/* ===== Teaching Panel ===== */}
      {/* AI-generated explanation/Socratic feedback shown after submission */}
      <TeachingPanel
        questionId={currentQuestion.id}
        userAnswerLabel={
          currentState?.submitResult?.selected_option_label ?? selectedOption ?? ""
        }
        isVisible={isSubmitted}
      />

      {/* ===== Question Grid Drawer ===== */}
      {/* Slide-out panel for navigating between questions */}
      <QuestionGrid
        totalQuestions={questions.length}
        currentIndex={currentIndex}
        questionStates={questionStates}
        onJumpTo={handleJumpTo}
        isOpen={isGridOpen}
        onToggle={() => setIsGridOpen((prev) => !prev)}
      />
    </div>
  );
}

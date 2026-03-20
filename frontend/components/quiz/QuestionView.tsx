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
 *
 * Tracks per-question state (answered, flagged, submission results) for use
 * by downstream components like the results summary page (plan 02-05).
 */

import { useState } from "react";
import type { Question, QuestionState } from "@/lib/types";
import { submitAnswer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import AnswerOption from "./AnswerOption";
import TeachingPanel from "./TeachingPanel";

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

  /** The question currently being displayed */
  const currentQuestion = questions[currentIndex];

  /** Get the state for the current question (if it has been answered) */
  const currentState = questionStates.get(currentIndex);

  /** Whether the current question has been submitted */
  const isSubmitted = !!currentState?.submitResult;

  /** Whether we're on the last question */
  const isLastQuestion = currentIndex === questions.length - 1;

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
   * Render inline images from the question stem.
   * Supports markdown image syntax ![alt](url) and renders images
   * for X-rays, ECGs, pathology slides, etc.
   */
  function renderStemContent(stem: string) {
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

  // Quiz complete state — shown after the last question is answered
  if (currentIndex >= questions.length) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
        <p className="text-muted-foreground">
          You have answered all questions in this topic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Progress Bar ===== */}
      {/* Shows current question number out of total */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium">
          Question {currentIndex + 1} of {questions.length}
        </span>
        {/* Progress indicator as a visual bar */}
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
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

          {/* Next button — shown after answer is submitted */}
          {isSubmitted && !isLastQuestion && (
            <Button onClick={handleNext}>Next Question</Button>
          )}

          {/* Quiz complete indicator on last question */}
          {isSubmitted && isLastQuestion && (
            <Button variant="outline" disabled>
              Quiz Complete
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
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { submitAnswer } from "@/lib/api";
import type {
  Question,
  QuestionState,
  AnswerSubmitResponse,
} from "@/lib/types";
import AnswerOption from "./AnswerOption";
import TeachingPanel from "./TeachingPanel";

/**
 * Props for the QuestionView component.
 * Receives the full array of questions for the current quiz session.
 */
interface QuestionViewProps {
  /** Array of questions fetched for this topic */
  questions: Question[];
}

/**
 * QuestionView — the main quiz interface for answering USMLE-style SBA questions.
 *
 * Layout (top to bottom):
 * 1. Progress bar showing current question number
 * 2. Question stem (clinical vignette) with optional inline images
 * 3. Answer options (A-E) with selection highlighting
 * 4. Submit button (disabled until an option is selected)
 * 5. Teaching panel (appears after submission with explanation/Socratic toggle)
 * 6. Navigation buttons (Previous / Next Question)
 *
 * Tracks per-question state (answered, flagged, submit result) so users
 * can navigate back to previously answered questions and see their results.
 */
export default function QuestionView({ questions }: QuestionViewProps) {
  /** Index of the currently displayed question (0-based) */
  const [currentIndex, setCurrentIndex] = useState(0);

  /** Label of the currently selected option (null if none selected) */
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  /** Whether an answer submission is in progress */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Map of question index to its state (answered status, flag status, submit result).
   * Uses a Map for efficient per-question state lookup.
   */
  const [questionStates, setQuestionStates] = useState<
    Map<number, QuestionState>
  >(new Map());

  /** The currently displayed question */
  const currentQuestion = questions[currentIndex];

  /** State for the current question (if previously answered) */
  const currentState = questionStates.get(currentIndex);

  /** Whether the current question has been submitted */
  const isAnswered = currentState?.status === "answered";

  /** The submit result for the current question (if answered) */
  const submitResult = currentState?.submitResult ?? null;

  /**
   * Handle answer submission.
   * Sends the selected option to the backend and stores the result
   * in the questionStates map.
   */
  const handleSubmit = useCallback(async () => {
    if (!selectedOption || isAnswered) return;

    setIsSubmitting(true);
    try {
      const result: AnswerSubmitResponse = await submitAnswer({
        question_id: currentQuestion.id,
        selected_option_label: selectedOption,
      });

      // Store the result in the question states map
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
      // Show error inline -- user can retry
      console.error("Failed to submit answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedOption, isAnswered, currentQuestion, currentIndex]);

  /**
   * Navigate to the next question.
   * Resets the selected option for fresh state.
   */
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
    }
  };

  /**
   * Navigate to the previous question.
   * Resets the selected option (previous answer shown via questionStates).
   */
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedOption(null);
    }
  };

  /**
   * Render the question stem with inline image support.
   * Detects markdown image syntax ![alt](url) and <img> tags
   * in the stem text and renders them as clickable images.
   *
   * @param stem - The raw question stem text
   * @returns JSX with text and inline images
   */
  const renderStem = (stem: string) => {
    // Check for markdown image pattern: ![alt](url)
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    // Check for HTML img tag pattern: <img src="url">
    const htmlImageRegex = /<img\s+src="([^"]+)"[^>]*>/g;

    const hasMarkdownImages = markdownImageRegex.test(stem);
    const hasHtmlImages = htmlImageRegex.test(stem);

    // If no images, render as plain text
    if (!hasMarkdownImages && !hasHtmlImages) {
      return <p className="text-base leading-relaxed whitespace-pre-wrap">{stem}</p>;
    }

    // Split stem into text and image segments for markdown images
    const parts: Array<{ type: "text" | "image"; content: string; alt?: string }> = [];
    let lastIndex = 0;
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = regex.exec(stem)) !== null) {
      // Add text before the image
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: stem.slice(lastIndex, match.index) });
      }
      // Add the image
      parts.push({ type: "image", content: match[2], alt: match[1] });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last image
    if (lastIndex < stem.length) {
      parts.push({ type: "text", content: stem.slice(lastIndex) });
    }

    return (
      <div className="space-y-4">
        {parts.map((part, idx) =>
          part.type === "text" ? (
            <p key={idx} className="text-base leading-relaxed whitespace-pre-wrap">
              {part.content}
            </p>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={idx}
              src={part.content}
              alt={part.alt || "Clinical image"}
              className="max-w-full rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => window.open(part.content, "_blank")}
            />
          )
        )}
      </div>
    );
  };

  // Show quiz complete message when all questions are answered and user is past the last one
  const allAnswered =
    questions.length > 0 &&
    currentIndex === questions.length - 1 &&
    isAnswered;

  return (
    <div className="space-y-6">
      {/* ===== Progress Bar ===== */}
      {/* Shows current question number out of total */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium">
          Question {currentIndex + 1} of {questions.length}
        </span>
        {/* Visual progress indicator */}
        <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* ===== Question Stem (Clinical Vignette) ===== */}
      {/* Large readable text for the clinical scenario with optional inline images */}
      <div className="prose prose-lg max-w-none">
        {renderStem(currentQuestion.stem)}
      </div>

      {/* ===== Answer Options ===== */}
      {/* Vertical list of A-E options with selection/correctness states */}
      <div className="space-y-3">
        {currentQuestion.answer_options.map((option) => {
          // Find per-option feedback from submit result (if answered)
          const feedback = submitResult?.options_feedback?.find(
            (f) => f.label === option.label
          );

          return (
            <AnswerOption
              key={option.id}
              label={option.label}
              text={option.text}
              isSelected={selectedOption === option.label}
              isSubmitted={isAnswered}
              isCorrect={
                isAnswered
                  ? submitResult?.correct_option_label === option.label
                  : false
              }
              isUserChoice={
                isAnswered
                  ? submitResult?.selected_option_label === option.label
                  : false
              }
              onClick={() => setSelectedOption(option.label)}
              explanation={isAnswered ? feedback?.explanation ?? null : null}
            />
          );
        })}
      </div>

      {/* ===== Submit Button ===== */}
      {/* Disabled until an option is selected; hidden after submission */}
      {!isAnswered && (
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!selectedOption || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Answer"}
        </Button>
      )}

      {/* ===== Result Summary ===== */}
      {/* Brief correct/incorrect feedback shown immediately after submission */}
      {isAnswered && submitResult && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            submitResult.is_correct
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {submitResult.is_correct
            ? "Correct! Well done."
            : `Incorrect. The correct answer is ${submitResult.correct_option_label}: ${submitResult.correct_option_text}`}
        </div>
      )}

      {/* ===== Teaching Panel ===== */}
      {/* Shows Claude-generated explanation or Socratic dialogue after submission */}
      {isAnswered && (
        <TeachingPanel
          questionId={currentQuestion.id}
          userAnswerLabel={submitResult?.selected_option_label ?? ""}
          isVisible={isAnswered}
        />
      )}

      {/* ===== Navigation Buttons ===== */}
      <div className="flex justify-between pt-4">
        {/* Previous question button */}
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        {/* Next question button (only after answering, or quiz complete message) */}
        {isAnswered && currentIndex < questions.length - 1 && (
          <Button onClick={handleNext}>Next Question</Button>
        )}

        {/* Quiz complete indicator on last question */}
        {allAnswered && (
          <div className="flex items-center text-sm font-medium text-green-700">
            Quiz Complete!
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * AnswerOption — Renders a single answer option (A, B, C, D, or E) as a clickable card.
 *
 * Visual states:
 * - Default: gray border, hoverable
 * - Selected (before submit): blue border + blue background tint
 * - Correct answer (after submit): green border + green background
 * - User's wrong answer (after submit): red border + red background
 * - Other options (after submit): faded out with reduced opacity
 *
 * After submission, the option becomes non-interactive and shows
 * per-option explanation text if available.
 */

import { cn } from "@/lib/utils";

/**
 * Props for the AnswerOption component.
 * Controls visual state based on selection and submission status.
 */
interface AnswerOptionProps {
  /** Option label: "A", "B", "C", "D", or "E" */
  label: string;
  /** The text content of this answer option */
  text: string;
  /** Whether this option is currently selected by the user (before submit) */
  isSelected: boolean;
  /** Whether the answer has been submitted */
  isSubmitted: boolean;
  /** Whether this option is the correct answer (only meaningful after submit) */
  isCorrect: boolean;
  /** Whether the user selected this option (only meaningful after submit) */
  isUserChoice: boolean;
  /** Click handler for selecting this option */
  onClick: () => void;
  /** Per-option explanation text shown after submission */
  explanation: string | null;
}

export default function AnswerOption({
  label,
  text,
  isSelected,
  isSubmitted,
  isCorrect,
  isUserChoice,
  onClick,
  explanation,
}: AnswerOptionProps) {
  /**
   * Determine the visual style classes based on the current state.
   * Priority: submitted states > selected state > default state.
   */
  function getOptionClasses(): string {
    // After submission — show correctness feedback
    if (isSubmitted) {
      if (isCorrect) {
        // Correct answer always shows green (whether user picked it or not)
        return "border-2 border-green-600 bg-green-50";
      }
      if (isUserChoice && !isCorrect) {
        // User's wrong selection shows red
        return "border-2 border-red-600 bg-red-50";
      }
      // All other options fade out after submission
      return "border border-gray-200 opacity-60";
    }

    // Before submission — show selection state
    if (isSelected) {
      return "border-2 border-blue-600 bg-blue-50";
    }

    // Default unselected state with hover effect
    return "border border-gray-200 hover:border-blue-400 cursor-pointer";
  }

  return (
    <button
      type="button"
      onClick={isSubmitted ? undefined : onClick}
      disabled={isSubmitted}
      className={cn(
        "w-full text-left p-4 rounded-lg transition-colors",
        getOptionClasses(),
        isSubmitted && "cursor-default"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Option label badge (A, B, C, etc.) */}
        <span
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
            isSubmitted && isCorrect
              ? "bg-green-600 text-white"
              : isSubmitted && isUserChoice && !isCorrect
                ? "bg-red-600 text-white"
                : isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
          )}
        >
          {label}
        </span>

        {/* Option text and optional explanation */}
        <div className="flex-1">
          <p className="text-sm leading-relaxed">{text}</p>

          {/* Per-option explanation — shown only after submission if available */}
          {isSubmitted && explanation && (
            <p className="mt-2 text-xs text-gray-500 italic">{explanation}</p>
          )}

          {/* Correctness indicator text after submission */}
          {isSubmitted && isCorrect && (
            <p className="mt-1 text-xs font-semibold text-green-700">
              Correct Answer
            </p>
          )}
          {isSubmitted && isUserChoice && !isCorrect && (
            <p className="mt-1 text-xs font-semibold text-red-700">
              Your Answer (Incorrect)
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

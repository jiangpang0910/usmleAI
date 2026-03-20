"use client";

import { cn } from "@/lib/utils";

/**
 * Props for the AnswerOption component.
 * Controls the visual state based on selection, submission, and correctness.
 */
interface AnswerOptionProps {
  /** Option label: "A", "B", "C", "D", or "E" */
  label: string;
  /** The answer text content */
  text: string;
  /** Whether this option is currently selected by the user (before submit) */
  isSelected: boolean;
  /** Whether the answer has been submitted (locks interactions) */
  isSubmitted: boolean;
  /** Whether this option is the correct answer (only relevant after submit) */
  isCorrect: boolean;
  /** Whether the user picked this option (only relevant after submit) */
  isUserChoice: boolean;
  /** Click handler for selecting this option */
  onClick: () => void;
  /** Per-option explanation text (shown after submit) */
  explanation: string | null;
}

/**
 * AnswerOption — renders a single answer choice (A-E) for an SBA question.
 *
 * Visual states:
 * - Default: gray border, hoverable
 * - Selected (pre-submit): blue border and background
 * - Correct (post-submit): green border and background with checkmark
 * - Wrong choice (post-submit): red border and background with X mark
 * - Other options (post-submit): dimmed with reduced opacity
 *
 * After submission, the option is disabled and shows per-option explanation
 * text if available.
 */
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
   * Determine the visual style based on current state.
   * Priority: submitted states > selected state > default state.
   */
  const getOptionStyles = (): string => {
    if (isSubmitted) {
      // After submission: show correct answer in green
      if (isCorrect) {
        return "border-2 border-green-600 bg-green-50";
      }
      // After submission: show user's wrong choice in red
      if (isUserChoice && !isCorrect) {
        return "border-2 border-red-600 bg-red-50";
      }
      // After submission: dim all other options
      return "border border-gray-200 opacity-60";
    }
    // Before submission: highlight selected option in blue
    if (isSelected) {
      return "border-2 border-blue-600 bg-blue-50";
    }
    // Default: subtle border with hover effect
    return "border border-gray-200 hover:border-blue-400 cursor-pointer";
  };

  /**
   * Render a status indicator icon after submission.
   * Green checkmark for correct, red X for wrong user choice.
   */
  const getStatusIndicator = (): string | null => {
    if (!isSubmitted) return null;
    if (isCorrect) return "✓";
    if (isUserChoice && !isCorrect) return "✗";
    return null;
  };

  /** Status indicator text (checkmark or X) */
  const statusIndicator = getStatusIndicator();

  return (
    <button
      type="button"
      onClick={isSubmitted ? undefined : onClick}
      disabled={isSubmitted}
      className={cn(
        "w-full text-left rounded-lg p-4 transition-all",
        "flex flex-col gap-2",
        getOptionStyles(),
        isSubmitted && "cursor-default"
      )}
    >
      {/* Option label and text with optional status indicator */}
      <div className="flex items-start gap-3">
        {/* Option label badge (A, B, C, etc.) */}
        <span className="font-semibold text-sm min-w-[1.5rem] mt-0.5">
          {label}.
        </span>

        {/* Option text content */}
        <span className="flex-1 text-sm">{text}</span>

        {/* Status indicator after submission (checkmark or X) */}
        {statusIndicator && (
          <span
            className={cn(
              "font-bold text-lg",
              isCorrect ? "text-green-600" : "text-red-600"
            )}
          >
            {statusIndicator}
          </span>
        )}
      </div>

      {/* Per-option explanation shown after submission */}
      {isSubmitted && explanation && (
        <p className="text-xs text-gray-500 ml-7 mt-1">{explanation}</p>
      )}
    </button>
  );
}

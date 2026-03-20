"use client";

/**
 * QuestionGrid — Slide-out drawer showing a clickable grid of all quiz questions.
 *
 * Displays numbered squares color-coded by status:
 * - Gray: unanswered
 * - Green: answered correctly
 * - Red: answered incorrectly
 * - Yellow: flagged (with flag icon)
 * - Blue ring: current question
 *
 * Allows direct navigation to any question via click, and provides
 * summary stats (answered count, flagged count) plus a "Review Flagged" shortcut.
 */

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { QuestionState } from "@/lib/types";

/**
 * Props for the QuestionGrid component.
 * Controls which questions to show, their states, and navigation callbacks.
 */
interface QuestionGridProps {
  /** Total number of questions in the session */
  totalQuestions: number;
  /** Currently active question index (0-based) */
  currentIndex: number;
  /** Per-question state map from QuestionView (answered, flagged, results) */
  questionStates: Map<number, QuestionState>;
  /** Callback to navigate directly to a specific question by index */
  onJumpTo: (index: number) => void;
  /** Whether the grid drawer is currently open/visible */
  isOpen: boolean;
  /** Toggle the drawer open or closed */
  onToggle: () => void;
}

/**
 * Determine the Tailwind CSS classes for a question square based on its state.
 * Prioritizes answer correctness for background color, with flag icon overlay handled separately.
 *
 * @param index - The 0-based question index
 * @param state - The question's current state (may be undefined if unanswered)
 * @param isCurrent - Whether this is the currently active question
 * @returns A string of Tailwind classes for the square
 */
function getSquareClasses(
  index: number,
  state: QuestionState | undefined,
  isCurrent: boolean
): string {
  // Base classes shared by all squares
  const base =
    "w-10 h-10 flex items-center justify-center rounded text-sm font-medium cursor-pointer transition-colors relative";

  // Current question gets a thick blue ring indicator
  const ring = isCurrent ? "ring-2 ring-blue-600" : "";

  // Color coding by status
  if (!state || state.status === "unanswered") {
    // Flagged but unanswered: yellow background
    if (state?.isFlagged) {
      return cn(base, ring, "bg-yellow-100 border border-yellow-400 text-yellow-800");
    }
    // Plain unanswered: gray background
    return cn(base, ring, "bg-gray-100 border border-gray-300 text-gray-700");
  }

  // Answered — check correctness from the submit result
  if (state.status === "answered" && state.submitResult) {
    const colorClasses = state.submitResult.is_correct
      ? "bg-green-100 border border-green-400 text-green-800"
      : "bg-red-100 border border-red-400 text-red-800";
    return cn(base, ring, colorClasses);
  }

  // Fallback to gray
  return cn(base, ring, "bg-gray-100 border border-gray-300 text-gray-700");
}

/**
 * Compute summary statistics from the question states map.
 *
 * @param totalQuestions - Total number of questions in the session
 * @param questionStates - Map of question index to state
 * @returns Object with answeredCount and flaggedCount
 */
function computeStats(
  totalQuestions: number,
  questionStates: Map<number, QuestionState>
) {
  let answeredCount = 0;
  let flaggedCount = 0;

  for (let i = 0; i < totalQuestions; i++) {
    const state = questionStates.get(i);
    if (state?.status === "answered") answeredCount++;
    if (state?.isFlagged) flaggedCount++;
  }

  return { answeredCount, flaggedCount };
}

/**
 * Find the index of the first flagged question in the session.
 *
 * @param totalQuestions - Total number of questions
 * @param questionStates - Map of question index to state
 * @returns The 0-based index of the first flagged question, or -1 if none
 */
function findFirstFlagged(
  totalQuestions: number,
  questionStates: Map<number, QuestionState>
): number {
  for (let i = 0; i < totalQuestions; i++) {
    if (questionStates.get(i)?.isFlagged) return i;
  }
  return -1;
}

export default function QuestionGrid({
  totalQuestions,
  currentIndex,
  questionStates,
  onJumpTo,
  isOpen,
  onToggle,
}: QuestionGridProps) {
  const { answeredCount, flaggedCount } = computeStats(totalQuestions, questionStates);
  const firstFlagged = findFirstFlagged(totalQuestions, questionStates);

  return (
    <>
      {/* Semi-transparent backdrop overlay — click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel — slides in from the right */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-72 bg-white shadow-lg z-50 transform transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header with title and close button */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Question Navigator</h3>
          {/* Close button (X) */}
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            aria-label="Close question navigator"
          >
            &times;
          </button>
        </div>

        {/* Grid of numbered question squares */}
        <div className="grid grid-cols-5 gap-2 p-4 overflow-y-auto flex-1">
          {Array.from({ length: totalQuestions }, (_, i) => {
            const state = questionStates.get(i);
            const isCurrent = i === currentIndex;

            return (
              <button
                key={i}
                className={getSquareClasses(i, state, isCurrent)}
                onClick={() => onJumpTo(i)}
                aria-label={`Go to question ${i + 1}`}
              >
                {/* Question number (1-indexed) */}
                {i + 1}
                {/* Flag icon overlay for flagged questions */}
                {state?.isFlagged && (
                  <span className="absolute -top-1 -right-1 text-xs">
                    &#9873;
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Summary stats line */}
        <div className="px-4 py-2 text-sm text-gray-600 border-t">
          Answered: {answeredCount}/{totalQuestions} | Flagged: {flaggedCount}
        </div>

        {/* Review Flagged button — jumps to the first flagged question */}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            disabled={firstFlagged === -1}
            onClick={() => {
              if (firstFlagged !== -1) {
                onJumpTo(firstFlagged);
                onToggle();
              }
            }}
          >
            Review Flagged
          </Button>
        </div>
      </div>
    </>
  );
}

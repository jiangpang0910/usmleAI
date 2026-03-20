"use client";

/**
 * BlockReview -- Post-exam review screen showing all blocks with per-question results.
 *
 * Features:
 * - Overall score summary across all blocks
 * - Tab bar for switching between blocks (each tab shows correct/total)
 * - Per-question list with correct/incorrect/unanswered indicators
 * - Expandable question details: full stem, answer options with green/red highlights,
 *   and explanation text
 * - Summary stats table with per-block breakdown
 * - Back to Dashboard button
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExamBlock, ExamBlockResult } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Minus } from "lucide-react";

/**
 * Props for the BlockReview component.
 */
interface BlockReviewProps {
  /** The original exam blocks containing questions with full data */
  blocks: ExamBlock[];
  /** Graded results for each submitted block */
  blockResults: ExamBlockResult[];
  /** UUID of the exam session */
  sessionId: string;
}

/**
 * BlockReview component -- displays post-exam review with expandable explanations.
 * Allows students to review every question after completing all blocks.
 */
export default function BlockReview({
  blocks,
  blockResults,
  sessionId,
}: BlockReviewProps) {
  /** Router for navigating back to dashboard */
  const router = useRouter();

  /** Index of the currently selected block tab (0-indexed) */
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number>(0);

  /** Index of the expanded question within the selected block (null = none expanded) */
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<
    number | null
  >(null);

  // ===== Aggregate Calculations =====

  /** Total correct answers across all blocks */
  const totalCorrect = blockResults.reduce((sum, r) => sum + r.correct, 0);

  /** Total questions across all blocks */
  const totalQuestions = blockResults.reduce((sum, r) => sum + r.total, 0);

  /** Overall accuracy percentage */
  const overallPercent =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  /** The selected block's question data */
  const selectedBlock = blocks[selectedBlockIndex];

  /** The selected block's results */
  const selectedResult = blockResults[selectedBlockIndex];

  /**
   * Toggle expansion of a question's details.
   * If the same question is clicked again, collapse it.
   *
   * @param index - The question index within the current block
   */
  function toggleQuestion(index: number) {
    setExpandedQuestionIndex((prev) => (prev === index ? null : index));
  }

  /**
   * Truncate a string to a maximum length, appending "..." if truncated.
   *
   * @param text - The text to truncate
   * @param maxLen - Maximum character length before truncation
   * @returns The truncated string
   */
  function truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Navy Header Bar ===== */}
      <header className="bg-[hsl(217,71%,20%)] text-white py-6 px-8 shadow-md">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">usmleAI</h1>
          <p className="text-sm text-blue-200">
            AI-powered USMLE preparation
          </p>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* ===== Header with Overall Score ===== */}
        <div>
          <h2 className="text-2xl font-bold">Exam Review</h2>
          <p className="text-lg text-muted-foreground mt-1">
            {totalCorrect} / {totalQuestions} correct ({overallPercent}%)
          </p>
        </div>

        {/* ===== Block Tabs ===== */}
        {/* Tab bar for switching between blocks. Each tab shows block number and score. */}
        <div className="flex gap-2 flex-wrap">
          {blockResults.map((result, idx) => (
            <Button
              key={idx}
              variant={selectedBlockIndex === idx ? "default" : "outline"}
              className={
                selectedBlockIndex === idx
                  ? "bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white"
                  : ""
              }
              onClick={() => {
                setSelectedBlockIndex(idx);
                setExpandedQuestionIndex(null);
              }}
            >
              Block {result.block_number} ({result.correct}/{result.total})
            </Button>
          ))}
        </div>

        {/* ===== Per-Block Question List ===== */}
        {/* Each question shows a truncated stem and correctness indicator.
            Click to expand for full details, answer options, and explanation. */}
        {selectedBlock && selectedResult && (
          <div className="space-y-2">
            {selectedBlock.questions.map((question, qIdx) => {
              /** The result for this specific question */
              const qResult = selectedResult.questions[qIdx];

              /** Whether this question's details are expanded */
              const isExpanded = expandedQuestionIndex === qIdx;

              /** Determine the status icon and color */
              const isCorrect = qResult?.is_correct ?? false;
              const isUnanswered = qResult?.selected_label === null;

              return (
                <Card
                  key={question.id}
                  className={`shadow-sm cursor-pointer transition-colors ${
                    isExpanded ? "border-blue-300" : ""
                  }`}
                >
                  {/* Question row -- clickable to expand/collapse */}
                  <button
                    type="button"
                    className="w-full text-left p-4"
                    onClick={() => toggleQuestion(qIdx)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Question number */}
                      <span className="text-sm font-medium text-muted-foreground w-8">
                        Q{qIdx + 1}
                      </span>

                      {/* Truncated stem text */}
                      <span className="flex-1 text-sm">
                        {truncate(question.stem, 80)}
                      </span>

                      {/* Correctness indicator icon */}
                      {isUnanswered ? (
                        <Minus className="h-5 w-5 text-gray-400" />
                      ) : isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </button>

                  {/* ===== Expanded Details ===== */}
                  {/* Full stem, answer options with highlights, and explanation */}
                  {isExpanded && (
                    <CardContent className="border-t pt-4 space-y-4">
                      {/* Full question stem */}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {question.stem}
                      </p>

                      {/* Answer options with green/red highlighting */}
                      <div className="space-y-2">
                        {question.answer_options.map((option) => {
                          /** Whether this is the correct answer */
                          const optionCorrect = option.is_correct;
                          /** Whether the user selected this option */
                          const userSelected =
                            qResult?.selected_label === option.label;

                          return (
                            <div
                              key={option.label}
                              className={`p-3 rounded-lg text-sm ${
                                optionCorrect
                                  ? "border-2 border-green-600 bg-green-50"
                                  : userSelected && !optionCorrect
                                    ? "border-2 border-red-600 bg-red-50"
                                    : "border border-gray-200 opacity-70"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {/* Option label badge */}
                                <span
                                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    optionCorrect
                                      ? "bg-green-600 text-white"
                                      : userSelected && !optionCorrect
                                        ? "bg-red-600 text-white"
                                        : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {option.label}
                                </span>
                                {/* Option text */}
                                <span className="flex-1">{option.text}</span>
                              </div>
                              {/* Per-option correctness labels */}
                              {optionCorrect && (
                                <p className="mt-1 text-xs font-semibold text-green-700 ml-8">
                                  Correct Answer
                                </p>
                              )}
                              {userSelected && !optionCorrect && (
                                <p className="mt-1 text-xs font-semibold text-red-700 ml-8">
                                  Your Answer (Incorrect)
                                </p>
                              )}
                              {/* Per-option explanation if available */}
                              {option.explanation && (
                                <p className="mt-1 text-xs text-gray-500 italic ml-8">
                                  {option.explanation}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Question-level explanation */}
                      {question.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-700 mb-1">
                            Explanation
                          </p>
                          <p className="text-sm text-blue-900 leading-relaxed">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ===== Summary Stats Table ===== */}
        {/* Per-block breakdown: block number, correct, total, accuracy % */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Block Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Block</th>
                  <th className="text-right py-2 font-medium">Correct</th>
                  <th className="text-right py-2 font-medium">Total</th>
                  <th className="text-right py-2 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {blockResults.map((result) => {
                  /** Per-block accuracy percentage */
                  const accuracy =
                    result.total > 0
                      ? Math.round((result.correct / result.total) * 100)
                      : 0;
                  return (
                    <tr key={result.block_number} className="border-b last:border-b-0">
                      <td className="py-2">Block {result.block_number}</td>
                      <td className="text-right py-2">{result.correct}</td>
                      <td className="text-right py-2">{result.total}</td>
                      <td className="text-right py-2">{accuracy}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2">Total</td>
                  <td className="text-right py-2">{totalCorrect}</td>
                  <td className="text-right py-2">{totalQuestions}</td>
                  <td className="text-right py-2">{overallPercent}%</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* ===== Back to Dashboard Button ===== */}
        <Button
          className="w-full bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white py-5 text-lg"
          onClick={() => router.push("/")}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

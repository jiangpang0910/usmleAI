"use client";

/**
 * AbstractView -- Renders abstract/research format USMLE questions.
 *
 * Displays a research abstract with structured sections (Objective, Methods,
 * Results, Conclusion) in visually distinct cards, followed by standard
 * SBA-style A-E answer options. This format tests the student's ability
 * to interpret clinical research and biostatistics.
 *
 * Each section gets a color-coded card background for visual distinction.
 * If the Results section contains table-like data (pipe characters), it
 * renders as a formatted HTML table.
 */

import { useState } from "react";
import type { Question, AnswerSubmitResponse } from "@/lib/types";
import { submitAnswer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AnswerOption from "./AnswerOption";
import TeachingPanel from "./TeachingPanel";

/**
 * Props for the AbstractView component.
 */
interface AbstractViewProps {
  /** The abstract-format question to render */
  question: Question;
  /** Callback invoked when the student completes this question */
  onComplete: () => void;
}

/**
 * Represents a parsed section of the research abstract.
 * Each section has a title (e.g., "Objective") and its body content.
 */
interface AbstractSection {
  /** Section heading: "Objective", "Methods", "Results", or "Conclusion" */
  title: string;
  /** The text content of this section */
  content: string;
}

/**
 * Map of section titles to their Tailwind background color classes.
 * Provides visual distinction between different parts of the abstract.
 */
const SECTION_COLORS: Record<string, string> = {
  Objective: "bg-blue-50",
  Methods: "bg-gray-50",
  Results: "bg-green-50",
  Conclusion: "bg-amber-50",
};

/**
 * Parse the question stem into structured abstract sections and trailing question text.
 * Splits on markdown ## headers to extract each section and its content.
 *
 * @param stem - The full question stem with markdown ## section headers
 * @returns Object with an array of sections and the trailing question text
 */
function parseAbstractSections(stem: string): {
  sections: AbstractSection[];
  questionText: string;
} {
  const sections: AbstractSection[] = [];
  let questionText = "";

  // Split the stem on ## headers, keeping the header text
  const parts = stem.split(/^## /m);

  for (const part of parts) {
    if (!part.trim()) continue;

    // Find the section title (first line) and content (rest)
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) {
      // Single-line part without a newline -- could be trailing question text
      questionText = part.trim();
      continue;
    }

    const title = part.slice(0, newlineIdx).trim();
    const content = part.slice(newlineIdx + 1).trim();

    // Check if this is a known abstract section
    if (["Objective", "Methods", "Results", "Conclusion"].includes(title)) {
      sections.push({ title, content });
    } else {
      // Not a recognized section header -- treat as trailing question text
      // This handles text that comes before the first ## header too
      questionText = part.trim();
    }
  }

  // If sections extracted content after "Conclusion", the trailing question
  // might be embedded in the last section's content
  if (sections.length > 0 && !questionText) {
    const lastSection = sections[sections.length - 1];
    // Look for a trailing question after double newline in the last section
    const doubleNewline = lastSection.content.lastIndexOf("\n\n");
    if (doubleNewline !== -1) {
      const possibleQuestion = lastSection.content.slice(doubleNewline + 2).trim();
      // If it looks like a question (ends with ?)
      if (possibleQuestion.endsWith("?")) {
        questionText = possibleQuestion;
        lastSection.content = lastSection.content.slice(0, doubleNewline).trim();
      }
    }
  }

  return { sections, questionText };
}

/**
 * Check if a text block contains table-like data (pipe characters).
 * Used to decide whether to render Results content as a table.
 *
 * @param text - Text content to check for table formatting
 * @returns true if the text contains pipe-delimited table rows
 */
function hasTableData(text: string): boolean {
  return text.split("\n").some((line) => line.includes("|") && line.trim().startsWith("|"));
}

/**
 * Render pipe-delimited text as an HTML table.
 * Handles header row separation (lines with only dashes and pipes).
 *
 * @param text - Pipe-delimited table text to render
 * @returns JSX table element with proper formatting
 */
function renderTable(text: string) {
  const lines = text
    .split("\n")
    .filter((line) => line.trim().length > 0 && line.includes("|"));

  // Separate header from body rows (skip separator lines like |---|---|)
  const rows = lines.filter(
    (line) => !line.replace(/[\s|:-]/g, "").match(/^-*$/)
  );

  if (rows.length === 0) return <p className="whitespace-pre-wrap">{text}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {rows[0]
              .split("|")
              .filter((cell) => cell.trim())
              .map((cell, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold border border-gray-200"
                >
                  {cell.trim()}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {row
                .split("|")
                .filter((cell) => cell.trim())
                .map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-2 border border-gray-200"
                  >
                    {cell.trim()}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AbstractView({ question, onComplete }: AbstractViewProps) {
  /** Label of the currently selected answer option */
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  /** Result from the answer submission API */
  const [submitResult, setSubmitResult] = useState<AnswerSubmitResponse | null>(null);
  /** Whether an answer submission is in progress */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Whether the answer has been submitted */
  const isSubmitted = !!submitResult;

  // Parse the stem into structured sections and trailing question text
  const { sections, questionText } = parseAbstractSections(question.stem);

  /**
   * Handle answer option selection (only before submission).
   *
   * @param label - The label of the selected option (e.g., "A")
   */
  function handleOptionSelect(label: string) {
    if (isSubmitted) return;
    setSelectedOption(label);
  }

  /**
   * Submit the selected answer to the backend API.
   * Stores the result for displaying correctness feedback.
   */
  async function handleSubmit() {
    if (!selectedOption || isSubmitted || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await submitAnswer({
        question_id: question.id,
        selected_option_label: selectedOption,
      });
      setSubmitResult(result);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== Abstract Sections ===== */}
      {/* Each section rendered as a color-coded card */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card
            key={section.title}
            className={SECTION_COLORS[section.title] || "bg-white"}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Render table if Results section contains pipe-delimited data */}
              {section.title === "Results" && hasTableData(section.content) ? (
                <div className="space-y-3">
                  {/* Split into text and table parts */}
                  {section.content.split("\n\n").map((block, idx) =>
                    hasTableData(block) ? (
                      <div key={idx}>{renderTable(block)}</div>
                    ) : (
                      <p key={idx} className="text-sm leading-relaxed whitespace-pre-wrap">
                        {block}
                      </p>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== Trailing Question Text ===== */}
      {/* The actual question asked about the abstract */}
      {questionText && (
        <div className="prose prose-lg max-w-none">
          <p className="font-medium">{questionText}</p>
        </div>
      )}

      {/* ===== Answer Options (SBA-style A-E) ===== */}
      {/* Reuses the standard AnswerOption component for consistent behavior */}
      <div className="space-y-3">
        {question.answer_options.map((option) => {
          // Find per-option feedback from submission result
          const optionFeedback = submitResult?.options_feedback?.find(
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
                  ? submitResult?.correct_option_label === option.label
                  : false
              }
              isUserChoice={
                isSubmitted
                  ? submitResult?.selected_option_label === option.label
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
      <div className="flex items-center justify-end gap-2">
        {!isSubmitted && (
          <Button
            onClick={handleSubmit}
            disabled={!selectedOption || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        )}
        {isSubmitted && (
          <Button onClick={onComplete}>Next Question</Button>
        )}
      </div>

      {/* ===== Teaching Panel ===== */}
      {/* AI-powered explanation shown after submission */}
      <TeachingPanel
        questionId={question.id}
        userAnswerLabel={submitResult?.selected_option_label ?? selectedOption ?? ""}
        isVisible={isSubmitted}
      />
    </div>
  );
}

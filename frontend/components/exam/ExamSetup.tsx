"use client";

/**
 * ExamSetup -- Entry point and orchestrator for the exam simulation flow.
 *
 * Manages four phases of the exam experience:
 * 1. Setup: User selects USMLE step and number of blocks, then starts
 * 2. Blocks: Timed question blocks with no mid-block feedback
 * 3. Break: Optional break screen between blocks with pooled 45-min countdown
 * 4. Review: Post-exam review of all blocks with expandable explanations
 *
 * State flows:
 * - setup -> blocks (on "Begin Exam" click, after API call)
 * - blocks -> break (after completing a block, if more blocks remain)
 * - blocks -> review (after completing the last block)
 * - break -> blocks (when break ends, advances to next block)
 */

import { useState } from "react";
import Link from "next/link";
import { startExamSession } from "@/lib/api";
import type {
  ExamSessionResponse,
  ExamBlockResult,
} from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ExamBlock from "./ExamBlock";
import ExamTimer from "./ExamTimer";
import BreakScreen from "./BreakScreen";
import BlockReview from "./BlockReview";

/**
 * Exam configuration constants per USMLE step.
 * Matches the backend EXAM_CONFIGS in backend/app/schemas/exam.py.
 * Each step has a max number of blocks, questions per block, and minutes per block.
 */
const EXAM_CONFIGS: Record<
  string,
  { maxBlocks: number; questionsPerBlock: number; minutesPerBlock: number }
> = {
  step1: { maxBlocks: 7, questionsPerBlock: 40, minutesPerBlock: 60 },
  step2ck: { maxBlocks: 8, questionsPerBlock: 40, minutesPerBlock: 60 },
  step3: { maxBlocks: 6, questionsPerBlock: 40, minutesPerBlock: 60 },
};

/** USMLE step options with display labels and API values */
const STEP_OPTIONS = [
  { label: "Step 1", value: "step1" },
  { label: "Step 2 CK", value: "step2ck" },
  { label: "Step 3", value: "step3" },
] as const;

/** The four phases of the exam simulation flow */
type ExamPhase = "setup" | "blocks" | "break" | "review";

/**
 * ExamSetup component -- the main orchestrator for exam simulation.
 * Renders different views based on the current phase state.
 */
export default function ExamSetup() {
  /** Current phase of the exam flow */
  const [phase, setPhase] = useState<ExamPhase>("setup");

  /** Selected USMLE step (default: Step 1) */
  const [usmleStep, setUsmleStep] = useState<string>("step1");

  /** Number of blocks the user wants to take */
  const [blockCount, setBlockCount] = useState<number>(1);

  /** Session data returned from the exam start API call */
  const [sessionData, setSessionData] = useState<ExamSessionResponse | null>(null);

  /** Index of the current block being taken (0-indexed) */
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(0);

  /** Accumulated results for each completed block */
  const [blockResults, setBlockResults] = useState<ExamBlockResult[]>([]);

  /** Remaining break pool seconds (initialized from sessionData.break_pool_seconds) */
  const [breakPoolRemaining, setBreakPoolRemaining] = useState<number>(0);

  /** Whether a session start request is in progress */
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** Error message if session start fails */
  const [error, setError] = useState<string | null>(null);

  /** Current exam config based on selected step */
  const config = EXAM_CONFIGS[usmleStep];

  /**
   * Handle USMLE step selection change.
   * Caps the block count to the new step's maxBlocks if needed.
   *
   * @param step - The newly selected USMLE step value
   */
  function handleStepChange(step: string) {
    setUsmleStep(step);
    const newConfig = EXAM_CONFIGS[step];
    // Cap block count to the new step's maximum
    if (blockCount > newConfig.maxBlocks) {
      setBlockCount(newConfig.maxBlocks);
    }
  }

  /**
   * Start the exam simulation session.
   * Calls the backend API to create an exam session, then transitions to blocks phase.
   */
  async function handleBeginExam() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await startExamSession({
        config: {
          usmle_step: usmleStep,
          block_count: blockCount,
          questions_per_block: config.questionsPerBlock,
          minutes_per_block: config.minutesPerBlock,
        },
      });
      setSessionData(data);
      setBreakPoolRemaining(data.break_pool_seconds);
      setCurrentBlockIndex(0);
      setBlockResults([]);
      setPhase("blocks");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start exam session"
      );
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle block completion.
   * Appends the block result and transitions to break (if more blocks) or review (if last block).
   *
   * @param result - The graded result for the completed block
   */
  function onBlockComplete(result: ExamBlockResult) {
    const updatedResults = [...blockResults, result];
    setBlockResults(updatedResults);

    // Check if there are more blocks remaining
    if (sessionData && currentBlockIndex < sessionData.blocks.length - 1) {
      // More blocks remain -- go to break screen
      setPhase("break");
    } else {
      // Last block completed -- go to review
      setPhase("review");
    }
  }

  /**
   * Handle break end.
   * Stores the remaining break pool seconds, advances to the next block.
   *
   * @param remainingSeconds - Seconds remaining in the break pool after this break
   */
  function onBreakEnd(remainingSeconds: number) {
    setBreakPoolRemaining(remainingSeconds);
    setCurrentBlockIndex((prev) => prev + 1);
    setPhase("blocks");
  }

  // ===== Blocks Phase =====
  // Render the current exam block with timed question view
  if (phase === "blocks" && sessionData) {
    const currentBlock = sessionData.blocks[currentBlockIndex];
    return (
      <ExamBlock
        block={currentBlock}
        sessionId={sessionData.session_id}
        blockNumber={currentBlock.block_number}
        onBlockComplete={onBlockComplete}
      />
    );
  }

  // ===== Break Phase =====
  // Render the break screen between blocks
  if (phase === "break" && sessionData) {
    return (
      <BreakScreen
        breakPoolRemaining={breakPoolRemaining}
        nextBlockNumber={currentBlockIndex + 2}
        totalBlocks={sessionData.blocks.length}
        onEndBreak={onBreakEnd}
      />
    );
  }

  // ===== Review Phase =====
  // Render the post-exam block review with expandable explanations
  if (phase === "review" && sessionData) {
    return (
      <BlockReview
        blocks={sessionData.blocks}
        blockResults={blockResults}
        sessionId={sessionData.session_id}
      />
    );
  }

  // ===== Setup Phase (default) =====
  // Show exam configuration UI with step and block count selectors
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
        {/* Page heading */}
        <div>
          <h2 className="text-2xl font-bold">Exam Simulation</h2>
          <p className="text-muted-foreground mt-1">
            Timed blocks mimicking the real USMLE format
          </p>
        </div>

        {/* ===== USMLE Step Selector ===== */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">USMLE Step</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {STEP_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={usmleStep === option.value ? "default" : "outline"}
                  className={
                    usmleStep === option.value
                      ? "bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white"
                      : ""
                  }
                  onClick={() => handleStepChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ===== Block Count Selector ===== */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Number of Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Button row from 1 to maxBlocks for the selected step */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: config.maxBlocks }, (_, i) => i + 1).map(
                (num) => (
                  <Button
                    key={num}
                    variant={blockCount === num ? "default" : "outline"}
                    className={
                      blockCount === num
                        ? "bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white"
                        : ""
                    }
                    onClick={() => setBlockCount(num)}
                  >
                    {num}
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== Exam Info Card ===== */}
        {/* Displays calculated exam parameters based on current selections */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Exam Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {/* Questions per block */}
              <div>
                <span className="text-muted-foreground">Questions/Block</span>
                <p className="font-semibold text-lg">{config.questionsPerBlock}</p>
              </div>
              {/* Minutes per block */}
              <div>
                <span className="text-muted-foreground">Minutes/Block</span>
                <p className="font-semibold text-lg">{config.minutesPerBlock}</p>
              </div>
              {/* Total questions across all selected blocks */}
              <div>
                <span className="text-muted-foreground">Total Questions</span>
                <p className="font-semibold text-lg">
                  {config.questionsPerBlock * blockCount}
                </p>
              </div>
              {/* Total exam time in minutes */}
              <div>
                <span className="text-muted-foreground">Total Time</span>
                <p className="font-semibold text-lg">
                  {config.minutesPerBlock * blockCount} min
                </p>
              </div>
              {/* Break pool time (always 45 min for all steps) */}
              <div>
                <span className="text-muted-foreground">Break Pool</span>
                <p className="font-semibold text-lg">45 min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Warning Text ===== */}
        {/* Informs user about exam simulation rules (no feedback during blocks) */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> No feedback will be shown during blocks.
            Answers are reviewed after all blocks are complete. Unanswered questions
            will be marked incorrect.
          </p>
        </div>

        {/* Error message display */}
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {/* ===== Begin Exam Button ===== */}
        <Button
          className="w-full bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white py-6 text-lg"
          onClick={handleBeginExam}
          disabled={isLoading}
        >
          {isLoading ? "Starting Exam..." : "Begin Exam"}
        </Button>

        {/* Back to Dashboard link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

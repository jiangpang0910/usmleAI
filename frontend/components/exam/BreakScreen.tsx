"use client";

/**
 * BreakScreen -- Break screen displayed between exam blocks.
 *
 * Features:
 * - Shows a countdown from the shared 45-minute break pool
 * - Break pool is shared across all blocks (not per-break)
 * - Auto-ends the break when the pool is exhausted
 * - User can end the break early with a button
 * - Calming blue-tinted background to reduce exam stress
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Props for the BreakScreen component.
 */
interface BreakScreenProps {
  /** Seconds remaining in the shared break pool */
  breakPoolRemaining: number;
  /** The next block number (1-indexed, for display) */
  nextBlockNumber: number;
  /** Total number of blocks in the exam */
  totalBlocks: number;
  /** Callback when break ends -- receives the remaining pool seconds after this break */
  onEndBreak: (remainingSeconds: number) => void;
}

/**
 * Format seconds into MM:SS display string.
 *
 * @param seconds - Total seconds to format
 * @returns Formatted string like "45:00" or "12:30"
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * BreakScreen component -- manages the break period between exam blocks.
 * Counts up from 0 to track how much break time has been used. The remaining
 * pool time is breakPoolRemaining minus breakTimeUsed.
 */
export default function BreakScreen({
  breakPoolRemaining,
  nextBlockNumber,
  totalBlocks,
  onEndBreak,
}: BreakScreenProps) {
  /** Seconds of break time used during this break period */
  const [breakTimeUsed, setBreakTimeUsed] = useState<number>(0);

  /** Whether the break is still active (not ended yet) */
  const [isBreakActive, setIsBreakActive] = useState<boolean>(true);

  /** Ref to track the interval ID for cleanup */
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /** Ref to prevent double-ending of break */
  const endedRef = useRef<boolean>(false);

  /**
   * Set up the break timer interval.
   * Increments breakTimeUsed each second. If the pool is exhausted
   * (breakTimeUsed >= breakPoolRemaining), auto-ends the break.
   */
  useEffect(() => {
    if (!isBreakActive) return;

    intervalRef.current = setInterval(() => {
      setBreakTimeUsed((prev) => {
        const next = prev + 1;

        // Auto-end break if pool is exhausted
        if (next >= breakPoolRemaining && !endedRef.current) {
          endedRef.current = true;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsBreakActive(false);
          // Call onEndBreak with 0 remaining (pool exhausted)
          setTimeout(() => onEndBreak(0), 0);
          return breakPoolRemaining;
        }

        return next;
      });
    }, 1000);

    // Cleanup: clear interval on unmount or when break becomes inactive
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBreakActive]);

  /** Current remaining time in the pool (decreases as break time is used) */
  const poolTimeLeft = breakPoolRemaining - breakTimeUsed;

  /** Whether the break pool is exhausted */
  const isPoolExhausted = poolTimeLeft <= 0;

  /**
   * Handle the "End Break & Continue" button click.
   * Stops the timer and calls onEndBreak with the remaining pool time.
   */
  function handleEndBreak() {
    if (endedRef.current) return;
    endedRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsBreakActive(false);
    onEndBreak(Math.max(0, poolTimeLeft));
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-8">
      {/* Centered break card with calming blue-tinted design */}
      <Card className="w-full max-w-md shadow-lg border-blue-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Break Time</CardTitle>
          {/* Next block info */}
          <p className="text-muted-foreground mt-2">
            Block {nextBlockNumber} of {totalBlocks} coming up
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Break pool remaining countdown */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Break Pool Remaining
            </p>
            <p
              className={`text-4xl font-bold tabular-nums ${
                isPoolExhausted ? "text-red-600" : "text-blue-700"
              }`}
            >
              {formatTime(poolTimeLeft)}
            </p>
          </div>

          {/* Pool exhausted warning message */}
          {isPoolExhausted && (
            <p className="text-center text-sm text-red-600 font-medium">
              Break pool exhausted. Next block starting...
            </p>
          )}

          {/* Break time used indicator */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Time used this break: {formatTime(breakTimeUsed)}
            </p>
          </div>

          {/* End Break button -- visible only when break is still active and pool not exhausted */}
          {isBreakActive && !isPoolExhausted && (
            <Button
              className="w-full bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white py-5 text-lg"
              onClick={handleEndBreak}
            >
              End Break &amp; Continue
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

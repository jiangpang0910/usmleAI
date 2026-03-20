"use client";

/**
 * ExamTimer -- Countdown timer for exam simulation blocks.
 *
 * Features:
 * - Counts down from totalSeconds to 0
 * - Hidden by default, toggled with a Show/Hide button (matches real USMLE UX)
 * - Calls onTick every second so the parent (ExamBlock) can track timerRemaining
 *   for accurate time_spent_seconds computation on block submission
 * - Calls onExpire when timer reaches 0 (triggers auto-submit)
 * - Visual warnings: red text at < 5 min, pulsing animation at < 1 min
 */

import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the ExamTimer component.
 */
interface ExamTimerProps {
  /** Total countdown time in seconds for this block */
  totalSeconds: number;
  /** Callback invoked when the timer reaches 0 */
  onExpire: () => void;
  /** Optional callback invoked every second with the current remaining seconds.
   *  Allows the parent component to track remaining time for time_spent_seconds. */
  onTick?: (remaining: number) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Format seconds into MM:SS display string.
 *
 * @param seconds - Total seconds to format
 * @returns Formatted string like "05:30" or "00:45"
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * ExamTimer component -- countdown timer with show/hide toggle.
 * Timer is hidden by default per USMLE convention. The user can
 * toggle visibility with a button. The timer always runs in the
 * background regardless of visibility.
 */
export default function ExamTimer({
  totalSeconds,
  onExpire,
  onTick,
  className,
}: ExamTimerProps) {
  /** Remaining seconds on the countdown */
  const [remaining, setRemaining] = useState<number>(totalSeconds);

  /** Whether the timer display is visible (hidden by default) */
  const [isVisible, setIsVisible] = useState<boolean>(false);

  /** Ref to track the interval ID for cleanup */
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /** Ref to track if onExpire has already been called (prevent double-fire) */
  const expiredRef = useRef<boolean>(false);

  /**
   * Set up the countdown interval on mount.
   * Decrements remaining each second, calls onTick with updated value,
   * and triggers onExpire when timer hits 0. Cleans up on unmount.
   */
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;

        // Call onTick with the new remaining value so parent stays in sync
        onTick?.(next);

        // When timer reaches 0, trigger expiry and clear interval
        if (next <= 0) {
          if (!expiredRef.current) {
            expiredRef.current = true;
            // Use setTimeout to avoid calling onExpire during state update
            setTimeout(() => onExpire(), 0);
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }

        return next;
      });
    }, 1000);

    // Cleanup: clear interval when component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Determine the text color class based on remaining time.
   * Normal: default text color
   * Warning (< 5 min): red text
   * Critical (< 1 min): red text with pulse animation
   */
  function getTimerClasses(): string {
    if (remaining < 60) {
      return "text-red-600 font-bold animate-pulse";
    }
    if (remaining < 300) {
      return "text-red-600 font-bold";
    }
    return "font-semibold";
  }

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {/* Toggle button to show/hide the timer display */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-1"
      >
        <Clock className="h-4 w-4" />
        {isVisible ? "Hide Timer" : "Show Timer"}
      </Button>

      {/* Timer display -- only shown when isVisible is true */}
      {isVisible && (
        <span className={`text-lg tabular-nums ${getTimerClasses()}`}>
          {formatTime(remaining)}
        </span>
      )}
    </div>
  );
}

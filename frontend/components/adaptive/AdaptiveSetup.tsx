"use client";

/**
 * AdaptiveSetup — Entry point for the adaptive study session flow.
 *
 * Two-phase component:
 * 1. Setup phase: Configure session (question count, USMLE step filter),
 *    preview weak topics from performance data, and start the session.
 * 2. Session phase: Render the AdaptiveSession component with the
 *    AI-selected questions from the backend.
 *
 * On mount, fetches the student's performance summary to display
 * weak topics (accuracy < 60%) as a preview before starting.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchPerformance, startAdaptiveSession } from "@/lib/api";
import type {
  PerformanceSummaryResponse,
  AdaptiveSessionResponse,
} from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdaptiveSession from "./AdaptiveSession";

/** Available question count options for the session */
const QUESTION_COUNT_OPTIONS = [10, 15, 20, 30] as const;

/** USMLE step filter options with display labels and API values */
const STEP_OPTIONS = [
  { label: "All Steps", value: null },
  { label: "Step 1", value: "step1" },
  { label: "Step 2 CK", value: "step2ck" },
  { label: "Step 3", value: "step3" },
] as const;

/** Accuracy threshold below which a topic is considered "weak" */
const WEAK_TOPIC_THRESHOLD = 0.6;

/** Accuracy threshold below which a topic is critically weak (displayed in red) */
const CRITICAL_TOPIC_THRESHOLD = 0.4;

export default function AdaptiveSetup() {
  /** Current phase of the component: "setup" shows config, "session" shows quiz */
  const [phase, setPhase] = useState<"setup" | "session">("setup");
  /** Session data returned from the adaptive start endpoint */
  const [sessionData, setSessionData] =
    useState<AdaptiveSessionResponse | null>(null);
  /** Whether a session start request is in progress */
  const [isLoading, setIsLoading] = useState(false);
  /** Number of questions selected for the session */
  const [questionCount, setQuestionCount] = useState(20);
  /** Optional USMLE step filter (null means all steps) */
  const [usmleStep, setUsmleStep] = useState<string | null>(null);
  /** Performance data fetched on mount for weak topic preview */
  const [performance, setPerformance] =
    useState<PerformanceSummaryResponse | null>(null);
  /** Whether performance data is currently loading */
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(true);
  /** Error message if session start fails */
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch performance data on component mount to show weak topic preview.
   * Silently handles errors since performance data is optional (new users
   * won't have any history yet).
   */
  useEffect(() => {
    async function loadPerformance() {
      try {
        const data = await fetchPerformance();
        setPerformance(data);
      } catch {
        // Silently handle — new users won't have performance data
      } finally {
        setIsLoadingPerformance(false);
      }
    }
    loadPerformance();
  }, []);

  /**
   * Start the adaptive session by calling the backend endpoint.
   * On success, stores the session data and transitions to the session phase.
   */
  async function handleStartSession() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await startAdaptiveSession({
        question_count: questionCount,
        usmle_step: usmleStep || undefined,
      });
      setSessionData(data);
      setPhase("session");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start adaptive session"
      );
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Filter topics to only those below the weak topic threshold (60% accuracy).
   * Returns topics sorted by accuracy ascending (weakest first).
   */
  const weakTopics =
    performance?.topics.filter(
      (t) => t.accuracy < WEAK_TOPIC_THRESHOLD
    ) ?? [];

  // ===== Session Phase =====
  // Once the session has started, render the adaptive quiz session
  if (phase === "session" && sessionData) {
    return <AdaptiveSession sessionData={sessionData} />;
  }

  // ===== Setup Phase =====
  // Show configuration options and weak topic preview before starting
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
        {/* Page heading with subtitle explaining the adaptive mode */}
        <div>
          <h2 className="text-2xl font-bold">Adaptive Session</h2>
          <p className="text-muted-foreground mt-1">
            AI selects questions based on your weak areas
          </p>
        </div>

        {/* ===== Configuration Card ===== */}
        {/* Question count and USMLE step filter selection */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Session Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question count selector — buttons for 10, 15, 20, 30 */}
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                Number of Questions
              </label>
              <div className="flex gap-2">
                {QUESTION_COUNT_OPTIONS.map((count) => (
                  <Button
                    key={count}
                    variant={questionCount === count ? "default" : "outline"}
                    className={
                      questionCount === count
                        ? "bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white"
                        : ""
                    }
                    onClick={() => setQuestionCount(count)}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* USMLE step filter — buttons for All Steps, Step 1, Step 2 CK, Step 3 */}
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">
                USMLE Step Filter
              </label>
              <div className="flex gap-2 flex-wrap">
                {STEP_OPTIONS.map((option) => (
                  <Button
                    key={option.label}
                    variant={usmleStep === option.value ? "default" : "outline"}
                    className={
                      usmleStep === option.value
                        ? "bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white"
                        : ""
                    }
                    onClick={() => setUsmleStep(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Weak Topics Preview Card ===== */}
        {/* Shows topics with accuracy below 60% from performance history */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Weak Topics Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Loading state while performance data is being fetched */}
            {isLoadingPerformance && (
              <p className="text-muted-foreground text-sm">
                Loading performance data...
              </p>
            )}

            {/* No weak topics found — show informational message */}
            {!isLoadingPerformance && weakTopics.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No weak areas detected yet. The AI will select a balanced mix of
                questions.
              </p>
            )}

            {/* Weak topics list — each topic shows name, accuracy, and question count */}
            {!isLoadingPerformance && weakTopics.length > 0 && (
              <div className="space-y-3">
                {weakTopics.map((topic) => (
                  <div
                    key={topic.topic_id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    {/* Topic name */}
                    <span className="font-medium">{topic.topic_name}</span>
                    <div className="flex items-center gap-4">
                      {/* Accuracy percentage — red if < 40%, orange if < 60% */}
                      <span
                        className={`text-sm font-semibold ${
                          topic.accuracy < CRITICAL_TOPIC_THRESHOLD
                            ? "text-red-600"
                            : "text-orange-500"
                        }`}
                      >
                        {Math.round(topic.accuracy * 100)}% accuracy
                      </span>
                      {/* Total questions answered in this topic */}
                      <span className="text-xs text-muted-foreground">
                        {topic.total_answered} answered
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error message display */}
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {/* ===== Start Session Button ===== */}
        {/* Full-width navy button that triggers the adaptive session start */}
        <Button
          className="w-full bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white py-6 text-lg"
          onClick={handleStartSession}
          disabled={isLoading}
        >
          {isLoading ? "Starting Session..." : "Start Session"}
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

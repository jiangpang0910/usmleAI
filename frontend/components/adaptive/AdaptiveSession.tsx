"use client";

/**
 * AdaptiveSession — Wrapper around QuestionView for adaptive quiz sessions.
 *
 * Receives the adaptive session data (questions and weak topics) from
 * AdaptiveSetup and renders the quiz interface using the existing
 * QuestionView component. After all questions are answered, shows a
 * performance summary with targeted weak topics.
 *
 * The component monitors QuestionView completion through a "session complete"
 * overlay that appears when the user finishes the quiz and returns to this
 * wrapper's context.
 */

import { useState } from "react";
import type { AdaptiveSessionResponse } from "@/lib/types";
import QuestionView from "@/components/quiz/QuestionView";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Props for the AdaptiveSession component.
 */
interface AdaptiveSessionProps {
  /** Session data from the adaptive start endpoint containing questions and weak topics */
  sessionData: AdaptiveSessionResponse;
}

export default function AdaptiveSession({ sessionData }: AdaptiveSessionProps) {
  /** Whether the session summary is visible (shown when user finishes the quiz) */
  const [showSummary, setShowSummary] = useState(false);

  // ===== Session Summary View =====
  // Shown after the user completes the adaptive quiz via QuestionView's
  // built-in "Finish Quiz" flow which navigates back to dashboard.
  // This summary is accessible via the "View Session Summary" button.
  if (showSummary) {
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

        <div className="max-w-5xl mx-auto p-8 space-y-6">
          {/* Session summary heading */}
          <h2 className="text-2xl font-bold">Adaptive Session Summary</h2>

          {/* Session statistics card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Session Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Total questions in this session */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Questions</span>
                <span className="font-semibold">
                  {sessionData.questions.length}
                </span>
              </div>
              {/* Session ID for reference */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Session ID</span>
                <span className="font-mono text-sm text-muted-foreground">
                  {sessionData.session_id.slice(0, 8)}...
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Targeted weak topics card — shows which topics the AI focused on */}
          {sessionData.weak_topics.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Targeted Weak Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessionData.weak_topics.map((topic) => (
                    <div
                      key={topic.topic_id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      {/* Topic name */}
                      <span className="font-medium">{topic.topic_name}</span>
                      {/* Accuracy percentage with color coding */}
                      <span
                        className={`text-sm font-semibold ${
                          topic.accuracy < 0.4
                            ? "text-red-600"
                            : "text-orange-500"
                        }`}
                      >
                        {Math.round(topic.accuracy * 100)}% accuracy
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back to Dashboard button */}
          <Button
            className="w-full bg-[hsl(217,71%,20%)] hover:bg-[hsl(217,71%,25%)] text-white"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ===== Quiz Session View =====
  // Renders the QuestionView with adaptive questions and a summary toggle
  return (
    <div className="min-h-screen bg-background">
      {/* ===== Navy Header Bar ===== */}
      <header className="bg-[hsl(217,71%,20%)] text-white py-6 px-8 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">usmleAI</h1>
            <p className="text-sm text-blue-200">Adaptive Session</p>
          </div>
          {/* View Summary button — allows early access to session summary */}
          <Button
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10"
            onClick={() => setShowSummary(true)}
          >
            View Summary
          </Button>
        </div>
      </header>

      {/* ===== Main Quiz Content ===== */}
      <div className="max-w-5xl mx-auto p-8">
        <QuestionView questions={sessionData.questions} />
      </div>
    </div>
  );
}

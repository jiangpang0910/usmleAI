"use client";

/**
 * TeachingPanel — AI-powered teaching feedback panel with mode toggle.
 *
 * Provides two teaching modes:
 * - Explanation: Detailed breakdown of the correct answer and reasoning
 * - Socratic: Interactive guided questioning that helps students think through the problem
 *
 * The Socratic mode supports multi-turn conversation where the student
 * can respond to Claude's questions and receive follow-up guidance.
 *
 * Appears below the answer options after the user submits their answer.
 */

import { useEffect, useState, useCallback } from "react";
import { requestExplanation } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Props for the TeachingPanel component.
 * Controls when the panel is visible and provides context for the explanation.
 */
interface TeachingPanelProps {
  /** UUID of the question being explained */
  questionId: string;
  /** Label of the user's selected answer (provides context for the explanation) */
  userAnswerLabel: string;
  /** Whether the panel should be displayed (true after answer submission) */
  isVisible: boolean;
}

/** A single message in the Socratic conversation thread */
interface ConversationMessage {
  /** Who sent the message: "user" or "assistant" */
  role: "user" | "assistant";
  /** The message text content */
  content: string;
}

export default function TeachingPanel({
  questionId,
  userAnswerLabel,
  isVisible,
}: TeachingPanelProps) {
  /** Current teaching mode — determines the style of AI response */
  const [teachingMode, setTeachingMode] = useState<"explanation" | "socratic">(
    "explanation"
  );
  /** The current AI-generated content to display */
  const [content, setContent] = useState<string>("");
  /** Whether an API request is in progress */
  const [isLoading, setIsLoading] = useState(false);
  /** Error message if the API call fails */
  const [error, setError] = useState<string | null>(null);
  /** Full conversation history for Socratic mode multi-turn dialogue */
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);
  /** Text input value for the student's Socratic mode response */
  const [socraticInput, setSocraticInput] = useState("");

  /**
   * Fetch an explanation or Socratic response from the Claude API.
   * Called when the panel first becomes visible and when the teaching mode changes.
   *
   * @param mode - The teaching mode to request
   * @param history - Optional conversation history for Socratic follow-ups
   */
  const fetchExplanation = useCallback(
    async (
      mode: "explanation" | "socratic",
      history?: ConversationMessage[]
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await requestExplanation({
          question_id: questionId,
          teaching_mode: mode,
          user_answer_label: userAnswerLabel,
          conversation_history: history,
        });

        setContent(response.content);

        // In Socratic mode, append the assistant's response to conversation history
        if (mode === "socratic") {
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: response.content },
          ]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to get explanation"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [questionId, userAnswerLabel]
  );

  /**
   * Auto-fetch explanation when the panel becomes visible for the first time.
   * Uses the default "explanation" mode initially.
   */
  useEffect(() => {
    if (isVisible && !content && !isLoading) {
      fetchExplanation("explanation");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  /**
   * Handle teaching mode toggle.
   * Clears previous content and fetches a new response in the selected mode.
   */
  function handleModeToggle(newMode: "explanation" | "socratic") {
    if (newMode === teachingMode) return; // No-op if same mode
    setTeachingMode(newMode);
    setContent("");
    setConversationHistory([]);
    setSocraticInput("");
    fetchExplanation(newMode);
  }

  /**
   * Handle student's Socratic response submission.
   * Appends the student's message to history and requests a follow-up from Claude.
   */
  async function handleSocraticSubmit() {
    if (!socraticInput.trim()) return;

    // Add the student's message to the conversation
    const updatedHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: "user", content: socraticInput.trim() },
    ];
    setConversationHistory(updatedHistory);
    setSocraticInput("");

    // Request Claude's follow-up response with full conversation context
    await fetchExplanation("socratic", updatedHistory);
  }

  // Don't render anything if the panel isn't visible
  if (!isVisible) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Teaching Feedback</CardTitle>

          {/* Teaching mode toggle — two side-by-side buttons */}
          <div className="flex gap-1">
            <Button
              variant={teachingMode === "explanation" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeToggle("explanation")}
            >
              Explanation
            </Button>
            <Button
              variant={teachingMode === "socratic" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeToggle("socratic")}
            >
              Socratic
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading state — pulsing text indicator */}
        {isLoading && (
          <p className="text-muted-foreground animate-pulse">
            Generating explanation...
          </p>
        )}

        {/* Error state — red text with error details */}
        {error && <p className="text-red-600">Error: {error}</p>}

        {/* Explanation mode — single response displayed as formatted prose */}
        {!isLoading && !error && teachingMode === "explanation" && content && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {content}
          </div>
        )}

        {/* Socratic mode — conversation thread with input for follow-ups */}
        {!isLoading && !error && teachingMode === "socratic" && (
          <div className="space-y-4">
            {/* Render conversation messages as a thread */}
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-lg text-sm",
                  msg.role === "assistant"
                    ? "bg-blue-50 border border-blue-100"
                    : "bg-gray-50 border border-gray-100 ml-8"
                )}
              >
                {/* Role label for clarity */}
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {msg.role === "assistant" ? "Claude" : "You"}
                </p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}

            {/* Student input for Socratic follow-up responses */}
            <div className="flex gap-2">
              <input
                type="text"
                value={socraticInput}
                onChange={(e) => setSocraticInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSocraticSubmit();
                }}
                placeholder="Type your response..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                size="sm"
                onClick={handleSocraticSubmit}
                disabled={!socraticInput.trim() || isLoading}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


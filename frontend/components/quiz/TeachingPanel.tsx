"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestExplanation } from "@/lib/api";

/**
 * Props for the TeachingPanel component.
 * Controls when the panel appears and what question/answer context to use.
 */
interface TeachingPanelProps {
  /** ID of the question being explained */
  questionId: string;
  /** Label of the answer the user selected (e.g., "A") */
  userAnswerLabel: string;
  /** Only show the panel after the answer has been submitted */
  isVisible: boolean;
}

/**
 * A single message in the Socratic conversation thread.
 * Tracks the role (user or assistant) and the message content.
 */
interface ConversationMessage {
  /** Who sent the message: the student or the AI */
  role: "user" | "assistant";
  /** The message text content */
  content: string;
}

/**
 * TeachingPanel — displays AI-generated teaching feedback after a question is answered.
 *
 * Two modes:
 * 1. Explanation mode: detailed breakdown of why the answer is correct/incorrect
 * 2. Socratic mode: guided questioning where the AI asks follow-up questions
 *    to deepen understanding, supporting multi-turn conversation
 *
 * The panel auto-fetches an explanation when it becomes visible and allows
 * the user to toggle between modes at any time.
 */
export default function TeachingPanel({
  questionId,
  userAnswerLabel,
  isVisible,
}: TeachingPanelProps) {
  /** Current teaching mode: detailed explanation or Socratic questioning */
  const [teachingMode, setTeachingMode] = useState<
    "explanation" | "socratic"
  >("explanation");

  /** The AI-generated explanation content (for explanation mode) */
  const [content, setContent] = useState<string>("");

  /** Whether an API request is in progress */
  const [isLoading, setIsLoading] = useState(false);

  /** Error message if the API request fails */
  const [error, setError] = useState<string | null>(null);

  /** Full conversation history for Socratic multi-turn dialogue */
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);

  /** Text input value for the Socratic follow-up response */
  const [socraticInput, setSocraticInput] = useState("");

  /**
   * Fetch an explanation from the Claude API.
   * Called on initial visibility and when the teaching mode toggles.
   *
   * @param mode - Which teaching mode to request
   * @param history - Optional conversation history for Socratic mode
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

        if (mode === "explanation") {
          // For explanation mode, just show the content directly
          setContent(response.content);
        } else {
          // For Socratic mode, append assistant response to conversation
          setConversationHistory((prev) => [
            ...prev,
            { role: "assistant", content: response.content },
          ]);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load explanation"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [questionId, userAnswerLabel]
  );

  /**
   * Auto-fetch explanation when the panel becomes visible.
   * Triggers on first render and when visibility changes.
   */
  useEffect(() => {
    if (isVisible) {
      fetchExplanation("explanation");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  /**
   * Handle teaching mode toggle.
   * Clears previous content and fetches fresh content in the new mode.
   *
   * @param mode - The mode to switch to
   */
  const handleModeSwitch = (mode: "explanation" | "socratic") => {
    if (mode === teachingMode) return;

    setTeachingMode(mode);
    setContent("");
    setConversationHistory([]);
    setSocraticInput("");
    fetchExplanation(mode);
  };

  /**
   * Handle Socratic follow-up submission.
   * Appends the user's message to the conversation and requests
   * a new AI response with the full conversation context.
   */
  const handleSocraticSubmit = () => {
    if (!socraticInput.trim()) return;

    // Build updated conversation history with user's new message
    const updatedHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: "user", content: socraticInput.trim() },
    ];

    setConversationHistory(updatedHistory);
    setSocraticInput("");
    fetchExplanation("socratic", updatedHistory);
  };

  // Don't render anything until the answer has been submitted
  if (!isVisible) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          {/* Panel title */}
          <CardTitle className="text-lg">Teaching Feedback</CardTitle>

          {/* Mode toggle: two-segment button group */}
          <div className="flex gap-1">
            <Button
              variant={teachingMode === "explanation" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeSwitch("explanation")}
            >
              Explanation
            </Button>
            <Button
              variant={teachingMode === "socratic" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeSwitch("socratic")}
            >
              Socratic
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Error display */}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {/* Explanation mode: single block of content */}
        {teachingMode === "explanation" && (
          <div>
            {isLoading ? (
              <p className="text-muted-foreground animate-pulse">
                Generating explanation...
              </p>
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {content}
              </div>
            )}
          </div>
        )}

        {/* Socratic mode: conversation thread with input for follow-up */}
        {teachingMode === "socratic" && (
          <div className="space-y-4">
            {/* Conversation history */}
            {conversationHistory.map((msg, idx) => (
              <div
                key={idx}
                className={cn_message(msg.role)}
              >
                {/* Role label */}
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {msg.role === "assistant" ? "Tutor" : "You"}
                </span>
                {/* Message content */}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}

            {/* Loading indicator for pending AI response */}
            {isLoading && (
              <p className="text-muted-foreground animate-pulse text-sm">
                Thinking...
              </p>
            )}

            {/* Follow-up input for student's response */}
            {!isLoading && conversationHistory.length > 0 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={socraticInput}
                  onChange={(e) => setSocraticInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSocraticSubmit();
                  }}
                  placeholder="Type your response..."
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  size="sm"
                  onClick={handleSocraticSubmit}
                  disabled={!socraticInput.trim()}
                >
                  Send
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Returns Tailwind classes for styling a conversation message bubble.
 * Assistant messages get a subtle gray background, user messages get blue.
 *
 * @param role - Whether this is a "user" or "assistant" message
 * @returns CSS class string for the message container
 */
function cn_message(role: "user" | "assistant"): string {
  const base = "rounded-lg p-3 space-y-1";
  if (role === "assistant") {
    return `${base} bg-gray-50 border border-gray-100`;
  }
  return `${base} bg-blue-50 border border-blue-100`;
}

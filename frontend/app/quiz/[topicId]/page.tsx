"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fetchQuestionsByTopic } from "@/lib/api";
import type { Question } from "@/lib/types";
import QuestionView from "@/components/quiz/QuestionView";

/**
 * Quiz page route (/quiz/[topicId]).
 *
 * Fetches questions for the given topic ID and renders the QuestionView
 * component for the user to answer SBA questions.
 *
 * Handles three states:
 * - Loading: while questions are being fetched
 * - Empty: if no questions exist for this topic
 * - Error: if the API request fails
 */
export default function QuizPage() {
  /** Extract the topic ID from the URL path parameter */
  const params = useParams();
  const topicId = params.topicId as string;

  /** Router for back navigation */
  const router = useRouter();

  /** Array of questions fetched for this topic */
  const [questions, setQuestions] = useState<Question[]>([]);

  /** Whether questions are currently being loaded */
  const [isLoading, setIsLoading] = useState(true);

  /** Error message if question fetch fails */
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch questions from the backend when the component mounts
   * or when the topic ID changes.
   */
  useEffect(() => {
    if (!topicId) return;

    async function loadQuestions() {
      try {
        const data = await fetchQuestionsByTopic(topicId);
        setQuestions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load questions"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, [topicId]);

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Navy Header Bar ===== */}
      {/* Consistent header across all pages */}
      <header className="bg-[hsl(217,71%,20%)] text-white py-6 px-8 shadow-md">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">usmleAI</h1>
          <p className="text-sm text-blue-200">
            AI-powered USMLE preparation
          </p>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="max-w-5xl mx-auto p-8">
        {/* Back link to topic picker */}
        <Button
          variant="ghost"
          onClick={() => router.push("/topics")}
          className="text-sm text-muted-foreground -ml-2 mb-6"
        >
          &larr; Back to Topics
        </Button>

        {/* Loading state */}
        {isLoading && (
          <p className="text-muted-foreground">Loading questions...</p>
        )}

        {/* Error state */}
        {error && <p className="text-red-600">{error}</p>}

        {/* Empty state: no questions available for this topic */}
        {!isLoading && !error && questions.length === 0 && (
          <p className="text-muted-foreground">
            No questions found for this topic.
          </p>
        )}

        {/* Question view: renders the quiz interface */}
        {!isLoading && !error && questions.length > 0 && (
          <QuestionView questions={questions} />
        )}
      </div>
    </div>
  );
}

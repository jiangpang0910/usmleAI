"use client";

/**
 * Quiz page route — renders the question answering interface for a specific topic.
 *
 * Extracts the topicId from the URL parameters, fetches questions for that topic,
 * and renders the QuestionView component with the loaded questions.
 *
 * Route: /quiz/[topicId]
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchQuestionsByTopic } from "@/lib/api";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import QuestionView from "@/components/quiz/QuestionView";

export default function QuizPage() {
  /** Router for navigation (back to topics page) */
  const router = useRouter();
  /** Extract topicId from the dynamic route segment */
  const params = useParams();
  const topicId = params.topicId as string;

  /** Array of questions fetched for this topic */
  const [questions, setQuestions] = useState<Question[]>([]);
  /** Whether questions are currently being loaded */
  const [isLoading, setIsLoading] = useState(true);
  /** Error message if question fetch fails */
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch questions for the given topic on component mount.
   * Only runs when topicId changes (route navigation).
   */
  useEffect(() => {
    async function loadQuestions() {
      if (!topicId) return;
      try {
        setIsLoading(true);
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
        {/* Back navigation link to topics page */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.push("/topics")}>
            Back to Topics
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <p className="text-muted-foreground">Loading questions...</p>
        )}

        {/* Error state */}
        {error && <p className="text-red-600">Error: {error}</p>}

        {/* Empty state — no questions found for this topic */}
        {!isLoading && !error && questions.length === 0 && (
          <p className="text-muted-foreground">
            No questions found for this topic.
          </p>
        )}

        {/* Question view — rendered when questions are loaded */}
        {!isLoading && !error && questions.length > 0 && (
          <QuestionView questions={questions} />
        )}
      </div>
    </div>
  );
}

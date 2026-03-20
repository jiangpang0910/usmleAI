"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchTopics } from "@/lib/api";
import type { Topic } from "@/lib/types";

/**
 * Mapping from backend discipline values to human-readable group labels.
 * Topics are grouped by these categories for organized display.
 */
const DISCIPLINE_LABELS: Record<string, string> = {
  basic_science: "Basic Sciences",
  clinical_science: "Clinical Sciences",
  behavioral_social: "Behavioral & Social Sciences",
};

/**
 * Ordered list of discipline keys to control the display order.
 * Basic sciences first, then clinical, then behavioral/social.
 */
const DISCIPLINE_ORDER = [
  "basic_science",
  "clinical_science",
  "behavioral_social",
];

/**
 * TopicPicker — displays all study topics grouped by discipline category.
 *
 * Fetches topics from the backend API and renders them in a three-section layout:
 * 1. Basic Sciences (Anatomy, Physiology, etc.)
 * 2. Clinical Sciences (Internal Medicine, Surgery, etc.)
 * 3. Behavioral & Social Sciences (Ethics, Biostatistics, etc.)
 *
 * Each topic is shown as a clickable card that navigates to the quiz page.
 */
export default function TopicPicker() {
  /** Router instance for programmatic navigation to quiz pages */
  const router = useRouter();

  /** Array of all topics fetched from the API */
  const [topics, setTopics] = useState<Topic[]>([]);

  /** Loading state while topics are being fetched */
  const [isLoading, setIsLoading] = useState(true);

  /** Error message if topic fetch fails */
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch topics from the backend on component mount.
   * Updates loading/error state accordingly.
   */
  useEffect(() => {
    async function loadTopics() {
      try {
        const data = await fetchTopics();
        setTopics(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load topics"
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadTopics();
  }, []);

  /**
   * Group topics by their discipline field.
   * Returns a record mapping discipline keys to arrays of topics.
   */
  const groupedTopics = topics.reduce<Record<string, Topic[]>>(
    (groups, topic) => {
      const key = topic.discipline;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(topic);
      return groups;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Navy Header Bar ===== */}
      {/* Same dark navy header as Dashboard for visual consistency */}
      <header className="bg-[hsl(217,71%,20%)] text-white py-6 px-8 shadow-md">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">usmleAI</h1>
          <p className="text-sm text-blue-200">
            AI-powered USMLE preparation
          </p>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Page title and back navigation */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground -ml-2"
          >
            &larr; Back to Dashboard
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight">
            Choose a Topic
          </h2>
          <p className="text-muted-foreground">
            Select a discipline to start practicing USMLE-style questions.
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <p className="text-muted-foreground">Loading topics...</p>
        )}

        {/* Error state */}
        {error && <p className="text-red-600">{error}</p>}

        {/* Topic groups organized by discipline */}
        {!isLoading &&
          !error &&
          DISCIPLINE_ORDER.map((discipline) => {
            const disciplineTopics = groupedTopics[discipline];
            // Skip disciplines with no topics
            if (!disciplineTopics || disciplineTopics.length === 0) {
              return null;
            }

            return (
              <section key={discipline} className="space-y-4">
                {/* Discipline group heading */}
                <h3 className="text-xl font-semibold">
                  {DISCIPLINE_LABELS[discipline] || discipline}
                </h3>

                {/* Grid of topic cards: 1 column on mobile, 3 on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {disciplineTopics.map((topic) => (
                    <Card
                      key={topic.id}
                      className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/quiz/${topic.id}`)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {topic.name}
                        </CardTitle>
                      </CardHeader>
                      {topic.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {topic.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}

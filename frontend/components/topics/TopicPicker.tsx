"use client";

/**
 * TopicPicker — Displays all available study topics grouped by discipline.
 *
 * Fetches topics from the backend API and organizes them into three categories:
 * - Basic Sciences (anatomy, physiology, pathology, etc.)
 * - Clinical Sciences (internal medicine, surgery, pediatrics, etc.)
 * - Behavioral & Social Sciences (biostatistics, ethics, etc.)
 *
 * Each topic renders as a clickable card that navigates to the quiz page
 * for that topic at /quiz/[topicId].
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTopics } from "@/lib/api";
import type { Topic } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Discipline group configuration — maps backend discipline values
 * to human-readable labels for section headings.
 */
const DISCIPLINE_GROUPS = [
  { key: "basic_science", label: "Basic Sciences" },
  { key: "clinical_science", label: "Clinical Sciences" },
  { key: "behavioral_social", label: "Behavioral & Social Sciences" },
] as const;

export default function TopicPicker() {
  /** Router for navigating to quiz pages when a topic is selected */
  const router = useRouter();

  /** All topics fetched from the API */
  const [topics, setTopics] = useState<Topic[]>([]);
  /** Whether topics are currently being loaded */
  const [isLoading, setIsLoading] = useState(true);
  /** Error message if topic fetch fails */
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all topics on component mount.
   * Sets loading/error states appropriately.
   */
  useEffect(() => {
    async function loadTopics() {
      try {
        setIsLoading(true);
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
   * Returns only topics matching the given discipline key.
   */
  function getTopicsByDiscipline(disciplineKey: string): Topic[] {
    return topics.filter((t) => t.discipline === disciplineKey);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Navy Header Bar ===== */}
      {/* Matches the Dashboard header for visual consistency */}
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Choose a Topic</h2>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Dashboard
          </Button>
        </div>

        {/* Loading state — shown while topics are being fetched */}
        {isLoading && (
          <p className="text-muted-foreground">Loading topics...</p>
        )}

        {/* Error state — shown if the API call fails */}
        {error && (
          <p className="text-red-600">Error: {error}</p>
        )}

        {/* Topic cards grouped by discipline */}
        {!isLoading && !error && (
          <>
            {DISCIPLINE_GROUPS.map((group) => {
              const groupTopics = getTopicsByDiscipline(group.key);
              // Skip empty groups (no topics in this discipline)
              if (groupTopics.length === 0) return null;

              return (
                <section key={group.key} className="space-y-4">
                  {/* Discipline group heading */}
                  <h3 className="text-xl font-semibold">{group.label}</h3>

                  {/* Responsive grid: 1 column on mobile, 3 on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {groupTopics.map((topic) => (
                      <Card key={topic.id} className="shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {topic.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {/* Show description if available, otherwise a fallback */}
                          <p className="text-sm text-muted-foreground">
                            {topic.description || "Practice questions in this topic"}
                          </p>
                        </CardContent>
                        <CardFooter>
                          {/* Navigate to the quiz page for this topic */}
                          <Button
                            className="w-full"
                            onClick={() => router.push(`/quiz/${topic.id}`)}
                          >
                            Start Quiz
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

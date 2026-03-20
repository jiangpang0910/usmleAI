/**
 * API client module for communicating with the FastAPI backend.
 * All frontend-to-backend requests go through this module to ensure
 * consistent headers, error handling, and base URL configuration.
 */

import type {
  Topic,
  Question,
  AnswerSubmitRequest,
  AnswerSubmitResponse,
  ExplanationRequest,
  ExplanationResponse,
} from "./types";

// Base URL for the FastAPI backend server.
// Uses the NEXT_PUBLIC_API_URL environment variable if set,
// otherwise defaults to localhost:8000 for local development.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper that handles JSON responses and errors.
 * Automatically sets Content-Type to JSON and throws on non-OK responses.
 *
 * @template T - The expected response type
 * @param endpoint - The API path (e.g., "/api/questions")
 * @param options - Optional fetch configuration (method, body, headers, etc.)
 * @returns Parsed JSON response of type T
 * @throws Error if the response status is not OK (2xx)
 */
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  // Throw a descriptive error for non-2xx responses
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if the backend API is healthy and responding.
 * Calls the root endpoint which returns app status info.
 *
 * @returns Object with status and app name from the backend
 */
export async function checkHealth(): Promise<{
  status: string;
  app: string;
}> {
  return apiFetch("/");
}

/**
 * Fetch all topics from the knowledge bank.
 * Returns an array of topics with their discipline categories.
 *
 * @returns Array of Topic objects from GET /api/topics/
 */
export async function fetchTopics(): Promise<Topic[]> {
  return apiFetch<Topic[]>("/api/topics/");
}

/**
 * Fetch questions for a specific topic.
 * Returns USMLE-style questions with answer options for quiz display.
 *
 * @param topicId - UUID of the topic to fetch questions for
 * @param limit - Maximum number of questions to return (default 20)
 * @returns Array of Question objects from GET /api/questions/
 */
export async function fetchQuestionsByTopic(
  topicId: string,
  limit: number = 20
): Promise<Question[]> {
  return apiFetch<Question[]>(
    `/api/questions/?topic_id=${topicId}&limit=${limit}`
  );
}

/**
 * Submit an answer for a question and receive correctness feedback.
 * Returns per-option feedback including which answer was correct.
 *
 * @param data - The question ID and selected option label
 * @returns AnswerSubmitResponse with correctness and per-option feedback
 */
export async function submitAnswer(
  data: AnswerSubmitRequest
): Promise<AnswerSubmitResponse> {
  return apiFetch<AnswerSubmitResponse>("/api/answers/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Request a Claude-generated explanation or Socratic teaching response.
 * Supports multi-turn conversation history for Socratic mode.
 *
 * @param data - Question ID, teaching mode, and optional conversation history
 * @returns ExplanationResponse with generated teaching content
 */
export async function requestExplanation(
  data: ExplanationRequest
): Promise<ExplanationResponse> {
  return apiFetch<ExplanationResponse>("/api/claude/explain", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

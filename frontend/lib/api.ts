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
  FreeResponseSubmitRequest,
  FreeResponseEvaluation,
  RecordAnswerRequest,
  RecordAnswerResponse,
  AdaptiveSessionRequest,
  AdaptiveSessionResponse,
  PerformanceSummaryResponse,
  ExamSessionRequest,
  ExamSessionResponse,
  ExamBlockResult,
  SubmitExamBlockRequest,
} from "./types";

// Base URL for the FastAPI backend server.
// Uses the NEXT_PUBLIC_API_URL environment variable if set,
// otherwise defaults to localhost:8000 for local development.
// Exported so auth.ts can build the OAuth login redirect URL.
export const API_BASE_URL =
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
  // Build headers with JSON content type as default
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };

  // Attach JWT auth token from localStorage if available (browser-only)
  // This makes authentication automatic on all API calls without
  // changing any existing call sites
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("usmleai_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
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

/**
 * Submit a free-response answer for AI evaluation.
 * Sends the student's written clinical reasoning to Claude for scoring
 * and constructive feedback with a 0-10 score.
 *
 * @param data - The question ID and the student's written response
 * @returns FreeResponseEvaluation with score, feedback, and model answer
 */
export async function submitFreeResponse(
  data: FreeResponseSubmitRequest
): Promise<FreeResponseEvaluation> {
  return apiFetch<FreeResponseEvaluation>("/api/answers/submit-free-response", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ===== Session & Adaptive API Functions =====

/**
 * Record an answer to the persistent history database.
 * Called after submitAnswer() so both validation and history tracking occur.
 *
 * @param data - The answer details including question_id, correctness, and topic
 * @returns RecordAnswerResponse with the new record's UUID and timestamp
 */
export async function recordAnswer(
  data: RecordAnswerRequest
): Promise<RecordAnswerResponse> {
  return apiFetch<RecordAnswerResponse>("/api/sessions/record-answer", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Fetch the student's overall performance summary across all topics.
 * Returns aggregate statistics and per-topic accuracy breakdowns.
 *
 * @returns PerformanceSummaryResponse with total answers, overall accuracy, and per-topic stats
 */
export async function fetchPerformance(): Promise<PerformanceSummaryResponse> {
  return apiFetch<PerformanceSummaryResponse>("/api/sessions/performance");
}

/**
 * Start an adaptive study session that prioritizes weak topics.
 * The backend analyzes answer history and selects questions with
 * 70% from weak areas and 30% from other topics.
 *
 * @param data - Session config with question count and optional USMLE step filter
 * @returns AdaptiveSessionResponse with session ID, questions, and weak topics
 */
export async function startAdaptiveSession(
  data: AdaptiveSessionRequest
): Promise<AdaptiveSessionResponse> {
  return apiFetch<AdaptiveSessionResponse>("/api/sessions/adaptive/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ===== Exam Simulation API Functions =====

/**
 * Start an exam simulation session with timed blocks.
 * Creates a session with the specified USMLE step, block count,
 * and timing configuration. The backend will be built in Plan 03.
 *
 * @param data - Exam configuration with step, block count, questions per block, and timing
 * @returns ExamSessionResponse with session ID, question blocks, and break pool
 */
export async function startExamSession(
  data: ExamSessionRequest
): Promise<ExamSessionResponse> {
  return apiFetch<ExamSessionResponse>("/api/sessions/exam/start", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Submit a completed exam block for grading.
 * Called when the block timer expires or the student manually submits.
 * Unanswered questions should have selected_option_label set to null.
 *
 * @param data - Block answers including session_id, block_number, answers, and time spent
 * @returns ExamBlockResult with per-question correctness and aggregate scores
 */
export async function submitExamBlock(
  data: SubmitExamBlockRequest
): Promise<ExamBlockResult> {
  return apiFetch<ExamBlockResult>("/api/sessions/exam/submit-block", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

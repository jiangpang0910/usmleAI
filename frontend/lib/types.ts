/**
 * TypeScript interfaces for all API request/response types.
 * These mirror the backend Pydantic schemas and ensure type safety
 * across the frontend codebase.
 */

// ===== Topic Types =====

/** Response from GET /api/topics/ — represents a single study topic */
export interface Topic {
  /** Unique identifier for this topic */
  id: string;
  /** Human-readable topic name (e.g., "Pathology") */
  name: string;
  /** Discipline category: "basic_science" | "clinical_science" | "behavioral_social" */
  discipline: string;
  /** Optional description of what the topic covers */
  description: string | null;
}

// ===== Question Types =====

/** A single answer option within a question (A through E) */
export interface AnswerOptionData {
  /** Unique identifier for this option */
  id: string;
  /** Option label: "A", "B", "C", "D", or "E" */
  label: string;
  /** The answer text content */
  text: string;
  /** Whether this is the correct answer */
  is_correct: boolean;
  /** Optional explanation for why this option is correct/incorrect */
  explanation: string | null;
}

/** Response from GET /api/questions/ — a single USMLE-style question */
export interface Question {
  /** Unique identifier for this question */
  id: string;
  /** Clinical vignette text (the question stem) */
  stem: string;
  /** Question format: "single_best_answer", "sequential", etc. */
  question_type: string;
  /** Which USMLE step this question targets */
  usmle_step: string;
  /** Difficulty level of the question */
  difficulty: string;
  /** Content source (e.g., "curated", "ai_generated") */
  source: string;
  /** Optional overall explanation for the question */
  explanation: string | null;
  /** ID of the topic this question belongs to */
  topic_id: string;
  /** Optional subtopic ID for more granular categorization */
  subtopic_id: string | null;
  /** Array of answer options (typically A-E) */
  answer_options: AnswerOptionData[];
}

// ===== Answer Submission Types =====

/** Request body for POST /api/answers/submit */
export interface AnswerSubmitRequest {
  /** ID of the question being answered */
  question_id: string;
  /** Label of the selected option (e.g., "A", "B") */
  selected_option_label: string;
}

/** Per-option feedback returned after answer submission */
export interface OptionFeedback {
  /** Option label (e.g., "A") */
  label: string;
  /** Option text content */
  text: string;
  /** Whether this option is the correct answer */
  is_correct: boolean;
  /** Optional explanation for this option */
  explanation: string | null;
}

/** Response from POST /api/answers/submit — result after submitting an answer */
export interface AnswerSubmitResponse {
  /** ID of the question that was answered */
  question_id: string;
  /** Label the user selected */
  selected_option_label: string;
  /** Whether the user's selection was correct */
  is_correct: boolean;
  /** Label of the correct answer */
  correct_option_label: string;
  /** Text of the correct answer */
  correct_option_text: string;
  /** Optional overall explanation */
  explanation: string | null;
  /** Per-option feedback with correctness and explanations */
  options_feedback: OptionFeedback[];
}

// ===== Teaching / Explanation Types =====

/** Request body for POST /api/claude/explain — request AI teaching feedback */
export interface ExplanationRequest {
  /** ID of the question to explain */
  question_id: string;
  /** Teaching approach: "explanation" for detailed breakdown, "socratic" for guided questioning */
  teaching_mode: "explanation" | "socratic";
  /** Optional label of user's answer for context */
  user_answer_label?: string;
  /** Optional conversation history for multi-turn Socratic dialogue */
  conversation_history?: Array<{ role: "user" | "assistant"; content: string }>;
}

/** Response from POST /api/claude/explain — AI-generated teaching content */
export interface ExplanationResponse {
  /** ID of the question being explained */
  question_id: string;
  /** Teaching mode that was used */
  teaching_mode: string;
  /** The generated explanation or Socratic response text */
  content: string;
  /** The AI model that generated the response */
  model: string;
}

// ===== Quiz Session State Types =====

/** Status of a question in the quiz session -- used by QuestionGrid and QuestionView */
export type QuestionStatus = "unanswered" | "answered" | "flagged";

/** Per-question state tracked during a quiz session */
export interface QuestionState {
  /** Current status for grid display */
  status: QuestionStatus;
  /** Whether user bookmarked this question for review */
  isFlagged: boolean;
  /** Submission result, null if not yet answered */
  submitResult: AnswerSubmitResponse | null;
}

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

// ===== Free-Response Types =====

/** Request body for POST /api/answers/submit-free-response */
export interface FreeResponseSubmitRequest {
  /** ID of the free-response question being answered */
  question_id: string;
  /** The student's written clinical reasoning response */
  user_response: string;
}

/** AI evaluation result for a free-response answer */
export interface FreeResponseEvaluation {
  /** ID of the question that was evaluated */
  question_id: string;
  /** 0-10 score from Claude evaluation (10 = perfect response) */
  score: number;
  /** Claude's evaluation with key points, missed items, and suggestions */
  feedback: string;
  /** The stored explanation as reference (model answer) */
  model_answer: string;
  /** The AI model that generated the evaluation */
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

// ===== Session & Adaptive Types =====

/** Request body for POST /api/sessions/record-answer -- persist answer to history */
export interface RecordAnswerRequest {
  /** UUID of the question that was answered */
  question_id: string;
  /** Label the student selected, e.g., "A", "B" */
  selected_option_label: string;
  /** Whether the student's answer was correct */
  is_correct: boolean;
  /** UUID of the topic this question belongs to (denormalized for aggregation) */
  topic_id: string;
  /** Difficulty level of the question at answer time */
  difficulty: string;
  /** Seconds spent on this question, or null if not tracked */
  time_spent_seconds: number | null;
}

/** Response from POST /api/sessions/record-answer -- confirmation of recorded answer */
export interface RecordAnswerResponse {
  /** UUID of the newly created answer history record */
  id: string;
  /** Whether the recorded answer was correct */
  is_correct: boolean;
  /** ISO timestamp when the answer was recorded */
  created_at: string;
}

/** Per-topic performance metrics used in performance summaries and adaptive selection */
export interface TopicPerformance {
  /** UUID of the topic */
  topic_id: string;
  /** Human-readable topic name (e.g., "Cardiology") */
  topic_name: string;
  /** Total number of questions answered in this topic */
  total_answered: number;
  /** Number of correctly answered questions */
  correct_count: number;
  /** Accuracy ratio: correct_count / total_answered (0.0 to 1.0) */
  accuracy: number;
}

/** Request body for POST /api/sessions/adaptive/start -- start adaptive session */
export interface AdaptiveSessionRequest {
  /** Number of questions for this session (default 20, range 5-40) */
  question_count?: number;
  /** Optional USMLE step filter ("step1", "step2ck", "step3") */
  usmle_step?: string;
}

/** Response from POST /api/sessions/adaptive/start -- adaptive session with questions */
export interface AdaptiveSessionResponse {
  /** UUID of the newly created adaptive session */
  session_id: string;
  /** Selected questions prioritizing weak areas */
  questions: Question[];
  /** Topics where student accuracy is below 60% threshold */
  weak_topics: TopicPerformance[];
}

/** Response from GET /api/sessions/performance -- overall performance summary */
export interface PerformanceSummaryResponse {
  /** Total number of questions answered across all topics */
  total_answered: number;
  /** Overall accuracy ratio across all topics (0.0 to 1.0) */
  overall_accuracy: number;
  /** Per-topic performance breakdown sorted by accuracy ascending */
  topics: TopicPerformance[];
}

// ===== Exam Simulation Types =====

/** Configuration for an exam simulation session */
export interface ExamConfig {
  /** Which USMLE step to simulate ("step1", "step2ck", "step3") */
  usmle_step: string;
  /** Number of question blocks in the exam */
  block_count: number;
  /** Number of questions per block */
  questions_per_block: number;
  /** Minutes allowed per block */
  minutes_per_block: number;
}

/** Request body for POST /api/sessions/exam/start -- start exam simulation */
export interface ExamSessionRequest {
  /** Exam configuration specifying step, blocks, and timing */
  config: ExamConfig;
}

/** A single exam block containing questions and a time limit */
export interface ExamBlock {
  /** Block number within the exam (1-indexed) */
  block_number: number;
  /** Questions assigned to this block */
  questions: Question[];
  /** Time limit for this block in seconds */
  time_limit_seconds: number;
}

/** Response from POST /api/sessions/exam/start -- exam session with blocks */
export interface ExamSessionResponse {
  /** UUID of the newly created exam session */
  session_id: string;
  /** Array of exam blocks, each with questions and time limits */
  blocks: ExamBlock[];
  /** Total break time pool in seconds (student can allocate between blocks) */
  break_pool_seconds: number;
}

/** Result summary for a submitted exam block */
export interface ExamBlockResult {
  /** Block number that was submitted */
  block_number: number;
  /** Total number of questions in this block */
  total: number;
  /** Number of correctly answered questions */
  correct: number;
  /** Per-question results with selected answers and correctness */
  questions: Array<{
    /** UUID of the question */
    question_id: string;
    /** Label the student selected, or null if unanswered */
    selected_label: string | null;
    /** Whether the answer was correct */
    is_correct: boolean;
  }>;
}

/** Request body for POST /api/sessions/exam/submit-block -- submit a completed exam block */
export interface SubmitExamBlockRequest {
  /** UUID of the exam session this block belongs to */
  session_id: string;
  /** Block number being submitted */
  block_number: number;
  /** Array of answers for each question in the block */
  answers: Array<{
    /** UUID of the question */
    question_id: string;
    /** Label selected by student, or null if unanswered (time expired) */
    selected_option_label: string | null;
    /** UUID of the question's topic (denormalized) */
    topic_id: string;
    /** Difficulty level of the question */
    difficulty: string;
  }>;
  /** Total seconds spent on this block */
  time_spent_seconds: number;
}

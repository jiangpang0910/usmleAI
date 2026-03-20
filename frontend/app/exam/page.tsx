/**
 * Exam simulation page route -- renders the ExamSetup component at /exam.
 * Server component that delegates all interactive behavior to the
 * client-side ExamSetup component. Follows the same layout pattern
 * as the adaptive page (navy header, max-w-5xl container).
 */

import { Metadata } from "next";
import ExamSetup from "@/components/exam/ExamSetup";

/** Page metadata for the exam simulation route */
export const metadata: Metadata = {
  title: "Exam Simulation | usmleAI",
};

/**
 * ExamPage -- Next.js route handler for /exam.
 * Renders the ExamSetup client component which manages
 * the full exam simulation flow (setup -> blocks -> break -> review).
 */
export default function ExamPage() {
  return <ExamSetup />;
}

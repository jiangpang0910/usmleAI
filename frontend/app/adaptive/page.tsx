/**
 * Adaptive session page route — renders the AdaptiveSetup component at /adaptive.
 * Server component that delegates all interactive behavior to the
 * client-side AdaptiveSetup component. Follows the same layout pattern
 * as other pages (navy header, max-w-5xl container).
 */

import { Metadata } from "next";
import AdaptiveSetup from "@/components/adaptive/AdaptiveSetup";

/** Page metadata for the adaptive session route */
export const metadata: Metadata = {
  title: "Adaptive Session | usmleAI",
};

export default function AdaptivePage() {
  return <AdaptiveSetup />;
}

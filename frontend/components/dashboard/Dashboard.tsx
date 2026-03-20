"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Data structure for each quick-start action card.
 * Defines the icon, title, description, and button label for each study mode.
 */
interface QuickStartAction {
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
}

/**
 * Data structure for each USMLE step info card.
 * Represents a USMLE exam step with its disciplines and accent color.
 */
interface USMLEStep {
  step: string;
  title: string;
  description: string;
  accentColor: string;
}

/**
 * Quick-start action cards data.
 * Three study modes available from the dashboard:
 * - Topic quiz: pick a subject and practice targeted questions
 * - Adaptive session: AI selects questions based on weak areas
 * - Exam simulation: timed blocks mimicking real USMLE format
 */
const quickStartActions: QuickStartAction[] = [
  {
    icon: "📖",
    title: "Pick a Topic",
    description: "Choose a subject and practice targeted questions",
    buttonLabel: "Start Topic Quiz",
  },
  {
    icon: "🧠",
    title: "Adaptive Session",
    description: "AI selects questions based on your weak areas",
    buttonLabel: "Start Adaptive",
  },
  {
    icon: "⏱️",
    title: "Exam Simulation",
    description: "Timed blocks mimicking the real USMLE format",
    buttonLabel: "Start Exam",
  },
];

/**
 * USMLE step coverage data.
 * Each step maps to a set of medical disciplines and gets a unique accent color
 * for visual differentiation in the Knowledge Bank section.
 */
const usmleSteps: USMLEStep[] = [
  {
    step: "Step 1",
    title: "Basic Science Foundations",
    description:
      "Anatomy, Physiology, Biochemistry, Pathology, Pharmacology, Microbiology",
    accentColor: "border-l-blue-800", // Dark navy for basic sciences
  },
  {
    step: "Step 2 CK",
    title: "Clinical Knowledge",
    description:
      "Internal Medicine, Surgery, Pediatrics, OB/GYN, Psychiatry, Emergency Medicine",
    accentColor: "border-l-blue-600", // Medium navy for clinical sciences
  },
  {
    step: "Step 3",
    title: "Practice of Medicine",
    description: "Biostatistics, Epidemiology, Ethics, Patient Safety",
    accentColor: "border-l-blue-400", // Light navy for practice/behavioral
  },
];

/**
 * Dashboard component — the main landing page of the usmleAI application.
 *
 * Layout (top to bottom):
 * 1. Header with app title and subtitle
 * 2. Quick-start action cards (3-column responsive grid)
 * 3. Knowledge Bank section with USMLE step coverage cards
 * 4. Footer with attribution
 *
 * Design follows a Linear/Notion-inspired aesthetic:
 * - Max-width container with generous padding
 * - Minimal chrome, subtle shadows, whitespace-focused
 * - Clear text hierarchy (title > section headers > body)
 */
export default function Dashboard() {
  /** Router instance for navigating to topic picker when user clicks "Pick a Topic" */
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* ===== Navy Header Bar ===== */}
      {/* Dark navy header strip with white text — medical school aesthetic */}
      <header className="bg-[hsl(217,71%,20%)] text-white py-6 px-8 shadow-md">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">usmleAI</h1>
          <p className="text-sm text-blue-200">
            AI-powered USMLE preparation
          </p>
        </div>
      </header>

      {/* Centered container with max width and generous padding */}
      <div className="max-w-5xl mx-auto p-8 space-y-8">

        {/* ===== Quick-Start Action Cards ===== */}
        {/* Three study modes in a responsive grid: stacked on mobile, 3-column on desktop */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickStartActions.map((action) => (
              <Card key={action.title} className="shadow-sm">
                <CardHeader>
                  {/* Icon placeholder — emoji for now, can be replaced with Lucide icons */}
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  {/* Route to the appropriate study mode page based on card title */}
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (action.title === "Pick a Topic") {
                        router.push("/topics");
                      } else if (action.title === "Adaptive Session") {
                        router.push("/adaptive");
                      } else {
                        alert(`${action.title} — coming soon!`);
                      }
                    }}
                  >
                    {action.buttonLabel}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* ===== Knowledge Bank Section ===== */}
        {/* Shows USMLE step coverage — each step card has a colored left border accent */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Knowledge Bank</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {usmleSteps.map((step) => (
              <Card
                key={step.step}
                className={`shadow-sm border-l-4 ${step.accentColor}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{step.step}</CardTitle>
                  <CardDescription className="font-medium text-foreground/80">
                    {step.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* List of disciplines covered by this USMLE step */}
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

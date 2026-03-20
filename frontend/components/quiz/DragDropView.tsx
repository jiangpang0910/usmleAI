"use client";

/**
 * DragDropView -- Renders drag-and-drop style USMLE questions.
 *
 * Displays draggable item cards on the left and drop target zones on the right.
 * Students drag items to their correct target zones to demonstrate knowledge
 * of associations (e.g., drug -> mechanism, nerve -> function).
 *
 * Uses HTML5 Drag and Drop API for desktop and falls back to dropdown
 * selects on mobile devices for accessibility.
 *
 * After submission, zones are highlighted green (correct) or red (incorrect),
 * and the TeachingPanel appears for AI-powered feedback.
 */

import { useState, useCallback } from "react";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TeachingPanel from "./TeachingPanel";
import { cn } from "@/lib/utils";

/**
 * Props for the DragDropView component.
 */
interface DragDropViewProps {
  /** The drag-and-drop question to render */
  question: Question;
  /** Callback invoked when the student completes this question and moves on */
  onComplete: () => void;
}

/**
 * Represents a single draggable item parsed from the answer options.
 * Each item has a display name and a correct target zone it should be placed in.
 */
interface DragItem {
  /** The text to display on the draggable card (e.g., "Metoprolol") */
  itemName: string;
  /** The target zone this item should be dragged to (e.g., "Beta-1 selective antagonist") */
  correctZone: string;
  /** The original answer option label (A, B, C, D) */
  label: string;
  /** Per-option explanation shown after submission */
  explanation: string | null;
}

/**
 * Parse the question stem to extract target zone names.
 * Looks for a "**Target Zones:**" section followed by a bulleted list.
 *
 * @param stem - The question stem text containing target zone definitions
 * @returns Array of target zone name strings
 */
function parseTargetZones(stem: string): string[] {
  // Find the target zones section in the stem
  const zonesMatch = stem.match(/\*\*Target Zones:\*\*\s*\n([\s\S]*?)$/);
  if (!zonesMatch) return [];

  // Extract each bulleted item (lines starting with "- ")
  const lines = zonesMatch[1].split("\n");
  return lines
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Parse the question's answer options into draggable items.
 * Each option text has the format "ItemName -> TargetZone".
 *
 * @param question - The question containing answer options to parse
 * @returns Array of DragItem objects with item names and correct zones
 */
function parseDragItems(question: Question): DragItem[] {
  return question.answer_options.map((opt) => {
    // Split on " -> " to separate the draggable item from its correct target
    const parts = opt.text.split(" -> ");
    return {
      itemName: parts[0]?.trim() || opt.text,
      correctZone: parts[1]?.trim() || "",
      label: opt.label,
      explanation: opt.explanation,
    };
  });
}

/**
 * Extract the instruction text from the stem (everything before the target zones list).
 *
 * @param stem - The full question stem
 * @returns The instruction portion of the stem without the target zones
 */
function getInstructionText(stem: string): string {
  const idx = stem.indexOf("**Target Zones:**");
  if (idx === -1) return stem;
  return stem.slice(0, idx).trim();
}

export default function DragDropView({ question, onComplete }: DragDropViewProps) {
  /** Map of item names to the zone they've been placed in */
  const [placements, setPlacements] = useState<Map<string, string>>(new Map());
  /** Whether the answer has been submitted */
  const [isSubmitted, setIsSubmitted] = useState(false);
  /** Map of zone names to correctness status (true = correct placement) */
  const [zoneResults, setZoneResults] = useState<Map<string, boolean>>(new Map());
  /** The item currently being dragged (for visual feedback) */
  const [draggingItem, setDraggingItem] = useState<string | null>(null);

  // Parse the question data into usable structures
  const targetZones = parseTargetZones(question.stem);
  const dragItems = parseDragItems(question);
  const instructionText = getInstructionText(question.stem);

  // Items that haven't been placed in a zone yet
  const unplacedItems = dragItems.filter(
    (item) => !placements.has(item.itemName)
  );

  // Check if all items have been placed (enables submit button)
  const allPlaced = placements.size === dragItems.length;

  /**
   * Handle the start of a drag operation.
   * Stores the item name in the dataTransfer for the drop handler.
   *
   * @param e - The drag event
   * @param itemName - Name of the item being dragged
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent, itemName: string) => {
      e.dataTransfer.setData("text/plain", itemName);
      setDraggingItem(itemName);
    },
    []
  );

  /**
   * Handle the end of a drag operation (cleanup).
   */
  const handleDragEnd = useCallback(() => {
    setDraggingItem(null);
  }, []);

  /**
   * Allow a drop target to receive dragged items.
   * Required to make the element a valid drop target.
   *
   * @param e - The drag event to prevent default behavior
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  /**
   * Handle dropping an item onto a target zone.
   * Updates the placements map with the new item-to-zone mapping.
   * If the zone already has an item, returns that item to the unplaced pool.
   *
   * @param e - The drop event containing the dragged item data
   * @param zoneName - The name of the target zone receiving the drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent, zoneName: string) => {
      e.preventDefault();
      const itemName = e.dataTransfer.getData("text/plain");
      if (!itemName) return;

      setPlacements((prev) => {
        const next = new Map(prev);

        // Remove this item from any previous zone placement
        for (const [key, value] of Array.from(next.entries())) {
          if (value === zoneName && key !== itemName) {
            // Return the previously placed item to unplaced pool
            next.delete(key);
          }
        }

        // Place the dragged item in the target zone
        next.set(itemName, zoneName);
        return next;
      });
      setDraggingItem(null);
    },
    []
  );

  /**
   * Remove an item from its current zone placement, returning it to the unplaced pool.
   *
   * @param itemName - Name of the item to remove from its zone
   */
  function handleRemoveFromZone(itemName: string) {
    if (isSubmitted) return;
    setPlacements((prev) => {
      const next = new Map(prev);
      next.delete(itemName);
      return next;
    });
  }

  /**
   * Handle mobile dropdown selection for a zone.
   * Used as fallback when drag-and-drop isn't available.
   *
   * @param zoneName - The target zone being assigned
   * @param itemName - The selected item name from the dropdown
   */
  function handleMobileSelect(zoneName: string, itemName: string) {
    if (!itemName) return;
    setPlacements((prev) => {
      const next = new Map(prev);
      // Remove item from any previous zone
      for (const [key, value] of Array.from(next.entries())) {
        if (key === itemName) next.delete(key);
      }
      // Remove any previous item from this zone
      for (const [key, value] of Array.from(next.entries())) {
        if (value === zoneName) next.delete(key);
      }
      next.set(itemName, zoneName);
      return next;
    });
  }

  /**
   * Submit the current placements and check correctness.
   * Compares each item's placed zone against its correct zone.
   */
  function handleSubmit() {
    if (!allPlaced || isSubmitted) return;

    // Check each placement against the correct zone
    const results = new Map<string, boolean>();
    for (const item of dragItems) {
      const placedZone = placements.get(item.itemName);
      results.set(item.itemName, placedZone === item.correctZone);
    }
    setZoneResults(results);
    setIsSubmitted(true);
  }

  /**
   * Get the item currently placed in a specific zone, if any.
   *
   * @param zoneName - The zone to check for a placed item
   * @returns The DragItem placed in this zone, or undefined
   */
  function getItemInZone(zoneName: string): DragItem | undefined {
    for (const [itemName, zone] of Array.from(placements.entries())) {
      if (zone === zoneName) {
        return dragItems.find((d) => d.itemName === itemName);
      }
    }
    return undefined;
  }

  // Calculate overall correctness for display
  const totalCorrect = Array.from(zoneResults.values()).filter(Boolean).length;
  const isAllCorrect = totalCorrect === dragItems.length;

  return (
    <div className="space-y-6">
      {/* ===== Instruction Text ===== */}
      {/* Display the question instructions above the drag area */}
      <div className="prose prose-lg max-w-none">
        <p className="whitespace-pre-wrap">{instructionText}</p>
      </div>

      {/* ===== Desktop Drag-and-Drop Interface ===== */}
      {/* Hidden on mobile, shown on md+ screens */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {/* Left column: Draggable Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Items to Place
          </h3>
          {unplacedItems.map((item) => (
            <div
              key={item.itemName}
              draggable={!isSubmitted}
              onDragStart={(e) => handleDragStart(e, item.itemName)}
              onDragEnd={handleDragEnd}
              className={cn(
                "p-3 rounded-lg border-2 text-sm font-medium transition-all",
                isSubmitted
                  ? "border-gray-200 opacity-50 cursor-default"
                  : "border-blue-300 bg-blue-50 cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-md",
                draggingItem === item.itemName && "opacity-50"
              )}
            >
              {item.itemName}
            </div>
          ))}
          {/* Show message when all items are placed */}
          {unplacedItems.length === 0 && !isSubmitted && (
            <p className="text-sm text-muted-foreground italic">
              All items placed. Click Submit to check your answers.
            </p>
          )}
        </div>

        {/* Right column: Drop Target Zones */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Target Zones
          </h3>
          {targetZones.map((zone) => {
            const itemInZone = getItemInZone(zone);
            // Determine correctness state for this zone after submission
            const zoneCorrect = itemInZone
              ? zoneResults.get(itemInZone.itemName)
              : undefined;

            return (
              <div
                key={zone}
                onDragOver={!isSubmitted ? handleDragOver : undefined}
                onDrop={!isSubmitted ? (e) => handleDrop(e, zone) : undefined}
                className={cn(
                  "p-4 rounded-lg border-2 border-dashed min-h-[60px] transition-colors",
                  isSubmitted && zoneCorrect === true && "border-green-500 bg-green-50",
                  isSubmitted && zoneCorrect === false && "border-red-500 bg-red-50",
                  !isSubmitted && "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                )}
              >
                {/* Zone label */}
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {zone}
                </p>
                {/* Placed item pill inside the zone */}
                {itemInZone && (
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-block px-3 py-1 rounded-full text-sm font-medium",
                        isSubmitted && zoneCorrect
                          ? "bg-green-200 text-green-800"
                          : isSubmitted && !zoneCorrect
                            ? "bg-red-200 text-red-800"
                            : "bg-blue-200 text-blue-800"
                      )}
                    >
                      {itemInZone.itemName}
                    </span>
                    {/* Remove button (only before submission) */}
                    {!isSubmitted && (
                      <button
                        onClick={() => handleRemoveFromZone(itemInZone.itemName)}
                        className="text-xs text-gray-400 hover:text-red-500"
                        type="button"
                        aria-label={`Remove ${itemInZone.itemName} from zone`}
                      >
                        x
                      </button>
                    )}
                  </div>
                )}
                {/* Empty zone placeholder */}
                {!itemInZone && !isSubmitted && (
                  <p className="text-xs text-gray-400 italic">
                    Drop an item here
                  </p>
                )}
                {/* Show explanation after submission */}
                {isSubmitted && itemInZone?.explanation && (
                  <p className="mt-2 text-xs text-gray-500 italic">
                    {itemInZone.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Mobile Dropdown Fallback ===== */}
      {/* Shown on small screens, hidden on md+ */}
      <div className="md:hidden space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Match Each Zone
        </h3>
        {targetZones.map((zone) => {
          const itemInZone = getItemInZone(zone);
          const zoneCorrect = itemInZone
            ? zoneResults.get(itemInZone.itemName)
            : undefined;

          return (
            <div
              key={zone}
              className={cn(
                "p-3 rounded-lg border",
                isSubmitted && zoneCorrect === true && "border-green-500 bg-green-50",
                isSubmitted && zoneCorrect === false && "border-red-500 bg-red-50",
                !isSubmitted && "border-gray-200"
              )}
            >
              {/* Zone label */}
              <p className="text-sm font-medium mb-2">{zone}</p>
              {/* Dropdown select for mobile */}
              <select
                value={itemInZone?.itemName || ""}
                onChange={(e) => handleMobileSelect(zone, e.target.value)}
                disabled={isSubmitted}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select an item...</option>
                {dragItems.map((item) => {
                  // Only show items that are unplaced or placed in this zone
                  const isPlacedElsewhere =
                    placements.has(item.itemName) &&
                    placements.get(item.itemName) !== zone;
                  if (isPlacedElsewhere) return null;
                  return (
                    <option key={item.itemName} value={item.itemName}>
                      {item.itemName}
                    </option>
                  );
                })}
              </select>
              {/* Show explanation after submission */}
              {isSubmitted && itemInZone?.explanation && (
                <p className="mt-2 text-xs text-gray-500 italic">
                  {itemInZone.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Results Summary (after submission) ===== */}
      {isSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isAllCorrect ? (
                <span className="text-green-700">All Correct!</span>
              ) : (
                <span className="text-amber-700">
                  {totalCorrect} of {dragItems.length} Correct
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {question.explanation}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ===== Action Buttons ===== */}
      <div className="flex items-center justify-end gap-2">
        {!isSubmitted && (
          <Button onClick={handleSubmit} disabled={!allPlaced}>
            Submit
          </Button>
        )}
        {isSubmitted && (
          <Button onClick={onComplete}>Next Question</Button>
        )}
      </div>

      {/* ===== Teaching Panel ===== */}
      {/* AI-powered explanation shown after submission */}
      <TeachingPanel
        questionId={question.id}
        userAnswerLabel=""
        isVisible={isSubmitted}
      />
    </div>
  );
}

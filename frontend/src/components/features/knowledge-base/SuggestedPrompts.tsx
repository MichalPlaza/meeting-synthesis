/**
 * SuggestedPrompts - Contextual prompt suggestions for Knowledge Base
 */

import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

interface SuggestedPromptsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  title?: string;
  className?: string;
}

export function SuggestedPrompts({
  suggestions,
  onSelect,
  title = "Suggested prompts",
  className,
}: SuggestedPromptsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onSelect(suggestion)}
            className="text-sm h-auto py-2 px-3 hover:bg-accent hover:text-accent-foreground"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Get contextual suggestions based on conversation state
 */
export function getContextualSuggestions(params: {
  hasMessages: boolean;
  lastMessage?: string;
  filters?: {
    project_ids?: string[];
    tags?: string[];
    start_date?: string;
    end_date?: string;
  };
}): string[] {
  const { hasMessages, lastMessage, filters } = params;

  // Empty conversation suggestions
  if (!hasMessages) {
    const baseSuggestions = [
      "What were the main decisions from recent meetings?",
      "Show me all action items",
      "Summarize this week's meetings",
      "What topics have we discussed about the API?",
    ];

    // Add filter-specific suggestions
    if (filters?.project_ids && filters.project_ids.length > 0) {
      return [
        "What are the key decisions for this project?",
        "Show action items for this project",
        "Summarize recent progress",
        ...baseSuggestions.slice(0, 2),
      ];
    }

    if (filters?.start_date || filters?.end_date) {
      return [
        "What were the main topics in this time period?",
        "Show all decisions made",
        "List action items from these meetings",
        ...baseSuggestions.slice(0, 2),
      ];
    }

    return baseSuggestions;
  }

  // Follow-up suggestions based on last message
  if (lastMessage) {
    const lowerMessage = lastMessage.toLowerCase();

    if (lowerMessage.includes("decision")) {
      return [
        "Who made these decisions?",
        "When were these decisions made?",
        "What was the reasoning behind them?",
      ];
    }

    if (lowerMessage.includes("action item") || lowerMessage.includes("task")) {
      return [
        "Who is assigned to these tasks?",
        "What are the deadlines?",
        "Show the status of these action items",
      ];
    }

    if (lowerMessage.includes("meeting")) {
      return [
        "What were the key takeaways?",
        "Who attended this meeting?",
        "Were there any action items?",
      ];
    }

    if (lowerMessage.includes("topic") || lowerMessage.includes("discuss")) {
      return [
        "What decisions were made about this?",
        "Show related meetings",
        "What was the outcome?",
      ];
    }
  }

  // Default follow-up suggestions
  return [
    "Tell me more about that",
    "Can you provide more details?",
    "Show related information",
  ];
}

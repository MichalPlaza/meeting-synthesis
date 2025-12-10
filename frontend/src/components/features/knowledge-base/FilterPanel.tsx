/**
 * FilterPanel - UI for filtering Knowledge Base search
 */

import { useState } from "react";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { FilterContext } from "@/types/knowledge-base";

interface FilterPanelProps {
  filters: FilterContext;
  onFiltersChange: (filters: FilterContext) => void;
  availableProjects?: Array<{ id: string; name: string }>;
  availableTags?: string[];
}

export function FilterPanel({
  filters,
  onFiltersChange,
  availableProjects = [],
  availableTags = [],
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount =
    (filters.project_ids?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.start_date ? 1 : 0) +
    (filters.end_date ? 1 : 0);

  const toggleProject = (projectId: string) => {
    const current = filters.project_ids || [];
    const updated = current.includes(projectId)
      ? current.filter((id) => id !== projectId)
      : [...current, projectId];
    onFiltersChange({ ...filters, project_ids: updated });
  };

  const toggleTag = (tag: string) => {
    const current = filters.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onFiltersChange({ ...filters, tags: updated });
  };

  const clearFilters = () => {
    onFiltersChange({
      project_ids: [],
      tags: [],
      start_date: undefined,
      end_date: undefined,
    });
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-1 -right-1"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filter Search</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto p-1 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Projects */}
          {availableProjects.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Projects</label>
              <div className="flex flex-wrap gap-2">
                {availableProjects.map((project) => (
                  <Badge
                    key={project.id}
                    variant={
                      filters.project_ids?.includes(project.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => toggleProject(project.id)}
                  >
                    {project.name}
                    {filters.project_ids?.includes(project.id) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={
                      filters.tags?.includes(tag) ? "default" : "outline"
                    }
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {filters.tags?.includes(tag) && (
                      <X className="ml-1 h-3 w-3" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Range
            </label>
            <div className="grid gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  From
                </label>
                <Input
                  type="date"
                  value={
                    filters.start_date ? filters.start_date.split("T")[0] : ""
                  }
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      start_date: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  To
                </label>
                <Input
                  type="date"
                  value={filters.end_date ? filters.end_date.split("T")[0] : ""}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      end_date: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}{" "}
                active
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

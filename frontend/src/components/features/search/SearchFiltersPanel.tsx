import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar, X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import type { FacetItem } from "@/services/search";
import type { Project } from "@/types/project";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SearchFiltersPanelProps {
  projects: Project[];
  facets: {
    projects: FacetItem[];
    tags: FacetItem[];
  };
  selectedProjectIds: string[];
  selectedTags: string[];
  dateFrom: string;
  dateTo: string;
  onProjectChange: (projectIds: string[]) => void;
  onTagChange: (tags: string[]) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClearFilters: () => void;
}

export function SearchFiltersPanel({
  projects,
  facets,
  selectedProjectIds,
  selectedTags,
  dateFrom,
  dateTo,
  onProjectChange,
  onTagChange,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
}: SearchFiltersPanelProps) {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [datesOpen, setDatesOpen] = useState(true);

  const hasActiveFilters =
    selectedProjectIds.length > 0 ||
    selectedTags.length > 0 ||
    dateFrom ||
    dateTo;

  const handleProjectToggle = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onProjectChange(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      onProjectChange([...selectedProjectIds, projectId]);
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagChange([...selectedTags, tag]);
    }
  };

  // Get count for a project from facets
  const getProjectCount = (projectId: string): number => {
    const facet = facets.projects.find((f) => f.id === projectId);
    return facet?.count ?? 0;
  };

  // Get count for a tag from facets
  const getTagCount = (tagName: string): number => {
    const facet = facets.tags.find((f) => f.name === tagName);
    return facet?.count ?? 0;
  };

  return (
    <div className="w-64 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Date Range */}
      <Collapsible open={datesOpen} onOpenChange={setDatesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </span>
          {datesOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Projects */}
      <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
          <span>Projects</span>
          {projectsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2 max-h-48 overflow-y-auto">
          {projects.map((project) => {
            const count = getProjectCount(project._id);
            return (
              <div
                key={project._id}
                className="flex items-center space-x-2 text-sm"
              >
                <Checkbox
                  id={`project-${project._id}`}
                  checked={selectedProjectIds.includes(project._id)}
                  onCheckedChange={() => handleProjectToggle(project._id)}
                />
                <Label
                  htmlFor={`project-${project._id}`}
                  className="flex-grow cursor-pointer text-sm"
                >
                  {project.name}
                </Label>
                <span className="text-xs text-muted-foreground">{count}</span>
              </div>
            );
          })}
          {projects.length === 0 && (
            <p className="text-xs text-muted-foreground">No projects available</p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Tags */}
      <Collapsible open={tagsOpen} onOpenChange={setTagsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t pt-4">
          <span>Tags</span>
          {tagsOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2 max-h-48 overflow-y-auto">
          {facets.tags.map((tagFacet) => (
            <div
              key={tagFacet.name}
              className="flex items-center space-x-2 text-sm"
            >
              <Checkbox
                id={`tag-${tagFacet.name}`}
                checked={selectedTags.includes(tagFacet.name || "")}
                onCheckedChange={() => handleTagToggle(tagFacet.name || "")}
              />
              <Label
                htmlFor={`tag-${tagFacet.name}`}
                className="flex-grow cursor-pointer text-sm"
              >
                {tagFacet.name}
              </Label>
              <span className="text-xs text-muted-foreground">
                {tagFacet.count}
              </span>
            </div>
          ))}
          {facets.tags.length === 0 && (
            <p className="text-xs text-muted-foreground">No tags available</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

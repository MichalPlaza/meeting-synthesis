import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, ChevronDown } from "lucide-react";
import log from "../services/logging";

// Definicje typów dla opcji filtrów
type FilterOption = {
  value: string;
  label: string;
};

interface MeetingsToolbarProps {
  // Wyszukiwanie
  searchTerm: string;
  onSearchChange: (value: string) => void;

  // Filtrowanie po projektach
  availableProjects: FilterOption[];
  selectedProjects: string[];
  onSelectedProjectsChange: (selected: string[]) => void;

  // Filtrowanie po tagach
  availableTags: FilterOption[];
  selectedTags: string[];
  onSelectedTagsChange: (selected: string[]) => void;

  // Sortowanie
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export function MeetingsToolbar({
  searchTerm,
  onSearchChange,
  availableProjects,
  selectedProjects,
  onSelectedProjectsChange,
  availableTags,
  selectedTags,
  onSelectedTagsChange,
  sortBy,
  onSortByChange,
}: MeetingsToolbarProps) {
  log.debug("MeetingsToolbar rendered.");
  const handleCheckboxChange = (
    currentSelection: string[],
    itemValue: string,
    checked: boolean,
    setter: (newSelection: string[]) => void
  ) => {
    const newSelection = checked
      ? [...currentSelection, itemValue]
      : currentSelection.filter((val) => val !== itemValue);
    setter(newSelection);
    log.debug(`Filter changed: ${itemValue} ${checked ? "added" : "removed"}. New selection:`, newSelection);
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-4">
      <div className="relative w-full flex-grow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search meetings..."
          value={searchTerm}
          onChange={(e) => {
            onSearchChange(e.target.value);
            log.debug("Search term changed to:", e.target.value);
          }}
          className="pl-10"
        />
      </div>
      <div className="flex items-center gap-2">
        {/* Filtr Projektów */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <span>Projects</span>
              {selectedProjects.length > 0 && (
                <span className="bg-secondary text-secondary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {selectedProjects.length}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableProjects.map((project) => (
              <DropdownMenuCheckboxItem
                key={project.value}
                checked={selectedProjects.includes(project.value)}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(
                    selectedProjects,
                    project.value,
                    !!checked,
                    onSelectedProjectsChange
                  )
                }
              >
                {project.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filtr Tagów */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <span>Tags</span>
              {selectedTags.length > 0 && (
                <span className="bg-secondary text-secondary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {selectedTags.length}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableTags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.value}
                checked={selectedTags.includes(tag.value)}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(
                    selectedTags,
                    tag.value,
                    !!checked,
                    onSelectedTagsChange
                  )
                }
              >
                {tag.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sortowanie */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <span>Sort</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) => {
                onSortByChange(value);
                log.debug("Sort by changed to:", value);
              }}
            >
              <DropdownMenuRadioItem value="newest">
                Newest
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="oldest">
                Oldest
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="duration-desc">
                Duration (Longest)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="duration-asc">
                Duration (Shortest)
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

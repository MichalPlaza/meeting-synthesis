import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { getTagColor } from "@/lib/utils";
import { Folder, FileText } from "lucide-react";
import type { GroupedSearchResult } from "@/services/search";
import type { Project } from "@/types/project";

interface SearchResultCardProps {
  result: GroupedSearchResult;
  project?: Project;
}

export function SearchResultCard({ result, project }: SearchResultCardProps) {
  const formattedDate = result.meeting_datetime
    ? format(new Date(result.meeting_datetime), "dd-MM-yyyy")
    : "";
  const timeAgo = result.meeting_datetime
    ? formatDistanceToNow(new Date(result.meeting_datetime), { addSuffix: true })
    : "";

  return (
    <div className="p-4 bg-card rounded-[var(--radius-container)] [box-shadow:var(--shadow-sm)] transition-all hover:[box-shadow:var(--shadow-md)] hover:bg-muted/50">
      <div className="space-y-3">
        {/* Title and Tags */}
        <div className="flex flex-wrap items-start gap-2">
          <Link to={`/meetings/${result.meeting_id}`} className="group flex-grow">
            <h3 className="font-semibold text-base group-hover:underline">
              {result.meeting_title}
            </h3>
          </Link>
          {result.tags && result.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {result.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant={getTagColor(tag)} className="text-xs">
                  {tag}
                </Badge>
              ))}
              {result.tags.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{result.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Highlighted Snippets */}
        {result.highlights && result.highlights.length > 0 && (
          <div className="space-y-1.5">
            {result.highlights.slice(0, 3).map((snippet, idx) => (
              <p
                key={idx}
                className="text-sm text-muted-foreground line-clamp-2"
                dangerouslySetInnerHTML={{ __html: snippet }}
              />
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {formattedDate && (
            <span>
              {formattedDate} ({timeAgo})
            </span>
          )}
          {project && (
            <div className="flex items-center gap-1.5">
              <Folder className="h-3 w-3" />
              <Link
                to={`/projects/${project._id}`}
                className="hover:underline"
              >
                {project.name}
              </Link>
            </div>
          )}
          {result.content_types && result.content_types.length > 0 && (
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <span className="capitalize">
                {result.content_types.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

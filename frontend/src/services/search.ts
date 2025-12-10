/**
 * Search dashboard service for advanced meeting search.
 */

import { api } from "@/lib/api/client";

export interface SearchResultItem {
  meeting_id: string;
  meeting_title: string;
  project_id: string;
  tags: string[];
  meeting_datetime: string;
  content_type: string;
  score: number;
  highlights: string[];
}

/** Grouped result combining all content types for a single meeting */
export interface GroupedSearchResult {
  meeting_id: string;
  meeting_title: string;
  project_id: string;
  tags: string[];
  meeting_datetime: string;
  content_types: string[];
  best_score: number;
  highlights: string[];
}

/**
 * Group search results by meeting_id, combining highlights from all content types.
 */
export function groupResultsByMeeting(
  results: SearchResultItem[]
): GroupedSearchResult[] {
  const groupMap = new Map<string, GroupedSearchResult>();

  for (const result of results) {
    const existing = groupMap.get(result.meeting_id);

    if (existing) {
      // Add content type if not already present
      if (!existing.content_types.includes(result.content_type)) {
        existing.content_types.push(result.content_type);
      }
      // Add new highlights (limit to avoid too many)
      const newHighlights = result.highlights.filter(
        (h) => !existing.highlights.includes(h)
      );
      existing.highlights.push(...newHighlights.slice(0, 2));
      // Update best score
      if (result.score > existing.best_score) {
        existing.best_score = result.score;
      }
    } else {
      groupMap.set(result.meeting_id, {
        meeting_id: result.meeting_id,
        meeting_title: result.meeting_title,
        project_id: result.project_id,
        tags: result.tags,
        meeting_datetime: result.meeting_datetime,
        content_types: [result.content_type],
        best_score: result.score,
        highlights: result.highlights.slice(0, 3),
      });
    }
  }

  // Sort by best score descending
  return Array.from(groupMap.values()).sort(
    (a, b) => b.best_score - a.best_score
  );
}

export interface FacetItem {
  id?: string;
  name?: string;
  count: number;
}

export interface SearchFacets {
  projects: FacetItem[];
  tags: FacetItem[];
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  facets: SearchFacets;
}

export interface SearchFilters {
  q?: string;
  project_ids?: string[];
  tags?: string[];
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

/**
 * Build query string from search filters.
 */
function buildSearchQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();

  if (filters.q) {
    params.append("q", filters.q);
  }

  if (filters.project_ids && filters.project_ids.length > 0) {
    filters.project_ids.forEach((id) => params.append("project_ids", id));
  }

  if (filters.tags && filters.tags.length > 0) {
    filters.tags.forEach((tag) => params.append("tags", tag));
  }

  if (filters.date_from) {
    params.append("date_from", filters.date_from);
  }

  if (filters.date_to) {
    params.append("date_to", filters.date_to);
  }

  if (filters.page) {
    params.append("page", filters.page.toString());
  }

  if (filters.page_size) {
    params.append("page_size", filters.page_size.toString());
  }

  return params.toString();
}

/**
 * Search meetings with hybrid search and faceted filtering.
 */
export async function searchMeetings(
  token: string | null,
  filters: SearchFilters = {}
): Promise<SearchResponse> {
  const queryString = buildSearchQuery(filters);
  const url = `/search/${queryString ? `?${queryString}` : ""}`;
  return api.get<SearchResponse>(url, token);
}

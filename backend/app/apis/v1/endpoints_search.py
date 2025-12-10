"""Search dashboard API endpoints."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from ...auth_dependencies import get_current_user
from ...core.permissions import require_approval
from ...db.mongodb_utils import get_database
from ...models.user import User
from ...crud import crud_projects
from ...services.elasticsearch_search_service import dashboard_search

router = APIRouter(
    prefix="/search",
    tags=["search"],
    dependencies=[Depends(require_approval)]
)
logger = logging.getLogger(__name__)


class SearchResultItem(BaseModel):
    """Individual search result."""
    meeting_id: str
    meeting_title: str
    project_id: str
    tags: List[str]
    meeting_datetime: str
    content_type: str
    score: float
    highlights: List[str]


class FacetItem(BaseModel):
    """Facet item with count."""
    id: Optional[str] = None
    name: Optional[str] = None
    count: int


class SearchFacetsResponse(BaseModel):
    """Facets for filtering."""
    projects: List[FacetItem]
    tags: List[FacetItem]


class SearchResponse(BaseModel):
    """Search response with results, pagination, and facets."""
    results: List[SearchResultItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    facets: SearchFacetsResponse


@router.get("/", response_model=SearchResponse)
async def search_meetings(
    q: str = Query("", description="Search query (can be empty for browse mode)"),
    project_ids: Optional[List[str]] = Query(None, description="Filter by project IDs"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    date_from: Optional[str] = Query(None, description="Filter by start date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter by end date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """
    Search meetings with hybrid search (semantic + keyword) and faceted filtering.

    Features:
    - Hybrid search combining BM25 and semantic similarity
    - Highlighted search snippets
    - Faceted filtering by project and tags
    - Date range filtering
    - Pagination

    Returns results with relevance scores and highlighted text matches.
    """
    logger.info(
        f"User {current_user.username} searching: q='{q}', "
        f"project_ids={project_ids}, tags={tags}, page={page}"
    )

    # Get user's accessible project IDs if not filtered
    user_project_ids = project_ids
    if not user_project_ids:
        if current_user.role == "admin":
            # Admins can see all projects
            all_projects = await crud_projects.get_projects_filtered(database)
            user_project_ids = [str(p.id) for p in all_projects]
        else:
            # Regular users see only their projects
            user_projects = await crud_projects.get_projects_by_member(database, str(current_user.id))
            user_project_ids = [str(p.id) for p in user_projects]

    if not user_project_ids:
        # User has no projects
        return SearchResponse(
            results=[],
            total=0,
            page=page,
            page_size=page_size,
            total_pages=0,
            facets=SearchFacetsResponse(projects=[], tags=[]),
        )

    # Perform search
    results, total, facets = await dashboard_search(
        query=q,
        user_id=str(current_user.id),
        project_ids=user_project_ids,
        tags=tags,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    # Convert results to response model
    result_items = [
        SearchResultItem(
            meeting_id=r.meeting_id,
            meeting_title=r.meeting_title,
            project_id=r.project_id,
            tags=r.tags,
            meeting_datetime=r.meeting_datetime,
            content_type=r.content_type,
            score=r.score,
            highlights=r.highlights,
        )
        for r in results
    ]

    # Convert facets to response model
    facets_dict = facets.to_dict()
    facets_response = SearchFacetsResponse(
        projects=[FacetItem(id=p["id"], count=p["count"]) for p in facets_dict["projects"]],
        tags=[FacetItem(name=t["name"], count=t["count"]) for t in facets_dict["tags"]],
    )

    return SearchResponse(
        results=result_items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        facets=facets_response,
    )

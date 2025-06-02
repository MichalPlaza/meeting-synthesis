from typing import Optional, List

from pydantic import BaseModel

from .action_items import ActionItem
from .decision_made import DecisionMade
from .key_topic import KeyTopic
from .mentioned_date import MentionedDate


class AIAnalysis(BaseModel):
    summary: Optional[str] = None
    key_topics: Optional[List[KeyTopic]] = []
    action_items: Optional[List[ActionItem]] = []
    decisions_made: Optional[List[DecisionMade]] = []
    mentioned_dates: Optional[List[MentionedDate]] = []
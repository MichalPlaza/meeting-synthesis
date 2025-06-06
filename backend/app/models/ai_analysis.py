from pydantic import BaseModel

from .action_items import ActionItem
from .decision_made import DecisionMade
from .key_topic import KeyTopic
from .mentioned_date import MentionedDate


class AIAnalysis(BaseModel):
    summary: str | None = None
    key_topics: list[KeyTopic] | None = []
    action_items: list[ActionItem] | None = []
    decisions_made: list[DecisionMade] | None = []
    mentioned_dates: list[MentionedDate] | None = []

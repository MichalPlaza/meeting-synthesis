from pydantic import BaseModel


class DecisionMade(BaseModel):
    description: str

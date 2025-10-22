from abc import ABC, abstractmethod
from app.models.ai_analysis import AIAnalysis


class BaseAIAnalysisStrategy(ABC):
    @abstractmethod
    async def analyze(self, prompt: str) -> AIAnalysis:
        """
        Analyze transcription text and return an AIAnalysis domain model.
        """
        raise NotImplementedError

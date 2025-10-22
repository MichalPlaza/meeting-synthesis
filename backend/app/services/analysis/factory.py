from typing import Literal

from .strategies.base import BaseAIAnalysisStrategy
from .strategies.local_llm import LocalLLMStrategy
from .strategies.openai_llm import OpenAIStrategy

ProcessingMode = Literal["local", "remote"]


class AIAnalysisFactory:
    @staticmethod
    def get_strategy(processing_mode: str | ProcessingMode) -> BaseAIAnalysisStrategy:
        value = processing_mode.value if hasattr(processing_mode, "value") else processing_mode
        if value == "local":
            return LocalLLMStrategy()
        if value == "remote":
            return OpenAIStrategy()
        raise ValueError(f"Unknown processing mode: {processing_mode}")


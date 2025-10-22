import logging
from typing import Optional

from .prompt_template import PROMPT_TEMPLATE
from ..models.ai_analysis import AIAnalysis
from ..crud import crud_meetings
from ..schemas.meeting_schema import MeetingUpdate
from ..models.processing_status import ProcessingStatus
from ..models.enums.processing_stage import ProcessingStage
from .analysis.factory import AIAnalysisFactory

LOGGER = logging.getLogger(__name__)


class AIAnalysisService:
    _instance: Optional["AIAnalysisService"] = None

    def __init__(self):
        pass

    @classmethod
    def get_instance(cls) -> "AIAnalysisService":
        if cls._instance is None:
            cls._instance = AIAnalysisService()
        return cls._instance

    @classmethod
    async def run_ai_analysis(cls, database, meeting_id: str, transcription_text: str) -> AIAnalysis:
        if not transcription_text or not transcription_text.strip():
            raise ValueError("Empty transcription_text supplied to AIAnalysisService")

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            raise ValueError(f"Meeting not found for id: {meeting_id}")

        mode = getattr(meeting.processing_config, "processing_mode_selected", "local")
        language = getattr(meeting.processing_config, "language", "pl")
        LOGGER.info("AIAnalysisService: mode=%s, language=%s for meeting=%s", mode, language, meeting_id)

        prompt_text = PROMPT_TEMPLATE.format(language=language, transcription_text=transcription_text)

        strategy = AIAnalysisFactory.get_strategy(mode)

        try:
            ai_analysis_obj: AIAnalysis = await strategy.analyze(prompt_text)
        except Exception as e:
            LOGGER.exception("AI analysis failed for meeting %s: %s", meeting_id, e)
            try:
                await crud_meetings.update_meeting(
                    database,
                    meeting_id,
                    MeetingUpdate(
                        processing_status=ProcessingStatus(
                            current_stage=ProcessingStage.FAILED,
                            error_message=str(e)
                        )
                    )
                )
            except Exception:
                LOGGER.exception("Failed to set FAILED status after analysis error")
            raise

        ai_analysis_payload = ai_analysis_obj.dict() if hasattr(ai_analysis_obj, "dict") else ai_analysis_obj

        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(ai_analysis=ai_analysis_payload)
        )

        return ai_analysis_obj
